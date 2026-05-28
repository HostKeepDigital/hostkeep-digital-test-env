import { callFn } from "./testHelpers";

const DAY = 86400000;
const dateOnly = (ms) => new Date(ms).toISOString().split("T")[0];

const seedBooking = async (overrides) => {
  const { data } = await callFn("seedTestBooking", {
    action: "create",
    booking: {
      host_id: "regression-test",
      guest_id: "regression-test",
      guest_name: "AutoCheckIn Test",
      guest_email: "regression@hostkeepdigital-test.invalid",
      property_id: "regression-test-property-id",
      subtotal: 500, cleaning_fee: 50, total_amount: 550,
      rental_frozen: false,
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

// False-positive guard: prove the function actually ran with a valid shape
// BEFORE asserting a booking was left unchanged.
const assertRanOk = (status, data) => {
  if (status !== 200) throw new Error(`Function did not run — expected 200, got ${status}`);
  if (typeof data.processed !== "number") throw new Error("Ran but 'processed' missing — invalid shape");
  if (!Array.isArray(data.results)) throw new Error("Ran but 'results' array missing — invalid shape");
};

export const autoCheckInTests = [
  // ── SMOKE ──────────────────────────────────────────────
  {
    id: "aci_executes",
    group: "autoCheckIn",
    label: "Smoke — executes and returns { processed, results, ran_at }",
    claudeHint: "base44/functions/autoCheckIn/entry.ts must return 200 with { processed, results, ran_at }.",
    run: async () => {
      const { status, data } = await callFn("autoCheckIn");
      if (status !== 200) throw new Error(`Expected 200, got ${status}: ${data?.error}`);
      if (typeof data.processed !== "number") throw new Error("Missing 'processed' field");
      if (!Array.isArray(data.results)) throw new Error("Missing 'results' array");
      if (!data.ran_at) throw new Error("Missing 'ran_at' timestamp");
      return `Passed — processed: ${data.processed}`;
    },
  },

  // ── FUNCTIONAL ─────────────────────────────────────────
  {
    id: "aci_advances_overdue",
    group: "autoCheckIn",
    label: "Functional — confirmed booking >24h past check-in is advanced to checked_in",
    claudeHint: "autoCheckIn must advance confirmed bookings where (check-in 14:00 + 24h) <= now.",
    run: async () => {
      let id;
      try {
        id = await seedBooking({
          guest_name: "ACI Overdue",
          check_in: dateOnly(Date.now() - DAY * 2),
          check_out: dateOnly(Date.now() - DAY),
          booking_status: "confirmed",
          rental_payment_status: "held",
        });
        if (!id) throw new Error("seedTestBooking failed");
        const { status, data } = await callFn("autoCheckIn");
        assertRanOk(status, data);
        await new Promise(r => setTimeout(r, 1000));
        const b = await readBooking(id);
        if (b?.booking_status !== "checked_in")
          throw new Error(`Expected 'checked_in', got '${b?.booking_status}'`);
        return "Passed — overdue confirmed booking advanced to checked_in";
      } finally { await cleanup(id); }
    },
  },
  {
    id: "aci_release_clock_immediate",
    group: "autoCheckIn",
    label: "Functional — auto check-in sets rental_release_due_at to ~now (immediate release)",
    claudeHint: "When AUTO check-in fires the 24h has already elapsed, so rental_release_due_at must be ~now (NOT now+24h). Far-future seed value must be reset.",
    run: async () => {
      let id;
      try {
        id = await seedBooking({
          guest_name: "ACI Immediate Release",
          check_in: dateOnly(Date.now() - DAY * 2),
          check_out: dateOnly(Date.now() - DAY),
          booking_status: "confirmed",
          rental_payment_status: "held",
          rental_release_due_at: new Date(Date.now() + DAY * 30).toISOString(),
        });
        if (!id) throw new Error("seedTestBooking failed");
        const { status, data } = await callFn("autoCheckIn");
        assertRanOk(status, data);
        await new Promise(r => setTimeout(r, 1000));
        const b = await readBooking(id);
        if (b?.booking_status !== "checked_in")
          throw new Error(`Expected 'checked_in', got '${b?.booking_status}'`);
        const due = b?.rental_release_due_at ? new Date(b.rental_release_due_at).getTime() : null;
        if (due === null) throw new Error("rental_release_due_at not set");
        if (due > Date.now() + 120000)
          throw new Error(`rental_release_due_at is in the future (${b.rental_release_due_at}) — should be ~now`);
        return "Passed — release clock set to now for immediate payout";
      } finally { await cleanup(id); }
    },
  },
  {
    id: "aci_skips_within_grace",
    group: "autoCheckIn",
    label: "Functional — confirmed booking still within 24h grace is NOT advanced",
    claudeHint: "If (check-in 14:00 + 24h) is still in the future, the booking must stay 'confirmed' so the guest can self-check-in.",
    run: async () => {
      let id;
      try {
        id = await seedBooking({
          guest_name: "ACI Within Grace",
          check_in: dateOnly(Date.now()),
          check_out: dateOnly(Date.now() + DAY),
          booking_status: "confirmed",
          rental_payment_status: "held",
        });
        if (!id) throw new Error("seedTestBooking failed");
        const { status, data } = await callFn("autoCheckIn");
        assertRanOk(status, data);
        await new Promise(r => setTimeout(r, 1000));
        const b = await readBooking(id);
        if (b?.booking_status !== "confirmed")
          throw new Error(`Expected 'confirmed' (within grace), got '${b?.booking_status}'`);
        return "Passed — booking within 24h grace left as confirmed";
      } finally { await cleanup(id); }
    },
  },
  {
    id: "aci_skips_future_checkin",
    group: "autoCheckIn",
    label: "Functional — confirmed booking with future check-in is NOT advanced",
    claudeHint: "Future check-in dates must never be auto-checked-in.",
    run: async () => {
      let id;
      try {
        id = await seedBooking({
          guest_name: "ACI Future",
          check_in: dateOnly(Date.now() + DAY * 3),
          check_out: dateOnly(Date.now() + DAY * 4),
          booking_status: "confirmed",
          rental_payment_status: "held",
        });
        if (!id) throw new Error("seedTestBooking failed");
        const { status, data } = await callFn("autoCheckIn");
        assertRanOk(status, data);
        await new Promise(r => setTimeout(r, 1000));
        const b = await readBooking(id);
        if (b?.booking_status !== "confirmed")
          throw new Error(`Expected 'confirmed' (future check-in), got '${b?.booking_status}'`);
        return "Passed — future check-in left as confirmed";
      } finally { await cleanup(id); }
    },
  },
  {
    id: "aci_skips_non_confirmed",
    group: "autoCheckIn",
    label: "Functional — non-confirmed (awaiting_payment) booking is NOT advanced",
    claudeHint: "Only booking_status 'confirmed' is eligible; awaiting_payment must be ignored.",
    run: async () => {
      let id;
      try {
        id = await seedBooking({
          guest_name: "ACI Awaiting Payment",
          check_in: dateOnly(Date.now() - DAY * 2),
          check_out: dateOnly(Date.now() - DAY),
          booking_status: "awaiting_payment",
          rental_payment_status: "unpaid",
        });
        if (!id) throw new Error("seedTestBooking failed");
        const { status, data } = await callFn("autoCheckIn");
        assertRanOk(status, data);
        await new Promise(r => setTimeout(r, 1000));
        const b = await readBooking(id);
        if (b?.booking_status !== "awaiting_payment")
          throw new Error(`Expected 'awaiting_payment', got '${b?.booking_status}'`);
        return "Passed — awaiting_payment booking ignored";
      } finally { await cleanup(id); }
    },
  },

  // ── BUSINESS (behaviour defined by Tyler) ──────────────
  {
    id: "aci_business_guest_no_show",
    group: "autoCheckIn",
    label: "Business — guest never self-checks-in; 24h later the fallback advances + makes payout due",
    claudeHint: "Business rule: if the guest hasn't checked in by 24h after scheduled check-in, autoCheckIn does it and the payout becomes immediately due.",
    run: async () => {
      let id;
      try {
        id = await seedBooking({
          guest_name: "ACI Guest No-Show",
          check_in: dateOnly(Date.now() - DAY * 2),
          check_out: dateOnly(Date.now() - DAY),
          booking_status: "confirmed",
          rental_payment_status: "held",
        });
        if (!id) throw new Error("seedTestBooking failed");
        const { status, data } = await callFn("autoCheckIn");
        assertRanOk(status, data);
        await new Promise(r => setTimeout(r, 1000));
        const b = await readBooking(id);
        if (b?.booking_status !== "checked_in")
          throw new Error(`Expected 'checked_in', got '${b?.booking_status}'`);
        const due = b?.rental_release_due_at ? new Date(b.rental_release_due_at).getTime() : null;
        if (due === null || due > Date.now() + 120000)
          throw new Error("Payout not made immediately due after fallback check-in");
        if (!b?.checked_in_at) throw new Error("checked_in_at not recorded");
        return "Passed — fallback check-in advanced booking and made payout immediately due";
      } finally { await cleanup(id); }
    },
  },
  {
    id: "aci_business_manual_early_untouched",
    group: "autoCheckIn",
    label: "Business — a guest who checked in early (manual) is never overridden by auto check-in",
    claudeHint: "If a booking is already 'checked_in', autoCheckIn must not touch its status or reset rental_release_due_at.",
    run: async () => {
      let id;
      const manualDue = new Date(Date.now() + DAY).toISOString();
      try {
        id = await seedBooking({
          guest_name: "ACI Manual Early",
          check_in: dateOnly(Date.now() + DAY),
          check_out: dateOnly(Date.now() + DAY * 3),
          booking_status: "checked_in",
          checked_in_at: new Date().toISOString(),
          rental_payment_status: "held",
          rental_release_due_at: manualDue,
        });
        if (!id) throw new Error("seedTestBooking failed");
        const { status, data } = await callFn("autoCheckIn");
        assertRanOk(status, data);
        await new Promise(r => setTimeout(r, 1000));
        const b = await readBooking(id);
        if (b?.booking_status !== "checked_in")
          throw new Error(`Expected status untouched 'checked_in', got '${b?.booking_status}'`);
        if (b?.rental_release_due_at !== manualDue)
          throw new Error("rental_release_due_at was overwritten — manual early check-in must be preserved");
        return "Passed — manual early check-in preserved";
      } finally { await cleanup(id); }
    },
  },
];