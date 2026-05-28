const callFn = async (name, body = {}, retries = 3) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(`/functions/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429 && attempt < retries - 1) {
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    const data = await res.json();
    return { status: res.status, data };
  }
};

const checkInBookingTests = [
  {
    id: "cib_smoke_shape",
    group: "checkInBooking",
    label: "Smoke: Function executes and returns correct shape",
    claudeHint: "Check base44/functions/checkInBooking/entry.ts — must return { success, booking_status } or { success: false, error }.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("checkInBooking", { session_token: sessionToken, booking_id: "000000000000000000000000" });
      if (status === 500) throw new Error(`Function crashed: ${data.error}`);
      if (typeof data.success === "undefined") throw new Error(`Missing success field: ${JSON.stringify(data)}`);
      return `Passed — function reachable, shape correct`;
    },
  },
  {
    id: "cib_func_sets_checked_in",
    group: "checkInBooking",
    label: "Functional: Logging check-in sets booking_status to checked_in",
    claudeHint: "Check base44/functions/checkInBooking/entry.ts — must update Booking.booking_status to 'checked_in'.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id, guest_id: "test_guest_cib",
          guest_name: "CheckIn Test Guest", guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_cib", booking_status: "confirmed",
          check_in: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
          nights: 5, total_amount: 500, security_deposit: 200,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error("Failed to seed test booking");
      try {
        const { status, data } = await callFn("checkInBooking", { session_token: sessionToken, booking_id: bookingId });
        if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
        if (readBack?.booking?.booking_status !== "checked_in") throw new Error(`Expected 'checked_in', got '${readBack?.booking?.booking_status}'`);
        return `Passed — booking_status correctly set to 'checked_in'`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
      }
    },
  },
  {
    id: "cib_func_sets_rental_release_due_at",
    group: "checkInBooking",
    label: "Functional: Logging check-in sets rental_release_due_at to 24h from check-in time",
    claudeHint: "Check base44/functions/checkInBooking/entry.ts — must set rental_release_due_at to approximately 24h from now.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id, guest_id: "test_guest_cib",
          guest_name: "CheckIn Test Guest", guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_cib", booking_status: "confirmed",
          check_in: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
          nights: 5, total_amount: 500, security_deposit: 200,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error("Failed to seed test booking");
      try {
        const before = Date.now();
        const { status, data } = await callFn("checkInBooking", { session_token: sessionToken, booking_id: bookingId });
        if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
        const releaseAt = new Date(readBack?.booking?.rental_release_due_at).getTime();
        const expectedRelease = before + 24 * 60 * 60 * 1000;
        const diff = Math.abs(releaseAt - expectedRelease);
        if (diff > 60000) throw new Error(`rental_release_due_at is ${diff}ms off from expected 24h window`);
        return `Passed — rental_release_due_at set to ${readBack?.booking?.rental_release_due_at} (~24h from check-in)`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
      }
    },
  },
  {
    id: "cib_smoke_missing_booking_id",
    group: "checkInBooking",
    label: "Smoke: Missing booking_id returns error",
    claudeHint: "Check base44/functions/checkInBooking/entry.ts — missing booking_id must return an error response, not crash.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("checkInBooking", { session_token: sessionToken });
      if (status === 500) throw new Error(`Function crashed on missing booking_id: ${data.error}`);
      if (data.success === true) throw new Error("Expected failure but got success: true with no booking_id");
      return `Passed — missing booking_id correctly rejected`;
    },
  },
];

const autoCheckInTests = [
  {
    id: "aci_smoke_shape",
    group: "autoCheckIn",
    label: "Smoke: Function executes and returns correct shape",
    claudeHint: "Check base44/functions/autoCheckIn/entry.ts — must return { processed } or similar shape without crashing.",
    run: async () => {
      const { status, data } = await callFn("autoCheckIn");
      if (status !== 200) throw new Error(`Expected 200, got ${status}: ${data.error}`);
      if (typeof data.processed === "undefined") throw new Error(`Missing 'processed' field: ${JSON.stringify(data)}`);
      return `Passed — processed: ${data.processed}`;
    },
  },
  {
    id: "aci_func_advances_overdue",
    group: "autoCheckIn",
    label: "Functional: Confirmed booking past check-in date → advanced to checked_in with rental_release_due_at set",
    claudeHint: "Check base44/functions/autoCheckIn/entry.ts — a confirmed booking whose check_in date has passed must be advanced to checked_in and have rental_release_due_at set.",
    run: async () => {
      const pastDate = new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0];
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "AutoCheckIn Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: pastDate, check_out: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
          booking_status: "confirmed", nights: 7, total_amount: 700, security_deposit: 200,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      await callFn("autoCheckIn");
      await new Promise(r => setTimeout(r, 1000));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (readBack?.booking?.booking_status !== "checked_in") throw new Error(`Expected 'checked_in', got '${readBack?.booking?.booking_status}'`);
      if (!readBack?.booking?.rental_release_due_at) throw new Error("rental_release_due_at not set after auto check-in");
      return `Passed — overdue confirmed booking advanced to checked_in, rental_release_due_at set`;
    },
  },
  {
    id: "aci_func_skips_future",
    group: "autoCheckIn",
    label: "Functional: Confirmed booking with future check-in date — not advanced",
    claudeHint: "Check base44/functions/autoCheckIn/entry.ts — a booking whose check_in is in the future must not be advanced.",
    run: async () => {
      const futureDate = new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0];
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "AutoCheckIn Future Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: futureDate, check_out: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
          booking_status: "confirmed", nights: 5, total_amount: 500, security_deposit: 200,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      await callFn("autoCheckIn");
      await new Promise(r => setTimeout(r, 1000));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (readBack?.booking?.booking_status !== "confirmed") throw new Error(`Expected 'confirmed', got '${readBack?.booking?.booking_status}'`);
      return `Passed — future check-in booking left in 'confirmed'`;
    },
  },
  {
    id: "aci_func_skips_already_checked_in",
    group: "autoCheckIn",
    label: "Functional: Already checked_in booking — not touched",
    claudeHint: "Check base44/functions/autoCheckIn/entry.ts — a booking already in checked_in status must not be modified.",
    run: async () => {
      const pastDate = new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0];
      const existingRelease = new Date(Date.now() + 86400000).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "AutoCheckIn Already Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: pastDate, check_out: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
          booking_status: "checked_in", nights: 7, total_amount: 700, security_deposit: 200,
          rental_release_due_at: existingRelease,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      await callFn("autoCheckIn");
      await new Promise(r => setTimeout(r, 1000));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (readBack?.booking?.booking_status !== "checked_in") throw new Error(`Expected 'checked_in', got '${readBack?.booking?.booking_status}'`);
      const releaseAt = readBack?.booking?.rental_release_due_at;
      if (releaseAt !== existingRelease) throw new Error(`rental_release_due_at was changed — expected '${existingRelease}', got '${releaseAt}'`);
      return `Passed — already checked_in booking skipped, rental_release_due_at unchanged`;
    },
  },
];

export { checkInBookingTests, autoCheckInTests };
export default [...checkInBookingTests, ...autoCheckInTests];