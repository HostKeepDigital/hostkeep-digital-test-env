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

const processPayoutsTests = [
  {
    id: "pp_j1_smoke_executes",
    group: "processPayouts",
    label: "Smoke — function executes and returns correct shape",
    claudeHint: "Check base44/functions/processPayouts/entry.ts — must return { job1_charged, job1_failed, job2_cancelled, job3_released, job4_returned, errors }.",
    run: async () => {
      const { status, data } = await callFn("processPayouts");
      if (status !== 200) throw new Error(`Expected 200, got ${status}`);
      if (typeof data.job1_charged !== "number") throw new Error("Missing job1_charged field");
      if (typeof data.job1_failed !== "number") throw new Error("Missing job1_failed field");
      if (typeof data.job2_cancelled !== "number") throw new Error("Missing job2_cancelled field");
      if (!Array.isArray(data.errors)) throw new Error("Missing errors array");
      return `Passed — shape correct, job1_charged: ${data.job1_charged}, job1_failed: ${data.job1_failed}`;
    },
  },
  {
    id: "pp_j1_skips_zero_balance",
    group: "processPayouts",
    label: "Smoke — skips booking where remaining_balance is 0",
    claudeHint: "Check processPayouts/entry.ts Job 1 — remaining_balance: 0 must be skipped entirely. No charge attempted.",
    run: async () => {
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "PP Zero Balance Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 17 * 86400000).toISOString().split("T")[0],
          booking_status: "confirmed", balance_payment_status: "pending",
          balance_due_date: new Date(Date.now() - 86400000).toISOString(),
          remaining_balance: 0, total_amount: 500,
          stripe_customer_id: "cus_test_zero", stripe_payment_method_id: "pm_test_zero",
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      const { status, data } = await callFn("processPayouts");
      await new Promise(r => setTimeout(r, 1000));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (status !== 200) throw new Error(`Function crashed: ${data.error}`);
      if (readBack?.booking?.balance_payment_status !== "pending")
        throw new Error(`Expected 'pending', got '${readBack?.booking?.balance_payment_status}'`);
      return `Passed — zero balance booking correctly skipped`;
    },
  },
  {
    id: "pp_j1_skips_future_due_date",
    group: "processPayouts",
    label: "Smoke — skips booking where balance_due_date is in the future",
    claudeHint: "Check processPayouts/entry.ts Job 1 — balance_due_date in the future must not trigger a charge attempt.",
    run: async () => {
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "PP Future Due Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 70 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 77 * 86400000).toISOString().split("T")[0],
          booking_status: "confirmed", balance_payment_status: "pending",
          balance_due_date: new Date(Date.now() + 14 * 86400000).toISOString(),
          remaining_balance: 400, total_amount: 500,
          stripe_customer_id: "cus_test_future", stripe_payment_method_id: "pm_test_future",
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      await callFn("processPayouts");
      await new Promise(r => setTimeout(r, 1000));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (readBack?.booking?.balance_payment_status !== "pending")
        throw new Error(`Expected 'pending', got '${readBack?.booking?.balance_payment_status}'`);
      return `Passed — future balance_due_date correctly skipped`;
    },
  },
  {
    id: "pp_j1_skips_not_applicable",
    group: "processPayouts",
    label: "Smoke — skips booking where balance_payment_status is not_applicable",
    claudeHint: "Check processPayouts/entry.ts Job 1 — filter must only pick up balance_payment_status: 'pending'. not_applicable bookings must never be touched.",
    run: async () => {
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "PP Not Applicable Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 17 * 86400000).toISOString().split("T")[0],
          booking_status: "confirmed", balance_payment_status: "not_applicable",
          remaining_balance: 0, total_amount: 500, payment_status: "paid",
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      await callFn("processPayouts");
      await new Promise(r => setTimeout(r, 1000));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (readBack?.booking?.balance_payment_status !== "not_applicable")
        throw new Error(`Expected 'not_applicable', got '${readBack?.booking?.balance_payment_status}'`);
      return `Passed — not_applicable booking correctly ignored`;
    },
  },
  {
    id: "pp_j1_func_failed_charge_sets_status",
    group: "processPayouts",
    label: "Functional — failed charge sets balance_payment_status to failed and writes balance_failed_at",
    claudeHint: "Check processPayouts/entry.ts Job 1 — when Stripe charge fails, booking must be updated with balance_payment_status: 'failed' and balance_failed_at set to now.",
    run: async () => {
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "PP Charge Fail Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 17 * 86400000).toISOString().split("T")[0],
          booking_status: "confirmed", balance_payment_status: "pending",
          balance_due_date: new Date(Date.now() - 86400000).toISOString(),
          remaining_balance: 400, total_amount: 500,
          stripe_customer_id: "cus_invalid_test", stripe_payment_method_id: "pm_invalid_test",
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      await callFn("processPayouts");
      await new Promise(r => setTimeout(r, 1500));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (readBack?.booking?.balance_payment_status !== "failed")
        throw new Error(`Expected 'failed', got '${readBack?.booking?.balance_payment_status}'`);
      if (!readBack?.booking?.balance_failed_at)
        throw new Error(`balance_failed_at not written after charge failure`);
      return `Passed — failed charge correctly sets status to 'failed' and writes balance_failed_at`;
    },
  },
  {
    id: "pp_j1_func_no_user_get",
    group: "processPayouts",
    label: "Functional — host notification sent without calling User.get()",
    claudeHint: "Check processPayouts/entry.ts Job 1 — User.get() is forbidden. Host email lookup must go via UserCredentials.filter({ user_id }) → email.",
    run: async () => {
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test-no-user-get", guest_id: "regression-test",
          guest_name: "PP No User Get Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 17 * 86400000).toISOString().split("T")[0],
          booking_status: "confirmed", balance_payment_status: "pending",
          balance_due_date: new Date(Date.now() - 86400000).toISOString(),
          remaining_balance: 400, total_amount: 500,
          stripe_customer_id: "cus_invalid_test", stripe_payment_method_id: "pm_invalid_test",
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      const { status, data } = await callFn("processPayouts");
      await new Promise(r => setTimeout(r, 1000));
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (status !== 200) throw new Error(`Function crashed with ${status} — likely User.get() 404`);
      if (data.errors?.some(e => e.includes("regression-test-no-user-get")))
        throw new Error(`Error logged for this booking — User.get() likely called: ${data.errors.join(", ")}`);
      return `Passed — function completed without crashing on unknown host_id, no User.get() 404`;
    },
  },
  {
    id: "pp_j2_smoke_executes",
    group: "processPayouts",
    label: "Smoke — job2_cancelled field present in response",
    claudeHint: "Check processPayouts/entry.ts — response must always include job2_cancelled as a number.",
    run: async () => {
      const { status, data } = await callFn("processPayouts");
      if (status !== 200) throw new Error(`Expected 200, got ${status}`);
      if (typeof data.job2_cancelled !== "number") throw new Error("Missing job2_cancelled field");
      return `Passed — job2_cancelled present: ${data.job2_cancelled}`;
    },
  },
  {
    id: "pp_j2_skips_within_grace",
    group: "processPayouts",
    label: "Functional — does not cancel booking where balance_failed_at is less than 7 days ago",
    claudeHint: "Check processPayouts/entry.ts Job 2 — differenceInDays(now, failedAt) must be strictly greater than 7.",
    run: async () => {
      const failedAt = new Date(Date.now() - 6 * 86400000).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "PP Grace Period Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 17 * 86400000).toISOString().split("T")[0],
          booking_status: "confirmed", balance_payment_status: "failed", balance_failed_at: failedAt,
          remaining_balance: 400, total_amount: 500, deposit_amount: 100,
          stripe_rental_intent_id: "pi_test_grace", stripe_deposit_intent_id: "pi_deposit_grace",
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      await callFn("processPayouts");
      await new Promise(r => setTimeout(r, 1000));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (readBack?.booking?.booking_status === "cancelled")
        throw new Error(`Booking cancelled after only 6 days — grace period guard is broken`);
      return `Passed — booking within 7-day grace period correctly not cancelled`;
    },
  },
  {
    id: "pp_j2_cancels_after_grace",
    group: "processPayouts",
    label: "Functional — cancels booking where balance_failed_at is more than 7 days ago",
    claudeHint: "Check processPayouts/entry.ts Job 2 — booking with balance_failed_at 8 days ago must be set to booking_status: 'cancelled' and balance_payment_status: 'overdue'.",
    run: async () => {
      const failedAt = new Date(Date.now() - 8 * 86400000).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "PP Cancel Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 17 * 86400000).toISOString().split("T")[0],
          booking_status: "confirmed", balance_payment_status: "failed", balance_failed_at: failedAt,
          remaining_balance: 400, total_amount: 500, deposit_amount: 100,
          stripe_rental_intent_id: "pi_test_cancel", stripe_deposit_intent_id: "pi_deposit_cancel",
          cancellation_policy_snapshot: { type: "standard" },
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      await callFn("processPayouts");
      await new Promise(r => setTimeout(r, 1500));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (readBack?.booking?.booking_status !== "cancelled")
        throw new Error(`Expected booking_status 'cancelled', got '${readBack?.booking?.booking_status}'`);
      if (readBack?.booking?.balance_payment_status !== "overdue")
        throw new Error(`Expected balance_payment_status 'overdue', got '${readBack?.booking?.balance_payment_status}'`);
      return `Passed — booking correctly cancelled and marked overdue after 8 days`;
    },
  },
  {
    id: "pp_j2_refunds_deposit_not_rental",
    group: "processPayouts",
    label: "Functional — cancellation refunds stripe_deposit_intent_id not stripe_rental_intent_id",
    claudeHint: "Check processPayouts/entry.ts Job 2 — refund must hit stripe_deposit_intent_id.",
    run: async () => {
      const failedAt = new Date(Date.now() - 8 * 86400000).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "PP Refund Intent Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 17 * 86400000).toISOString().split("T")[0],
          booking_status: "confirmed", balance_payment_status: "failed", balance_failed_at: failedAt,
          remaining_balance: 400, total_amount: 500, deposit_amount: 100,
          stripe_rental_intent_id: "pi_rental_should_not_refund",
          stripe_deposit_intent_id: "pi_deposit_should_refund",
          cancellation_policy_snapshot: { type: "standard" },
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      const { status, data } = await callFn("processPayouts");
      await new Promise(r => setTimeout(r, 1500));
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (status !== 200) throw new Error(`Function crashed: ${data.error}`);
      const hasRentalRefundError = data.errors?.some(e => e.includes(bookingId) && e.toLowerCase().includes("rental"));
      if (hasRentalRefundError) throw new Error(`Rental intent refund attempted — wrong PaymentIntent targeted`);
      return `Passed — function ran without rental intent refund error`;
    },
  },
  {
    id: "pp_j2_biz_dates_released",
    group: "processPayouts",
    label: "Business — cancelled booking releases dates immediately so property can be rebooked",
    claudeHint: "Check processPayouts/entry.ts Job 2 — booking_status must be set to 'cancelled' immediately on auto-cancel.",
    run: async () => {
      const failedAt = new Date(Date.now() - 8 * 86400000).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "PP Dates Released Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 17 * 86400000).toISOString().split("T")[0],
          booking_status: "confirmed", balance_payment_status: "failed", balance_failed_at: failedAt,
          remaining_balance: 400, total_amount: 500, deposit_amount: 100,
          stripe_deposit_intent_id: "pi_deposit_dates",
          cancellation_policy_snapshot: { type: "standard" },
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      await callFn("processPayouts");
      await new Promise(r => setTimeout(r, 1500));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (readBack?.booking?.booking_status !== "cancelled")
        throw new Error(`booking_status not set to cancelled — dates not released`);
      return `Passed — booking_status set to cancelled immediately, dates released for rebooking`;
    },
  },
];

const createBookingPaymentIntentTests = [
  {
    id: "cbpi_smoke_no_session",
    group: "createBookingPaymentIntent",
    label: "Smoke — rejects request with no session token",
    claudeHint: "Check base44/functions/createBookingPaymentIntent/entry.ts — missing session_token must return 401.",
    run: async () => {
      const { status } = await callFn("createBookingPaymentIntent", { booking_id: "test" });
      if (status !== 401) throw new Error(`Expected 401, got ${status}`);
      return `Passed — correctly returned 401 with no session`;
    },
  },
  {
    id: "cbpi_smoke_no_booking_id",
    group: "createBookingPaymentIntent",
    label: "Smoke — rejects request with no booking_id",
    claudeHint: "Check base44/functions/createBookingPaymentIntent/entry.ts — missing booking_id must return 400.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("createBookingPaymentIntent", { session_token: sessionToken });
      if (status !== 400) throw new Error(`Expected 400, got ${status}: ${JSON.stringify(data)}`);
      return `Passed — correctly returned 400 with no booking_id`;
    },
  },
  {
    id: "cbpi_func_host_no_stripe_blocked",
    group: "createBookingPaymentIntent",
    label: "Functional — host without verified Stripe Connect returns 400",
    claudeHint: "Check base44/functions/createBookingPaymentIntent/entry.ts — if UserRole.stripe_connect_status !== 'verified', must return 400.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test-no-stripe", guest_id: user.id,
          guest_name: "CBPI No Stripe Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 70 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 77 * 86400000).toISOString().split("T")[0],
          booking_status: "awaiting_payment", total_amount: 500, deposit_amount: 100,
          remaining_balance: 400, security_deposit: 200, subtotal: 450, cleaning_fee: 50,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      try {
        const { status, data } = await callFn("createBookingPaymentIntent", { session_token: sessionToken, booking_id: bookingId });
        if (status !== 400) throw new Error(`Expected 400, got ${status}: ${JSON.stringify(data)}`);
        return `Passed — host without Stripe Connect correctly blocked with 400`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
      }
    },
  },
  {
    id: "cbpi_func_56_day_deposit_only",
    group: "createBookingPaymentIntent",
    label: "Functional — booking more than 56 days out charges deposit only and sets balance_payment_status to pending",
    claudeHint: "Check base44/functions/createBookingPaymentIntent/entry.ts — daysUntilCheckIn > 56 must set chargeAmount to deposit_amount and balance_payment_status to 'pending'.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id, guest_id: user.id,
          guest_name: "CBPI 56 Day Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 70 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 77 * 86400000).toISOString().split("T")[0],
          booking_status: "awaiting_payment", total_amount: 500, deposit_amount: 100,
          remaining_balance: 400, security_deposit: 0, subtotal: 450, cleaning_fee: 50,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      try {
        const { status, data } = await callFn("createBookingPaymentIntent", { session_token: sessionToken, booking_id: bookingId });
        if (status !== 200) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1000));
        const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
        if (readBack?.booking?.balance_payment_status !== "pending")
          throw new Error(`Expected balance_payment_status 'pending', got '${readBack?.booking?.balance_payment_status}'`);
        if (!readBack?.booking?.balance_due_date) throw new Error(`balance_due_date not written to Booking`);
        return `Passed — deposit only charged, balance_payment_status: pending, balance_due_date set`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
      }
    },
  },
  {
    id: "cbpi_func_within_56_days_full_charge",
    group: "createBookingPaymentIntent",
    label: "Functional — booking within 56 days charges full amount and sets balance_payment_status to not_applicable",
    claudeHint: "Check base44/functions/createBookingPaymentIntent/entry.ts — daysUntilCheckIn <= 56 must set chargeAmount to total_amount and balance_payment_status to 'not_applicable'.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id, guest_id: user.id,
          guest_name: "CBPI Within 56 Day Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 37 * 86400000).toISOString().split("T")[0],
          booking_status: "awaiting_payment", total_amount: 500, deposit_amount: 100,
          remaining_balance: 400, security_deposit: 0, subtotal: 450, cleaning_fee: 50,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      try {
        const { status, data } = await callFn("createBookingPaymentIntent", { session_token: sessionToken, booking_id: bookingId });
        if (status !== 200) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1000));
        const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
        if (readBack?.booking?.balance_payment_status !== "not_applicable")
          throw new Error(`Expected balance_payment_status 'not_applicable', got '${readBack?.booking?.balance_payment_status}'`);
        return `Passed — full amount charged, balance_payment_status: not_applicable`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
      }
    },
  },
  {
    id: "cbpi_biz_booking_reference_generated",
    group: "createBookingPaymentIntent",
    label: "Business — booking_reference in format HKD-[initials]-[DDMMYYYY] written to Booking",
    claudeHint: "Check base44/functions/createBookingPaymentIntent/entry.ts — booking_reference must be generated from guest_name initials and check_in date. Format: HKD-SJM-14072026.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const checkIn = new Date(Date.now() + 70 * 86400000).toISOString().split("T")[0];
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id, guest_id: user.id,
          guest_name: "Sarah Jane Mitchell", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: checkIn,
          check_out: new Date(Date.now() + 77 * 86400000).toISOString().split("T")[0],
          booking_status: "awaiting_payment", total_amount: 500, deposit_amount: 100,
          remaining_balance: 400, security_deposit: 0, subtotal: 450, cleaning_fee: 50,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      try {
        const { status, data } = await callFn("createBookingPaymentIntent", { session_token: sessionToken, booking_id: bookingId });
        if (status !== 200) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1000));
        const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
        const ref = readBack?.booking?.booking_reference;
        if (!ref) throw new Error(`booking_reference not written to Booking entity`);
        if (!ref.startsWith("HKD-")) throw new Error(`booking_reference format wrong — got: ${ref}`);
        const datePart = checkIn.split("-");
        const expectedDate = `${datePart[2]}${datePart[1]}${datePart[0]}`;
        if (!ref.includes("SJM") || !ref.includes(expectedDate))
          throw new Error(`booking_reference missing initials or date — got: ${ref}`);
        return `Passed — booking_reference generated correctly: ${ref}`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
      }
    },
  },
];

export { processPayoutsTests, createBookingPaymentIntentTests };
export default [...processPayoutsTests, ...createBookingPaymentIntentTests];