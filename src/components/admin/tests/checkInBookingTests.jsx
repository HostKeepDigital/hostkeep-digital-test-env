import { callFn } from "./testHelpers";

const DAY = 86400000;
const dateOnly = (ms) => new Date(ms).toISOString().split("T")[0];

// Build a specific time today in UTC, returns ISO string.
const todayAt = (hh, mm = 0) => {
  const d = new Date();
  d.setUTCHours(hh, mm, 0, 0);
  return d.toISOString();
};

const seedBooking = async (overrides) => {
  const { data } = await callFn("seedTestBooking", {
    action: "create",
    booking: {
      host_id: "regression-test",
      guest_id: "regression-test",
      guest_name: "CheckInBooking Test",
      guest_email: "regression@hostkeepdigital-test.invalid",
      property_id: "regression-test-property-id",
      check_in: dateOnly(Date.now()),
      check_out: dateOnly(Date.now() + DAY),
      subtotal: 500, cleaning_fee: 50, total_amount: 550,
      rental_frozen: false,
      booking_status: "confirmed",
      rental_payment_status: "held",
      ...overrides,
    },
  });
  return data?.id;
};

const readBooking = async (id) => {
  const { data } = await callFn("seedTestBooking", { action: "read", id });
  return data?.booking;
};

const cleanup = async (id) => {
  if (id) await callFn("seedTestBooking", { action: "delete", id });
};

export const checkInBookingTests = [
  // ── SMOKE ──────────────────────────────────────────────
  {
    id: "cib_missing_id_returns_400",
    group: "checkInBooking",
    label: "Smoke — missing booking_id returns 400 with error",
    claudeHint: "base44/functions/checkInBooking/entry.ts must validate booking_id and return 400 if absent.",
    run: async () => {
      const { status, data } = await callFn("checkInBooking", {});
      if (status !== 400) throw new Error(`Expected 400, got ${status}`);
      if (data?.error !== "missing_booking_id")
        throw new Error(`Expected 'missing_booking_id', got '${data?.error}'`);
      return "Passed — missing booking_id correctly rejected";
    },
  },
  {
      id: "cib_unknown_id_returns_404",
      group: "checkInBooking",
      label: "Smoke — deleted (nonexistent) booking_id returns 404",
      claudeHint: "If the booking lookup returns no record, function must return 404 'booking_not_found'. Uses seed-then-delete to get a real-format Base44 ID that's guaranteed not to exist.",
      run: async () => {
        // Seed and immediately delete so we have a real Base44-generated ID that
        // no longer exists in the DB. A hard-coded string like "nonexistent" would
        // trip Base44's ID-format validation and hit the catch (500) — a different
        // failure mode than the realistic "valid ID, deleted record" case.
        const seeded = await seedBooking({ guest_name: "CIB Deleted For 404" });
        if (!seeded) throw new Error("Could not seed booking for delete test");
        await cleanup(seeded);
        const { status, data } = await callFn("checkInBooking", { booking_id: seeded });
        if (status !== 404) throw new Error(`Expected 404, got ${status}`);
        if (data?.error !== "booking_not_found")
          throw new Error(`Expected 'booking_not_found', got '${data?.error}'`);
        return "Passed — deleted booking ID correctly returns 404";
      },
    },
  // ── FUNCTIONAL ─────────────────────────────────────────
  {
    id: "cib_default_uses_now",
    group: "checkInBooking",
    label: "Functional — no check_in_time provided defaults to now; payout = checked_in_at + 24h",
    claudeHint: "If body has no check_in_time, function uses new Date().toISOString() as the anchor and rental_release_due_at must be exactly +24h.",
    run: async () => {
      let id;
      try {
        id = await seedBooking({
          guest_name: "CIB Default Now",
          check_in: dateOnly(Date.now()),
          check_out: dateOnly(Date.now() + DAY),
        });
        if (!id) throw new Error("seedTestBooking failed");
        const beforeMs = Date.now();
        const { status, data } = await callFn("checkInBooking", { booking_id: id });
        const afterMs = Date.now();
        if (status !== 200) throw new Error(`Expected 200, got ${status}`);
        if (data?.success !== true) throw new Error(`Expected success:true, got ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1000));
        const b = await readBooking(id);
        if (b?.booking_status !== "checked_in")
          throw new Error(`Expected 'checked_in', got '${b?.booking_status}'`);
        const checkedInMs = new Date(b?.checked_in_at).getTime();
        const dueMs = new Date(b?.rental_release_due_at).getTime();
        if (checkedInMs < beforeMs - 1000 || checkedInMs > afterMs + 1000)
          throw new Error(`checked_in_at out of range: ${b?.checked_in_at}`);
        if (dueMs - checkedInMs !== DAY)
          throw new Error(`Expected rental_release_due_at = checked_in_at + 24h, got gap ${dueMs - checkedInMs}ms`);
        return "Passed — default check-in stamped now and payout clock set 24h ahead";
      } finally { await cleanup(id); }
    },
  },

  // ── BUSINESS (Tyler's scenarios; background: property check-in time is 16:00) ──
  {
    id: "cib_business_scenario1_early_1300",
    group: "checkInBooking",
    label: "Business — Scenario 1: EARLY manual check-in at 13:00 (property time 16:00) → payout due 13:00 next day",
    claudeHint: "checkInBooking must anchor the 24h clock on the supplied check_in_time, not on the property's scheduled time. Early check-in moves the clock to start sooner.",
    run: async () => {
      let id;
      const checkedInIso = todayAt(13, 0);
      const expectedDueIso = new Date(new Date(checkedInIso).getTime() + DAY).toISOString();
      try {
        id = await seedBooking({
          guest_name: "CIB Scenario 1 Early 13:00",
          check_in: dateOnly(Date.now()),
          check_out: dateOnly(Date.now() + DAY * 2),
        });
        if (!id) throw new Error("seedTestBooking failed");
        const { status, data } = await callFn("checkInBooking", {
          booking_id: id, check_in_time: checkedInIso,
        });
        if (status !== 200) throw new Error(`Expected 200, got ${status}`);
        if (data?.success !== true) throw new Error(`Expected success:true`);
        await new Promise(r => setTimeout(r, 1000));
        const b = await readBooking(id);
        if (b?.booking_status !== "checked_in")
          throw new Error(`Expected 'checked_in', got '${b?.booking_status}'`);
        if (b?.checked_in_at !== checkedInIso)
          throw new Error(`checked_in_at != 13:00 anchor — got '${b?.checked_in_at}'`);
        if (b?.rental_release_due_at !== expectedDueIso)
          throw new Error(`rental_release_due_at != 13:00 + 24h — got '${b?.rental_release_due_at}', expected '${expectedDueIso}'`);
        return "Passed — early check-in (13:00) anchors payout to 13:00 next day";
      } finally { await cleanup(id); }
    },
  },
  {
    id: "cib_business_scenario2_late_1700",
    group: "checkInBooking",
    label: "Business — Scenario 2: LATE manual check-in at 17:00 (1h after property time 16:00) → payout due 17:00 next day",
    claudeHint: "Late check-in shifts the 24h clock to the actual check-in moment — the host's payout adjusts accordingly.",
    run: async () => {
      let id;
      const checkedInIso = todayAt(17, 0);
      const expectedDueIso = new Date(new Date(checkedInIso).getTime() + DAY).toISOString();
      try {
        id = await seedBooking({
          guest_name: "CIB Scenario 2 Late 17:00",
          check_in: dateOnly(Date.now()),
          check_out: dateOnly(Date.now() + DAY * 2),
        });
        if (!id) throw new Error("seedTestBooking failed");
        const { status, data } = await callFn("checkInBooking", {
          booking_id: id, check_in_time: checkedInIso,
        });
        if (status !== 200) throw new Error(`Expected 200, got ${status}`);
        if (data?.success !== true) throw new Error(`Expected success:true`);
        await new Promise(r => setTimeout(r, 1000));
        const b = await readBooking(id);
        if (b?.booking_status !== "checked_in")
          throw new Error(`Expected 'checked_in', got '${b?.booking_status}'`);
        if (b?.checked_in_at !== checkedInIso)
          throw new Error(`checked_in_at != 17:00 anchor — got '${b?.checked_in_at}'`);
        if (b?.rental_release_due_at !== expectedDueIso)
          throw new Error(`rental_release_due_at != 17:00 + 24h — got '${b?.rental_release_due_at}', expected '${expectedDueIso}'`);
        return "Passed — late check-in (17:00) anchors payout to 17:00 next day";
      } finally { await cleanup(id); }
    },
  },
];