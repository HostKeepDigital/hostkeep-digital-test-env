import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Play, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const APP_ID = "698eee4108bd1d9467648326";

function buildClaudePrompt(failedTests) {
  const lines = [
    "I ran the HostKeep integration tests and the following tests failed. Please help me fix them.",
    "",
    "App ID: 698eee4108bd1d9467648326",
    "Stack: Base44 (Deno/TypeScript backend, React/Vite frontend), Stripe, Resend",
    "",
    "FAILED TESTS:",
    "",
  ];
  failedTests.forEach((t, i) => {
    lines.push(`${i + 1}. [${t.group}] ${t.label}`);
    lines.push(`   Error: ${t.message || "no detail"}`);
    if (t.claudeHint) lines.push(`   Context: ${t.claudeHint}`);
    lines.push("");
  });
  lines.push("Please check the relevant backend functions and frontend files and give me the fix.");
  return lines.join("\n");
}

const callFn = async (name, body = {}) => {
  const res = await fetch(`/functions/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
};

const TESTS = [
  // ── releaseRentalPayments ──────────────────────────────────────────────
  {
    id: "rrp_executes",
    group: "releaseRentalPayments",
    label: "Function executes and returns correct shape",
    claudeHint: "Check base44/functions/releaseRentalPayments/entry.ts — function must return { processed, results, ran_at }. If 500, check STRIPE_SECRET_KEY and LOCK_ACCESS_TOKEN secrets are set.",
    run: async () => {
      const { status, data } = await callFn("releaseRentalPayments");
      if (status !== 200) throw new Error(`Expected 200, got ${status}`);
      if (typeof data.processed !== "number") throw new Error("Missing 'processed' field");
      if (!Array.isArray(data.results)) throw new Error("Missing 'results' array");
      if (!data.ran_at) throw new Error("Missing 'ran_at' timestamp");
      return `Passed — processed: ${data.processed}, results: ${data.results.length}`;
    },
  },
  {
    id: "rrp_no_crash",
    group: "releaseRentalPayments",
    label: "Function handles empty booking set without error",
    claudeHint: "Check base44/functions/releaseRentalPayments/entry.ts — Booking.filter with no results must return empty results array, not crash.",
    run: async () => {
      const { status, data } = await callFn("releaseRentalPayments");
      if (status !== 200) throw new Error(`Expected 200, got ${status}: ${data.error}`);
      if (data.error) throw new Error(`Function returned error: ${data.error}`);
      return `Passed — no errors, processed ${data.processed} bookings`;
    },
  },
  {
    id: "rrp_skips_rental_frozen",
    group: "releaseRentalPayments",
    label: "Skips rental_frozen=true — frozen rental not released",
    claudeHint: "Check releaseRentalPayments/entry.ts — DB filter uses rental_frozen: false so frozen bookings never enter the loop. If rental_payment_status changes from 'held', the filter is missing.",
    run: async () => {
      const pastDate = new Date(Date.now() - 86400000 * 2).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "RRP Frozen Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() - 86400000 * 3).toISOString().split("T")[0],
          check_out: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
          booking_status: "completed", rental_payment_status: "held",
          rental_frozen: true, rental_release_due_at: pastDate,
          subtotal: 500, cleaning_fee: 50, total_amount: 550,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      await callFn("releaseRentalPayments");
      await new Promise(r => setTimeout(r, 1000));

      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (readBack?.booking?.rental_payment_status !== "held")
        throw new Error(`Expected 'held', got '${readBack?.booking?.rental_payment_status}' — rental_frozen guard is broken`);
      return `Passed — frozen booking skipped, rental_payment_status still 'held'`;
    },
  },
  {
    id: "rrp_skips_future_due_date",
    group: "releaseRentalPayments",
    label: "Skips bookings where rental_release_due_at is in the future",
    claudeHint: "Check releaseRentalPayments/entry.ts — new Date(b.rental_release_due_at) <= now must exclude future dates. If rental_payment_status changes from 'held', the time guard is broken.",
    run: async () => {
      const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "RRP Future Due Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() - 86400000 * 3).toISOString().split("T")[0],
          check_out: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
          booking_status: "checked_in", rental_payment_status: "held",
          rental_frozen: false, rental_release_due_at: futureDate,
          subtotal: 500, cleaning_fee: 50, total_amount: 550,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      await callFn("releaseRentalPayments");
      await new Promise(r => setTimeout(r, 1000));

      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (readBack?.booking?.rental_payment_status !== "held")
        throw new Error(`Expected 'held', got '${readBack?.booking?.rental_payment_status}' — future due date guard is broken`);
      return `Passed — future due date booking skipped, rental_payment_status still 'held'`;
    },
  },
  {
    id: "rrp_skips_wrong_booking_status",
    group: "releaseRentalPayments",
    label: "Skips bookings not in checked_in or completed status",
    claudeHint: "Check releaseRentalPayments/entry.ts — JS filter requires booking_status === 'checked_in' or 'completed'. A booking in 'confirmed' must be excluded.",
    run: async () => {
      const pastDate = new Date(Date.now() - 86400000 * 2).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "RRP Wrong Status Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() - 86400000 * 3).toISOString().split("T")[0],
          check_out: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
          booking_status: "confirmed", rental_payment_status: "held",
          rental_frozen: false, rental_release_due_at: pastDate,
          subtotal: 500, cleaning_fee: 50, total_amount: 550,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      await callFn("releaseRentalPayments");
      await new Promise(r => setTimeout(r, 1000));

      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (readBack?.booking?.rental_payment_status !== "held")
        throw new Error(`Expected 'held', got '${readBack?.booking?.rental_payment_status}' — booking_status guard is broken`);
      return `Passed — 'confirmed' booking skipped, rental_payment_status still 'held'`;
    },
  },
  {
    id: "rrp_eligible_no_stripe",
    group: "releaseRentalPayments",
    label: "Eligible booking with no host Stripe Connect — skipped, rental_payment_status stays 'held'",
    claudeHint: "Check releaseRentalPayments/entry.ts — UserRole.filter({ user_id: 'regression-test', role: 'host' }) returns empty, must push skipped with reason 'host stripe not verified'. rental_payment_status must not change.",
    run: async () => {
      const pastDate = new Date(Date.now() - 86400000 * 2).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "RRP No Stripe Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() - 86400000 * 3).toISOString().split("T")[0],
          check_out: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
          booking_status: "completed", rental_payment_status: "held",
          rental_frozen: false, rental_release_due_at: pastDate,
          subtotal: 500, cleaning_fee: 50, total_amount: 550,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      const { status, data } = await callFn("releaseRentalPayments");
      await new Promise(r => setTimeout(r, 1000));

      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (status !== 200) throw new Error(`Function crashed: ${data.error}`);
      const skippedEntry = data.results?.find(r => r.booking_id === bookingId && r.status === "skipped");
      if (!skippedEntry) throw new Error(`Expected skipped entry for booking in results, got: ${JSON.stringify(data.results)}`);
      if (readBack?.booking?.rental_payment_status !== "held")
        throw new Error(`Expected 'held', got '${readBack?.booking?.rental_payment_status}'`);
      return `Passed — no Stripe on host, skipped (reason: ${skippedEntry.reason}), rental_payment_status still 'held'`;
    },
  },

  // ── raiseComplaint ────────────────────────────────────────────────────
  {
    id: "rc_no_session",
    group: "raiseComplaint",
    label: "Rejects request with no session token",
    claudeHint: "Check base44/functions/raiseComplaint/entry.ts — missing session_token must return 401. Check the session_token guard at the top of the function.",
    run: async () => {
      const { status } = await callFn("raiseComplaint", {});
      if (status !== 401) throw new Error(`Expected 401, got ${status}`);
      return `Passed — correctly returned 401 Unauthorized`;
    },
  },
  {
    id: "rc_invalid_session",
    group: "raiseComplaint",
    label: "Rejects request with invalid session token",
    claudeHint: "Check base44/functions/raiseComplaint/entry.ts — invalid session tokens must fail UserSession.filter lookup and return 401.",
    run: async () => {
      const { status } = await callFn("raiseComplaint", {
        session_token: "invalid_token_test_12345",
        booking_id: "test",
        raised_by: "guest",
      });
      if (status !== 401) throw new Error(`Expected 401, got ${status}`);
      return `Passed — correctly rejected invalid session`;
    },
  },
  {
    id: "rc_booking_not_found",
    group: "raiseComplaint",
    label: "Returns 404 for non-existent booking",
    claudeHint: "Check base44/functions/raiseComplaint/entry.ts — Booking.filter({ id: booking_id }) returning empty array must return 404, not crash.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token available — log in first");
      const { status, data } = await callFn("raiseComplaint", {
        session_token: sessionToken,
        booking_id: "nonexistent_booking_id_test",
        raised_by: "guest",
        category: "property_condition",
        specific_issue: "Test issue",
        description: "This is a test description that is at least 50 characters long for validation.",
        requested_resolution: "full_refund",
      });
      if (status !== 404) throw new Error(`Expected 404, got ${status}: ${JSON.stringify(data)}`);
      return `Passed — correctly returned 404 for unknown booking`;
    },
  },

  // ── resolveComplaint ──────────────────────────────────────────────────
  {
    id: "resc_no_session",
    group: "resolveComplaint",
    label: "Rejects request with no session token",
    claudeHint: "Check base44/functions/resolveComplaint/entry.ts — missing session_token must return 401. Check the session_token guard at the top of the function.",
    run: async () => {
      const { status } = await callFn("resolveComplaint", {});
      if (status !== 401) throw new Error(`Expected 401, got ${status}`);
      return `Passed — correctly returned 401 Unauthorized`;
    },
  },
  {
    id: "resc_invalid_session",
    group: "resolveComplaint",
    label: "Rejects request with invalid session token",
    claudeHint: "Check base44/functions/resolveComplaint/entry.ts — invalid session tokens must fail UserSession.filter lookup and return 401.",
    run: async () => {
      const { status } = await callFn("resolveComplaint", {
        session_token: "invalid_token_test_12345",
        complaint_id: "test",
      });
      if (status !== 401) throw new Error(`Expected 401, got ${status}`);
      return `Passed — correctly rejected invalid session`;
    },
  },
  {
    id: "resc_non_admin",
    group: "resolveComplaint",
    label: "Rejects non-admin session with 403",
    claudeHint: "Check base44/functions/resolveComplaint/entry.ts — UserRole.filter({ user_id, role: 'admin' }) returning empty must return 403.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token available — log in first");
      return `Skipped — requires a non-admin session token to test. Verify manually by calling resolveComplaint with a guest session.`;
    },
  },
  {
    id: "resc_complaint_not_found",
    group: "resolveComplaint",
    label: "Returns 404 for non-existent complaint",
    claudeHint: "Check base44/functions/resolveComplaint/entry.ts — Complaint.filter({ id: complaint_id }) returning empty must return 404.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token available — log in first");
      const { status, data } = await callFn("resolveComplaint", {
        session_token: sessionToken,
        complaint_id: "nonexistent_complaint_id_test",
        admin_resolution: "dismissed",
        admin_resolution_amount: 0,
        admin_notes: "Integration test",
      });
      if (status !== 404 && status !== 403) throw new Error(`Expected 404 or 403, got ${status}: ${JSON.stringify(data)}`);
      return `Passed — correctly returned ${status} for unknown complaint`;
    },
  },

  // ── sendNotification ──────────────────────────────────────────────────
  {
    id: "sn_missing_fields",
    group: "sendNotification",
    label: "Returns missing_fields error when type, title, body are absent",
    claudeHint: "Check base44/functions/sendNotification/entry.ts — the missing fields guard must return { success: false, error: 'missing_fields' } with status 400 when type/title/body are omitted.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token available — log in first");
      const { status, data } = await callFn("sendNotification", {
        session_token: sessionToken,
        user_id: "integration_test_placeholder",
      });
      if (status !== 400) throw new Error(`Expected 400, got ${status}`);
      if (data.error !== "missing_fields") throw new Error(`Expected missing_fields error, got: ${JSON.stringify(data)}`);
      return `Passed — correctly returned 400 with missing_fields error`;
    },
  },
  {
    id: "sn_executes",
    group: "sendNotification",
    label: "Executes and returns success: true with valid payload",
    claudeHint: "Check base44/functions/sendNotification/entry.ts — a valid payload must create a Notification record and return { success: true } with status 200. Check RESEND_API_KEY and entity write permissions.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token available — log in first");
      const { status, data } = await callFn("sendNotification", {
        session_token: sessionToken,
        user_id: "integration_test_placeholder",
        type: "general",
        title: "[Integration Test] sendNotification",
        body: "Automated integration test — safe to ignore.",
      });
      if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
      if (!data.success) throw new Error(`Expected success: true, got: ${JSON.stringify(data)}`);
      return `Passed — notification record created successfully`;
    },
  },
 {
    id: "sn_cleaning_types",
    group: "sendNotification",
    label: "Accepts all cleaning job move types and writes DB records",
    claudeHint: "Check base44/functions/sendNotification/entry.ts PREF_MAP — cleaning_job_move_requested, cleaning_job_move_approved, cleaning_job_move_denied, cleaning_job_cancelled_by_cleaner, cleaning_job_cancelled_by_host must all be present. Also verify Notification entity records are being created for each type.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token available — log in first");
      const types = [
        "cleaning_job_move_requested",
        "cleaning_job_move_approved",
        "cleaning_job_move_denied",
        "cleaning_job_cancelled_by_cleaner",
        "cleaning_job_cancelled_by_host",
      ];

      // Step 1 — send all 5 types
      const sendFailures = [];
      for (const type of types) {
        const { status, data } = await callFn("sendNotification", {
          session_token: sessionToken,
          user_id: "integration_test_placeholder",
          type,
          title: `[Integration Test] ${type}`,
          body: "Automated integration test — safe to ignore.",
        });
        if (status !== 200 || !data.success) sendFailures.push(type);
      }
      if (sendFailures.length > 0) throw new Error(`sendNotification failed for: ${sendFailures.join(", ")}`);

      // Step 2 — verify DB records were actually written
      const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: "integration_test_placeholder" });
      const allRecords = notifData?.notifications || [];
      const testRecords = allRecords.filter(n => n.title?.startsWith("[Integration Test]"));
      const writtenTypes = new Set(testRecords.map(n => n.type));
      const missingFromDb = types.filter(t => !writtenTypes.has(t));

      // Step 3 — clean up test records
      for (const record of testRecords) {
        try { await callFn("seedTestBooking", { action: "deleteNotification", id: record.id }); } catch (_) {}
      }

      if (missingFromDb.length > 0) throw new Error(`DB records missing for types: ${missingFromDb.join(", ")}`);
      return `Passed — all 5 types written to DB and verified (${testRecords.length} records cleaned up)`;
    },
  },
  {
    id: "sn_force_email",
    group: "sendNotification",
    label: "force_email flag sends email without error",
    claudeHint: "Check base44/functions/sendNotification/entry.ts — force_email: true with a valid email_to must bypass preference check, send via Resend, and return email_attempted: true, email_delivered: true. If email_delivered is false, check email_error in the response and verify RESEND_API_KEY is set correctly in secrets.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token available — log in first");
      if (!user?.id) throw new Error("Could not resolve real user ID — make sure you are logged in");
      const userId = user.id;

      const { status, data } = await callFn("sendNotification", {
        session_token: sessionToken,
        user_id: userId,
        type: "general",
        title: "[Integration Test] Force Email",
        body: "Forced email integration test — safe to ignore.",
        email_to: "admin@hostkeepdigital.co.uk",
        force_email: true,
      });
      if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
      if (!data.email_attempted) throw new Error(`Resend was never called — check RESEND_API_KEY is set in secrets and email_to is present`);
      if (!data.email_delivered) throw new Error(`Resend rejected the email — error: ${data.email_error}`);

      // Verify notification record was actually written to DB
       // Verify notification record was actually written to DB
      await new Promise(r => setTimeout(r, 1000));
      const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: userId });
      const allNotifs = notifData?.notifications || [];
      const testNotif = allNotifs.find(n => n.title === "[Integration Test] Force Email");
      if (!testNotif) {
        throw new Error(`Resend accepted the email but no Notification record was written to DB for user ${userId} — check serviceRole entity write permissions`);
      }
      await callFn("seedTestBooking", { action: "deleteNotification", id: testNotif.id });

      return `Passed — Notification record written to DB and cleaned up, email accepted by Resend`;
    },
  },

  // ── notifyBookingEvent ───────────────────────────────────────────────

  {
    id: "nbe_smoke_missing_fields",
    group: "notifyBookingEvent",
    label: "Smoke — returns missing_fields when booking_id absent",
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — missing booking_id or event_type must return { error: 'missing_fields' } with status 200.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("notifyBookingEvent", {
        session_token: sessionToken,
        event_type: "confirmed",
      });
      if (status !== 200) throw new Error(`Expected 200, got ${status}`);
      if (data.error !== "missing_fields") throw new Error(`Expected missing_fields, got: ${JSON.stringify(data)}`);
      return "Passed — missing booking_id correctly returns missing_fields";
    },
  },

  {
    id: "nbe_smoke_not_found",
    group: "notifyBookingEvent",
    label: "Smoke — returns booking_not_found for unknown booking",
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — Booking.get with an unknown ID must return { error: 'booking_not_found' }. Note: function returns status 200 for all error types — check the error field not the status.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("notifyBookingEvent", {
        session_token: sessionToken,
        booking_id: "000000000000000000000000",
        event_type: "confirmed",
      });
      if (status !== 200) throw new Error(`Expected 200, got ${status}`);
      if (data.error !== "booking_not_found") throw new Error(`Expected booking_not_found, got: ${JSON.stringify(data)}`);
      return "Passed — unknown booking_id correctly returns booking_not_found";
    },
  },

  {
    id: "nbe_func_requested",
    group: "notifyBookingEvent",
    label: "Functional — booking_request event creates notification for host with booking deep link",
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — event_type 'requested' must create a Notification for booking.host_id with type 'booking_request' and link '/HostBookings?booking={id}'. If no notification found: serviceRole.functions.invoke('sendNotification') may be broken — replace with raw fetch + service_key. If notification exists but link wrong: add ?booking=${booking.id} to the link string.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");

      const { data: createData } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id,
          guest_id: "test_guest_nbe",
          guest_name: "Integration Test Guest",
          guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_nbe",
          booking_status: "pending",
          check_in: "2026-08-01",
          check_out: "2026-08-07",
          nights: 6,
          total_amount: 600,
          security_deposit: 200,
        },
      });
      const bookingId = createData?.id;
      if (!bookingId) throw new Error("Failed to seed test booking");

      try {
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: user.id, title_prefix: "[Test]" });

        const { status, data } = await callFn("notifyBookingEvent", {
          session_token: sessionToken,
          booking_id: bookingId,
          event_type: "requested",
        });
        if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);

        await new Promise(r => setTimeout(r, 1000));

        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: user.id });
        const hostNotif = (notifData?.notifications || []).find(n => n.type === "booking_request");
        if (!hostNotif) throw new Error("No booking_request notification found for host — serviceRole.functions.invoke('sendNotification') is likely broken, replace with raw fetch + service_key");
        if (!hostNotif.link?.includes(bookingId)) throw new Error(`Notification created but link '${hostNotif.link}' missing booking ID — needs ?booking=${bookingId}`);

        return `Passed — host booking_request notification created with correct deep link`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: user.id, title_prefix: "New Booking" });
      }
    },
  },

  {
    id: "nbe_func_confirmed",
    group: "notifyBookingEvent",
    label: "Functional — confirmed event creates notifications for both host and guest with booking deep links",
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — event_type 'confirmed' must create booking_confirmed notifications for both booking.host_id and booking.guest_id, each with link containing the booking ID.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");

      const { data: createData } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id,
          guest_id: "test_guest_nbe",
          guest_name: "Integration Test Guest",
          guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_nbe",
          booking_status: "confirmed",
          check_in: "2026-08-01",
          check_out: "2026-08-07",
          nights: 6,
          total_amount: 600,
          security_deposit: 200,
        },
      });
      const bookingId = createData?.id;
      if (!bookingId) throw new Error("Failed to seed test booking");

      try {
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: user.id, title_prefix: "Booking Confirmed" });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: "test_guest_nbe", title_prefix: "Booking Confirmed" });

        const { status, data } = await callFn("notifyBookingEvent", {
          session_token: sessionToken,
          booking_id: bookingId,
          event_type: "confirmed",
        });
        if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);

        await new Promise(r => setTimeout(r, 1000));

        const { data: hostNotifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: user.id });
        const hostNotif = (hostNotifData?.notifications || []).find(n => n.type === "booking_confirmed");
        if (!hostNotif) throw new Error("No booking_confirmed notification for host");
        if (!hostNotif.link?.includes(bookingId)) throw new Error(`Host notification link '${hostNotif.link}' missing booking ID`);

        const { data: guestNotifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: "test_guest_nbe" });
        const guestNotif = (guestNotifData?.notifications || []).find(n => n.type === "booking_confirmed");
        if (!guestNotif) throw new Error("No booking_confirmed notification for guest");
        if (!guestNotif.link?.includes(bookingId)) throw new Error(`Guest notification link '${guestNotif.link}' missing booking ID`);

        return `Passed — booking_confirmed notifications created for both host and guest with correct deep links`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: user.id, title_prefix: "Booking Confirmed" });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: "test_guest_nbe", title_prefix: "Booking Confirmed" });
      }
    },
  },

  {
    id: "nbe_func_cancelled",
    group: "notifyBookingEvent",
    label: "Functional — cancelled event creates notifications for both host and guest",
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — event_type 'cancelled' must notify both booking.guest_id (booking_cancelled) and booking.host_id (booking_cancelled) with correct deep links.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");

      const { data: createData } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id,
          guest_id: "test_guest_nbe",
          guest_name: "Integration Test Guest",
          guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_nbe",
          booking_status: "confirmed",
          check_in: "2026-08-01",
          check_out: "2026-08-07",
          nights: 6,
          total_amount: 600,
          security_deposit: 200,
        },
      });
      const bookingId = createData?.id;
      if (!bookingId) throw new Error("Failed to seed test booking");

      try {
        const { status, data } = await callFn("notifyBookingEvent", {
          session_token: sessionToken,
          booking_id: bookingId,
          event_type: "cancelled",
        });
        if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);

        await new Promise(r => setTimeout(r, 1000));

        const { data: hostNotifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: user.id });
        const hostNotif = (hostNotifData?.notifications || []).find(n => n.type === "booking_cancelled");
        if (!hostNotif) throw new Error("No booking_cancelled notification for host");
        if (!hostNotif.link?.includes(bookingId)) throw new Error(`Host notification link missing booking ID`);

        const { data: guestNotifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: "test_guest_nbe" });
        const guestNotif = (guestNotifData?.notifications || []).find(n => n.type === "booking_cancelled");
        if (!guestNotif) throw new Error("No booking_cancelled notification for guest");
        if (!guestNotif.link?.includes(bookingId)) throw new Error(`Guest notification link missing booking ID`);

        return `Passed — booking_cancelled notifications created for both host and guest`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: user.id, title_prefix: "Booking Cancelled" });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: "test_guest_nbe", title_prefix: "Booking Cancelled" });
      }
    },
  },

  {
    id: "nbe_func_cancelled_by_host",
    group: "notifyBookingEvent",
    label: "Functional — cancelled_by_host event notifies guest and host",
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — event_type 'cancelled_by_host' must notify guest (booking_cancelled, link /Search) and host (booking_cancelled, link /HostBookings?booking=).",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");

      const { data: createData } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id,
          guest_id: "test_guest_nbe",
          guest_name: "Integration Test Guest",
          guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_nbe",
          booking_status: "confirmed",
          check_in: "2026-08-01",
          check_out: "2026-08-07",
          nights: 6,
          total_amount: 600,
          security_deposit: 200,
        },
      });
      const bookingId = createData?.id;
      if (!bookingId) throw new Error("Failed to seed test booking");

      try {
        const { status, data } = await callFn("notifyBookingEvent", {
          session_token: sessionToken,
          booking_id: bookingId,
          event_type: "cancelled_by_host",
        });
        if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);

        await new Promise(r => setTimeout(r, 1000));

        const { data: hostNotifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: user.id });
        const hostNotif = (hostNotifData?.notifications || []).find(n => n.type === "booking_cancelled" && n.link?.includes(bookingId));
        if (!hostNotif) throw new Error("No booking_cancelled confirmation notification for host");

        const { data: guestNotifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: "test_guest_nbe" });
        const guestNotif = (guestNotifData?.notifications || []).find(n => n.type === "booking_cancelled");
        if (!guestNotif) throw new Error("No booking_cancelled notification for guest");
        if (guestNotif.link !== "/Search") throw new Error(`Guest link should be /Search, got '${guestNotif.link}'`);

        return `Passed — both host and guest notified correctly on host cancellation`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: user.id, title_prefix: "You Cancelled" });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: "test_guest_nbe", title_prefix: "Booking Cancelled" });
      }
    },
  },

  {
    id: "nbe_func_completed",
    group: "notifyBookingEvent",
    label: "Functional — completed event creates notifications for both host and guest",
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — event_type 'completed' must notify booking.guest_id (booking_completed, link to /MyTrips?booking=) and booking.host_id (booking_completed, link to /HostBookings?booking=).",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");

      const { data: createData } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id,
          guest_id: "test_guest_nbe",
          guest_name: "Integration Test Guest",
          guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_nbe",
          booking_status: "completed",
          check_in: "2026-07-01",
          check_out: "2026-07-07",
          nights: 6,
          total_amount: 600,
          security_deposit: 200,
        },
      });
      const bookingId = createData?.id;
      if (!bookingId) throw new Error("Failed to seed test booking");

      try {
        const { status, data } = await callFn("notifyBookingEvent", {
          session_token: sessionToken,
          booking_id: bookingId,
          event_type: "completed",
        });
        if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);

        await new Promise(r => setTimeout(r, 1000));

        const { data: hostNotifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: user.id });
        const hostNotif = (hostNotifData?.notifications || []).find(n => n.type === "booking_completed");
        if (!hostNotif) throw new Error("No booking_completed notification for host");
        if (!hostNotif.link?.includes(bookingId)) throw new Error(`Host notification link missing booking ID`);

        const { data: guestNotifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: "test_guest_nbe" });
        const guestNotif = (guestNotifData?.notifications || []).find(n => n.type === "booking_completed");
        if (!guestNotif) throw new Error("No booking_completed notification for guest");
        if (!guestNotif.link?.includes(bookingId)) throw new Error(`Guest notification link missing booking ID`);

        return `Passed — booking_completed notifications created for both host and guest`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: user.id, title_prefix: "Stay Completed" });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: "test_guest_nbe", title_prefix: "Stay Complete" });
      }
    },
  },

  {
    id: "nbe_biz_immediate_notify",
    group: "notifyBookingEvent",
    label: "Business — booking request notification fires immediately regardless of time",
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — notification must fire immediately on event with no time-based delay or suppression. Notification record must exist within 10 seconds of function call.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");

      const { data: createData } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id,
          guest_id: "test_guest_nbe",
          guest_name: "Integration Test Guest",
          guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_nbe",
          booking_status: "pending",
          check_in: "2026-08-01",
          check_out: "2026-08-07",
          nights: 6,
          total_amount: 600,
          security_deposit: 200,
        },
      });
      const bookingId = createData?.id;
      if (!bookingId) throw new Error("Failed to seed test booking");

      try {
        const before = Date.now();
        const { status, data } = await callFn("notifyBookingEvent", {
          session_token: sessionToken,
          booking_id: bookingId,
          event_type: "requested",
        });
        const elapsed = Date.now() - before;
        if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);

        await new Promise(r => setTimeout(r, 1000));

        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: user.id });
        const hostNotif = (notifData?.notifications || []).find(n =>
          n.type === "booking_request" &&
          n.link?.includes(bookingId) &&
          new Date(n.created_date).getTime() > before - 5000
        );
        if (!hostNotif) throw new Error("Notification not found — must fire immediately with no time-based delay");

        const notifCreatedAt = new Date(hostNotif.created_date).getTime();
        const notifAge = Date.now() - notifCreatedAt;
        if (notifAge > 15000) throw new Error(`Notification created ${notifAge}ms ago — too old, may have been delayed`);

        return `Passed — notification fired immediately (function responded in ${elapsed}ms, notification age ${notifAge}ms)`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: user.id, title_prefix: "New Booking" });
      }
    },
  },

  {
    id: "nbe_biz_duplicate_guard",
    group: "notifyBookingEvent",
    label: "Business — duplicate event calls do not create duplicate notifications",
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — calling the same event twice for the same booking must not create two Notification records. Add deduplication: before creating, filter Notification for user_id + type + link and skip if a record already exists within the last 60 seconds.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");

      const { data: createData } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id,
          guest_id: "test_guest_nbe",
          guest_name: "Integration Test Guest",
          guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_nbe",
          booking_status: "pending",
          check_in: "2026-08-01",
          check_out: "2026-08-07",
          nights: 6,
          total_amount: 600,
          security_deposit: 200,
        },
      });
      const bookingId = createData?.id;
      if (!bookingId) throw new Error("Failed to seed test booking");

      try {
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: user.id, title_prefix: "New Booking" });

        await callFn("notifyBookingEvent", { session_token: sessionToken, booking_id: bookingId, event_type: "requested" });
        await callFn("notifyBookingEvent", { session_token: sessionToken, booking_id: bookingId, event_type: "requested" });

        await new Promise(r => setTimeout(r, 1000));

        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: user.id });
        const dupes = (notifData?.notifications || []).filter(n => n.type === "booking_request" && n.link?.includes(bookingId));

        if (dupes.length > 1) throw new Error(`Duplicate guard missing — ${dupes.length} identical notifications created for the same event. Add deduplication check in notifyBookingEvent before calling sendNotification.`);
        if (dupes.length === 0) throw new Error("No notification created at all — check event handling");

        return `Passed — duplicate event call correctly produced only 1 notification`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: user.id, title_prefix: "New Booking" });
      }
    },
  },

  // ── submitHostVerification ───────────────────────────────────────────
  {
    id: "shv_smoke_shape",
    group: "submitHostVerification",
    label: "Smoke — function exists and returns correct shape",
    claudeHint: "base44/functions/submitHostVerification/entry.ts does not exist yet — build it. Must accept session_token and return { success: true } or { success: false, error }.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("submitHostVerification", {
        session_token: sessionToken,
        phone: "+441234567890",
        phone_verified: true,
        property_address: "Test Address, Cornwall, TR1 1AA",
      });
      if (status === 404 || data?.error === "unrecognised_function") throw new Error("Function not found — submitHostVerification has not been built yet");
      if (typeof data.success === "undefined") throw new Error(`Response missing success field: ${JSON.stringify(data)}`);
      return `Passed — function reachable, shape correct (success: ${data.success})`;
    },
  },
  {
    id: "shv_smoke_no_session",
    group: "submitHostVerification",
    label: "Smoke — rejects request with no session token",
    claudeHint: "base44/functions/submitHostVerification/entry.ts — missing session_token must return 401.",
    run: async () => {
      const { status } = await callFn("submitHostVerification", {
        phone: "+441234567890",
        phone_verified: true,
      });
      if (status !== 401) throw new Error(`Expected 401, got ${status}`);
      return "Passed — correctly returned 401 with no session";
    },
  },
  {
    id: "shv_smoke_missing_fields",
    group: "submitHostVerification",
    label: "Smoke — rejects when phone or phone_verified absent",
    claudeHint: "base44/functions/submitHostVerification/entry.ts — missing phone or phone_verified must return 400 with missing_fields error.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("submitHostVerification", {
        session_token: sessionToken,
        // phone intentionally omitted
      });
      if (status !== 400) throw new Error(`Expected 400, got ${status}: ${JSON.stringify(data)}`);
      if (data.error !== "missing_fields") throw new Error(`Expected missing_fields, got: ${JSON.stringify(data)}`);
      return "Passed — missing phone correctly returns 400 missing_fields";
    },
  },
  {
    id: "shv_func_creates_host_role",
    group: "submitHostVerification",
    label: "Functional — creates host UserRole with approval_status pending",
    claudeHint: "base44/functions/submitHostVerification/entry.ts — must create or update a UserRole with role: 'host' and approval_status: 'pending' for the session user. If failing, check UserRole.create uses serviceRole not the user client.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");

      // Clean up any existing test host role first
      const { data: existingRole } = await callFn("seedTestBooking", { action: "readUserRole", user_id: user.id, role: "host" });
      if (existingRole?.userRole?.id) {
        await callFn("seedTestBooking", { action: "deleteUserRole", id: existingRole.userRole.id });
      }

      try {
        const { status, data } = await callFn("submitHostVerification", {
          session_token: sessionToken,
          phone: "+441234567890",
          phone_verified: true,
          property_address: "Integration Test Address, Cornwall, TR1 1AA",
        });
        if (status !== 200 || !data.success) throw new Error(`submitHostVerification failed: ${JSON.stringify(data)}`);

        await new Promise(r => setTimeout(r, 1000));

        const { data: roleData } = await callFn("seedTestBooking", { action: "readUserRole", user_id: user.id, role: "host" });
        if (!roleData?.userRole) throw new Error("Host UserRole not created — addUserRole is likely using the frontend client. Must use serviceRole in the backend function.");
        if (roleData.userRole.approval_status !== "pending") throw new Error(`Expected approval_status 'pending', got '${roleData.userRole.approval_status}'`);

        return `Passed — host UserRole created with approval_status: pending`;
      } finally {
        const { data: cleanupRole } = await callFn("seedTestBooking", { action: "readUserRole", user_id: user.id, role: "host" });
        if (cleanupRole?.userRole?.id) {
          await callFn("seedTestBooking", { action: "deleteUserRole", id: cleanupRole.userRole.id });
        }
      }
    },
  },
  {
    id: "shv_func_sends_admin_notification",
    group: "submitHostVerification",
    label: "Functional — admin receives notification when host submits verification",
    claudeHint: "base44/functions/submitHostVerification/entry.ts — must call sendNotification for the admin user after successful submission. Check admin user_id is hardcoded or looked up via UserRole where role: admin.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");

      await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: user.id, title_prefix: "[Test]" });

      const { status, data } = await callFn("submitHostVerification", {
        session_token: sessionToken,
        phone: "+441234567890",
        phone_verified: true,
        property_address: "Integration Test Address, Cornwall, TR1 1AA",
      });
      if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);

      await new Promise(r => setTimeout(r, 1000));

      const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: user.id });
      const adminNotif = (notifData?.notifications || []).find(n => n.link === "/AdminPanel");
      if (!adminNotif) throw new Error("No admin notification found — submitHostVerification must call sendNotification with link: /AdminPanel");

      await callFn("seedTestBooking", { action: "deleteNotification", id: adminNotif.id });

      const { data: cleanupRole } = await callFn("seedTestBooking", { action: "readUserRole", user_id: user.id, role: "host" });
      if (cleanupRole?.userRole?.id) {
        await callFn("seedTestBooking", { action: "deleteUserRole", id: cleanupRole.userRole.id });
      }

      return `Passed — admin notification created with correct link`;
    },
  },

  // ── uploadVerificationDocument ────────────────────────────────────────
  {
    id: "uvd_smoke_shape",
    group: "uploadVerificationDocument",
    label: "Smoke — function exists and returns correct shape",
    claudeHint: "base44/functions/uploadVerificationDocument/entry.ts does not exist yet — build it. Must accept session_token, document_type, file_url and return { success: true, id } or error.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("uploadVerificationDocument", {
        session_token: sessionToken,
        document_type: "government_id",
        file_url: "https://example.com/test-doc.jpg",
      });
      if (status === 404 || data?.error === "unrecognised_function") throw new Error("Function not found — uploadVerificationDocument has not been built yet");
      if (typeof data.success === "undefined") throw new Error(`Response missing success field: ${JSON.stringify(data)}`);
      return `Passed — function reachable (success: ${data.success})`;
    },
  },
  {
    id: "uvd_smoke_no_session",
    group: "uploadVerificationDocument",
    label: "Smoke — rejects request with no session token",
    claudeHint: "base44/functions/uploadVerificationDocument/entry.ts — missing session_token must return 401.",
    run: async () => {
      const { status } = await callFn("uploadVerificationDocument", {
        document_type: "government_id",
        file_url: "https://example.com/test-doc.jpg",
      });
      if (status !== 401) throw new Error(`Expected 401, got ${status}`);
      return "Passed — correctly returned 401 with no session";
    },
  },
  {
    id: "uvd_smoke_missing_fields",
    group: "uploadVerificationDocument",
    label: "Smoke — rejects when document_type or file_url absent",
    claudeHint: "base44/functions/uploadVerificationDocument/entry.ts — missing document_type or file_url must return 400 missing_fields.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("uploadVerificationDocument", {
        session_token: sessionToken,
        document_type: "government_id",
        // file_url intentionally omitted
      });
      if (status !== 400) throw new Error(`Expected 400, got ${status}: ${JSON.stringify(data)}`);
      if (data.error !== "missing_fields") throw new Error(`Expected missing_fields, got: ${JSON.stringify(data)}`);
      return "Passed — missing file_url correctly returns 400 missing_fields";
    },
  },
  {
    id: "uvd_func_creates_record",
    group: "uploadVerificationDocument",
    label: "Functional — creates VerificationDocuments record and returns id",
    claudeHint: "base44/functions/uploadVerificationDocument/entry.ts — must create a VerificationDocuments record via serviceRole with verification_status: 'pending' and return { success: true, id }. If failing, check entity write uses serviceRole not user client.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");

      const { status, data } = await callFn("uploadVerificationDocument", {
        session_token: sessionToken,
        document_type: "government_id",
        file_url: "https://example.com/integration-test-doc.jpg",
      });
      if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);
      if (!data.id) throw new Error("Response missing id — function must return the created record id for cleanup");

      return `Passed — VerificationDocuments record created with id: ${data.id}`;
    },
  },

 // NEW
  // ── verificationFlow ─────────────────────────────────────────────────

  {
    id: "vf_s1_missing_email",
    group: "verificationFlow",
    label: "Smoke — sendVerificationCode rejects missing email",
    claudeHint: "Check base44/functions/sendVerificationCode/entry.ts — missing email must return 400 with { error: 'Email is required' }.",
    run: async () => {
      const { status, data } = await callFn("sendVerificationCode", {});
      if (status !== 400) throw new Error(`Expected 400, got ${status}`);
      if (data.error !== "Email is required") throw new Error(`Expected 'Email is required', got: ${JSON.stringify(data)}`);
      return "Passed — missing email correctly returns 400";
    },
  },

  {
    id: "vf_s2_verify_missing_fields",
    group: "verificationFlow",
    label: "Smoke — verifyEmailCode returns valid: false for missing fields",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — missing email and code must return { valid: false } without crashing.",
    run: async () => {
      const { status, data } = await callFn("verifyEmailCode", {});
      if (status !== 200) throw new Error(`Expected 200, got ${status}`);
      if (data.valid !== false) throw new Error(`Expected valid: false, got: ${JSON.stringify(data)}`);
      return "Passed — missing fields correctly returns valid: false";
    },
  },

  {
    id: "vf_s3_verify_unknown_email",
    group: "verificationFlow",
    label: "Smoke — verifyEmailCode returns valid: false for unknown email",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — unknown email must return { valid: false } without crashing. Confirms function ran and reached the DB query.",
    run: async () => {
      const { status, data } = await callFn("verifyEmailCode", {
        email: "smoke-test-nobody-vf@integration.test",
        code: "000000",
      });
      if (status !== 200) throw new Error(`Expected 200, got ${status}`);
      if (data.valid !== false) throw new Error(`Expected valid: false, got: ${JSON.stringify(data)}`);
      return "Passed — unknown email correctly returns valid: false";
    },
  },

  {
    id: "vf_f1_code_created_in_db",
    group: "verificationFlow",
    label: "Functional — sendVerificationCode creates exactly one DB record",
    claudeHint: "Check base44/functions/sendVerificationCode/entry.ts — must create an EmailVerificationCode record with used: false and a valid expires_at in the future.",
    run: async () => {
      const testEmail = "hello@hostkeepdigital.co.uk";
      await callFn("sendVerificationCode", { email: testEmail, name: "Test", type: "guest" });
      await new Promise(r => setTimeout(r, 1000));

      const { data } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (!data.record) throw new Error("No EmailVerificationCode record found in DB after sending code");
      if (data.record.used !== false) throw new Error(`Expected used: false, got: ${data.record.used}`);
      if (new Date(data.record.expires_at) < new Date()) throw new Error("expires_at is in the past — code is immediately expired");
      if (data.count !== 1) throw new Error(`Expected exactly 1 record, found ${data.count} — old codes may not be deleted`);

      await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: data.record.id });
      return `Passed — one valid code record created with future expires_at`;
    },
  },

  {
    id: "vf_f2_old_codes_deleted",
    group: "verificationFlow",
    label: "Functional — sending a new code deletes the old one (regression for bug 1)",
    claudeHint: "Check base44/functions/sendVerificationCode/entry.ts — old codes must be DELETED not marked used: true. If verifyEmailCode gets records[0] and it is the old used code, verification always fails. This is the root cause of the sign-up bug.",
    run: async () => {
      const testEmail = "hello@hostkeepdigital.co.uk";

      await callFn("sendVerificationCode", { email: testEmail, name: "Test", type: "guest" });
      await new Promise(r => setTimeout(r, 500));
      await callFn("sendVerificationCode", { email: testEmail, name: "Test", type: "guest" });
      await new Promise(r => setTimeout(r, 1000));

      const { data } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (data.count !== 1) throw new Error(`Expected exactly 1 record after resend, found ${data.count} — old codes are not being deleted, only marked used. verifyEmailCode will return the wrong code first.`);

      if (data.record?.id) {
        await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: data.record.id });
      }
      return `Passed — only 1 code exists after resend, old code correctly deleted`;
    },
  },

  {
    id: "vf_f3_correct_code_verifies",
    group: "verificationFlow",
    label: "Functional — correct code returns valid: true and deletes the record",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — correct code must return { valid: true } and delete the EmailVerificationCode record from the DB.",
    run: async () => {
      const testEmail = "integration-verify-f3@test.hostkeep";
      const testCode = "847291";
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { data: seedData } = await callFn("seedTestBooking", {
        action: "createEmailVerificationCode",
        email: testEmail,
        code: testCode,
        expires_at: expiresAt,
      });
      if (!seedData?.id) throw new Error("Failed to seed EmailVerificationCode");

      const { data } = await callFn("verifyEmailCode", { email: testEmail, code: testCode });
      if (!data.valid) throw new Error(`Expected valid: true, got: ${JSON.stringify(data)}`);

      // Confirm record was deleted
      const { data: checkData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (checkData.record !== null) {
        await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: checkData.record.id });
        throw new Error("Code record was not deleted after successful verification");
      }

      return `Passed — correct code verified and record deleted from DB`;
    },
  },

  {
    id: "vf_f4_wrong_code_fails",
    group: "verificationFlow",
    label: "Functional — wrong code returns valid: false and leaves record intact",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — wrong code must return { valid: false } and must NOT delete the record. A wrong guess should not consume the code.",
    run: async () => {
      const testEmail = "integration-verify-f4@test.hostkeep";
      const testCode = "123456";
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { data: seedData } = await callFn("seedTestBooking", {
        action: "createEmailVerificationCode",
        email: testEmail,
        code: testCode,
        expires_at: expiresAt,
      });
      if (!seedData?.id) throw new Error("Failed to seed EmailVerificationCode");

      try {
        const { data } = await callFn("verifyEmailCode", { email: testEmail, code: "999999" });
        if (data.valid !== false) throw new Error(`Expected valid: false for wrong code, got: ${JSON.stringify(data)}`);

        const { data: checkData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
        if (!checkData.record) throw new Error("Code record was deleted after a wrong guess — it should remain intact");

        return `Passed — wrong code correctly rejected, record still intact`;
      } finally {
        await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: seedData.id });
      }
    },
  },

  {
    id: "vf_f5_expired_code_fails",
    group: "verificationFlow",
    label: "Functional — expired code returns valid: false",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — a code with expires_at in the past must return { valid: false }.",
    run: async () => {
      const testEmail = "integration-verify-f5@test.hostkeep";
      const testCode = "654321";
      const expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second in the past

      const { data: seedData } = await callFn("seedTestBooking", {
        action: "createEmailVerificationCode",
        email: testEmail,
        code: testCode,
        expires_at: expiresAt,
      });
      if (!seedData?.id) throw new Error("Failed to seed expired EmailVerificationCode");

      try {
        const { data } = await callFn("verifyEmailCode", { email: testEmail, code: testCode });
        if (data.valid !== false) throw new Error(`Expected valid: false for expired code, got: ${JSON.stringify(data)}`);
        return `Passed — expired code correctly rejected`;
      } finally {
        const { data: checkData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
        if (checkData.record) {
          await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: checkData.record.id });
        }
      }
    },
  },

  {
    id: "vf_f6_email_verified_set",
    group: "verificationFlow",
    label: "Functional — successful verification sets email_verified: true on UserCredentials",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — after valid: true, UserCredentials.email_verified must be updated to true. If not, customSignIn will always reject the user with email_not_verified.",
    run: async () => {
      const testEmail = "integration-verify-f6@test.hostkeep";
      const testCode = "112233";
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { data: credData } = await callFn("seedTestBooking", {
        action: "createUserCredentials",
        userCredentials: { email: testEmail, password_hash: "test_hash_not_real", email_verified: false },
      });
      if (!credData?.id) throw new Error("Failed to seed UserCredentials");

      await callFn("seedTestBooking", {
        action: "createEmailVerificationCode",
        email: testEmail,
        code: testCode,
        expires_at: expiresAt,
      });

      try {
        const { data } = await callFn("verifyEmailCode", { email: testEmail, code: testCode, type: "guest" });
        if (!data.valid) throw new Error(`Expected valid: true, got: ${JSON.stringify(data)}`);

        await new Promise(r => setTimeout(r, 1000));

        const { data: credCheck } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (!credCheck.record) throw new Error("UserCredentials record not found after verification");
        if (credCheck.record.email_verified !== true) throw new Error(`email_verified not set to true — got: ${credCheck.record.email_verified}. Guest will never be able to sign in.`);

        return `Passed — email_verified correctly set to true after successful verification`;
      } finally {
        await callFn("seedTestBooking", { action: "deleteUserCredentials", id: credData.id });
        const { data: codeCheck } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
        if (codeCheck.record) await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: codeCheck.record.id });
      }
    },
  },

  {
    id: "vf_b1_guest_code_created",
    group: "verificationFlow",
    label: "Business — guest sign-up type creates code and sends correct email",
    claudeHint: "Check base44/functions/sendVerificationCode/entry.ts — type: 'guest' must create a code record and send an email saying 'Thank you for creating your HostKeep account' not founding member language. Verify code exists in DB. Check Resend dashboard to confirm email content.",
    run: async () => {
      const testEmail = "hello@hostkeepdigital.co.uk";

      // Clean up any existing code first
      const { data: existing } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (existing.record) await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: existing.record.id });

      await callFn("sendVerificationCode", { email: testEmail, name: "Test Guest", type: "guest" });
      await new Promise(r => setTimeout(r, 1000));

      const { data } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (!data.record) throw new Error("No code record created for guest type — sendVerificationCode may have failed silently");
      if (data.count !== 1) throw new Error(`Expected 1 record, found ${data.count}`);

      await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: data.record.id });
      return `Passed — guest type code created. Check Resend dashboard to confirm email says 'Thank you for creating your HostKeep account' not 'Founding Member'`;
    },
  },

  {
    id: "vf_b2_host_code_created",
    group: "verificationFlow",
    label: "Business — host/founding type creates code with founding member email",
    claudeHint: "Check base44/functions/sendVerificationCode/entry.ts — no type or type: 'host' must create a code and send the founding member email. Check Resend dashboard to confirm founding member language is used.",
    run: async () => {
      const testEmail = "hello@hostkeepdigital.co.uk";

      const { data: existing } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (existing.record) await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: existing.record.id });

      await callFn("sendVerificationCode", { email: testEmail, full_name: "Test Host" });
      await new Promise(r => setTimeout(r, 1000));

      const { data } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (!data.record) throw new Error("No code record created for host type");

      await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: data.record.id });
      return `Passed — host type code created. Check Resend dashboard to confirm founding member language is used`;
    },
  },

  {
    id: "vf_b3_guest_signup_to_signin",
    group: "verificationFlow",
    label: "Business — guest signs up, verifies email, and can sign in (end-to-end regression)",
    claudeHint: "This is the end-to-end regression for all three sign-up bugs. If any step fails: (1) customSignUp — check UserCredentials and User are created. (2) verifyEmailCode — check old codes are deleted not marked used, check records[0] returns the right code. (3) customSignIn — check email_verified: true was written by verifyEmailCode.",
    run: async () => {
      const testEmail = `test-guest-${Date.now()}@integration-hostkeep.test`;
      const testPassword = "TestPassword123!";
      let userId = null;
      let credId = null;

      try {
        // Step 1 — sign up
        const { status: signUpStatus, data: signUpData } = await callFn("customSignUp", {
          email: testEmail,
          password: testPassword,
          forename: "Integration",
          surname: "Test",
        });
        if (signUpStatus !== 200 || !signUpData.success) throw new Error(`customSignUp failed: ${JSON.stringify(signUpData)}`);

        await new Promise(r => setTimeout(r, 1000));

        // Step 2 — read the code from DB
        const { data: codeData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
        if (!codeData.record) throw new Error("No EmailVerificationCode found after customSignUp — sendVerificationCode may have failed silently inside customSignUp");
        const code = codeData.record.code;

        // Step 3 — verify the code
        const { data: verifyData } = await callFn("verifyEmailCode", { email: testEmail, code, type: "guest" });
        if (!verifyData.valid) throw new Error(`verifyEmailCode returned valid: false — code in DB was '${code}' but verification failed. Check if old codes are being deleted or if records[0] returns the wrong code.`);

        // Step 4 — sign in
        const { status: signInStatus, data: signInData } = await callFn("customSignIn", {
          email: testEmail,
          password: testPassword,
        });
        if (signInStatus !== 200 || !signInData.success) throw new Error(`customSignIn failed after successful verification: ${JSON.stringify(signInData)}. If error is email_not_verified, verifyEmailCode did not write email_verified: true to UserCredentials.`);
        if (!signInData.session_token) throw new Error("Sign in succeeded but no session_token returned");

        return `Passed — full guest flow: sign up → verify email → sign in with session_token`;
      } finally {
        // Cleanup all created records
        const { data: credData } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (credData.record) {
          credId = credData.record.id;
          userId = credData.record.user_id;
          await callFn("seedTestBooking", { action: "deleteUserCredentials", id: credId });
        }
        if (userId) await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        await callFn("seedTestBooking", { action: "deleteGuest", email: testEmail });
        const { data: roleData } = await callFn("seedTestBooking", { action: "readUserRole", user_id: userId || "none", role: "guest" });
        if (roleData?.userRole?.id) await callFn("seedTestBooking", { action: "deleteUserRole", id: roleData.userRole.id });
        const { data: codeClean } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
        if (codeClean.record) await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: codeClean.record.id });
      }
    },
  },

  {
    id: "vf_b4_resend_invalidates_old",
    group: "verificationFlow",
    label: "Business — resending code makes old code invalid, new code works",
    claudeHint: "Check base44/functions/sendVerificationCode/entry.ts — the resend path must delete the old code. Check base44/functions/verifyEmailCode/entry.ts — records[0] must be the new code not the old one. This is the direct regression test for bug 1.",
    run: async () => {
      const testEmail = "hello@hostkeepdigital.co.uk";

      // Clean slate
      const { data: existing } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (existing.record) await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: existing.record.id });

      // Send first code
      await callFn("sendVerificationCode", { email: testEmail, name: "Test", type: "guest" });
      await new Promise(r => setTimeout(r, 500));
      const { data: firstData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      const firstCode = firstData.record?.code;
      if (!firstCode) throw new Error("First code not found in DB");

      // Send second code (resend)
      await callFn("sendVerificationCode", { email: testEmail, name: "Test", type: "guest" });
      await new Promise(r => setTimeout(r, 500));
      const { data: secondData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      const secondCode = secondData.record?.code;
      if (!secondCode) throw new Error("Second code not found in DB");
      if (secondData.count !== 1) throw new Error(`Expected 1 code after resend, found ${secondData.count} — old code was not deleted`);

      // Try first code — should fail
      const { data: firstVerify } = await callFn("verifyEmailCode", { email: testEmail, code: firstCode });
      if (firstVerify.valid !== false) throw new Error(`Old code '${firstCode}' should be invalid after resend but returned valid: true`);

      // Try second code — should succeed
      const { data: secondVerify } = await callFn("verifyEmailCode", { email: testEmail, code: secondCode });
      if (!secondVerify.valid) throw new Error(`New code '${secondCode}' should be valid but returned valid: false`);

      // Cleanup any remaining
      const { data: finalClean } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (finalClean.record) await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: finalClean.record.id });

      return `Passed — old code rejected after resend, new code accepted`;
    },
  },

  // ── adminSetDocumentsVerified ─────────────────────────────────────────

  {
    id: "asdv_smoke_no_session",
    group: "adminSetDocumentsVerified",
    label: "Smoke — rejects request with no session token",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts has NO auth check — anyone can call it. This test will return 200 not 401 until session validation and admin role check are added. Fix: add session_token validation + admin role check at the top of the function.",
    run: async () => {
      const { status } = await callFn("adminSetDocumentsVerified", {
        user_id: "test_user_id",
        documents_verified: true,
      });
      if (status !== 401) throw new Error(`Expected 401, got ${status} — function ran without auth check (crashed on invalid user_id before returning, but auth was never checked)`);
      return "Passed — correctly returned 401 with no session";
    },
  },

  {
    id: "asdv_smoke_missing_user_id",
    group: "adminSetDocumentsVerified",
    label: "Smoke — returns 400 when user_id is absent",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — after adding auth, missing user_id must return 400 with { error: 'missing_user_id' }.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("adminSetDocumentsVerified", {
        session_token: sessionToken,
        documents_verified: true,
      });
      if (status !== 400) throw new Error(`Expected 400, got ${status}: ${JSON.stringify(data)}`);
      if (data.error !== "missing_user_id") throw new Error(`Expected missing_user_id, got: ${JSON.stringify(data)}`);
      return "Passed — missing user_id correctly returns 400";
    },
  },

  {
    id: "asdv_smoke_shape",
    group: "adminSetDocumentsVerified",
    label: "Smoke — function exists and returns correct shape",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — must return { success: true/false } for all outcomes.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { data } = await callFn("adminSetDocumentsVerified", {
        session_token: sessionToken,
        user_id: "000000000000000000000000",
        documents_verified: true,
      });
      if (typeof data.success === "undefined") throw new Error(`Response missing success field: ${JSON.stringify(data)}`);
      return `Passed — function reachable, shape correct`;
    },
  },

  {
    id: "asdv_func_sets_documents_verified",
    group: "adminSetDocumentsVerified",
    label: "Functional — sets documents_verified: true on User entity",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — must update User.documents_verified via serviceRole. Verify via seedTestBooking readUser that the User entity was updated.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-f1-${Date.now()}@integration.test`;

      const { data: userData } = await callFn("seedTestBooking", {
        action: "createUser",
        user: { email: testEmail, forename: "Test", surname: "User", documents_verified: false, stripe_verified: false, subscription_active: false },
      });
      const userId = userData?.id;
      if (!userId) throw new Error("Failed to create test user");

      const { data: credData } = await callFn("seedTestBooking", {
        action: "createUserCredentials",
        userCredentials: { email: testEmail, password_hash: "test_hash", user_id: userId, email_verified: true },
      });

      try {
        const { data } = await callFn("adminSetDocumentsVerified", {
          session_token: sessionToken,
          user_id: userId,
          documents_verified: true,
        });
        if (!data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);

        const { data: readData } = await callFn("seedTestBooking", { action: "readUser", id: userId });
        if (readData.user?.documents_verified !== true) throw new Error(`documents_verified not true on User — got: ${readData.user?.documents_verified}`);

        return `Passed — documents_verified: true confirmed on User entity`;
      } finally {
        await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        if (credData?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: credData.id });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId, title_prefix: "Documents" });
      }
    },
  },

  {
    id: "asdv_func_founding_member_not_written",
    group: "adminSetDocumentsVerified",
    label: "Functional — does not write documents_verified to FoundingMember (rule violation check)",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — the FoundingMember.documents_verified write must be REMOVED. Gate flags must never be stored on FoundingMember — this is a permanent project rule. Remove the FoundingMember filter and update block entirely.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-f2-${Date.now()}@integration.test`;

      const { data: userData } = await callFn("seedTestBooking", {
        action: "createUser",
        user: { email: testEmail, forename: "Test", surname: "User", documents_verified: false },
      });
      const userId = userData?.id;
      if (!userId) throw new Error("Failed to create test user");

      const { data: credData } = await callFn("seedTestBooking", {
        action: "createUserCredentials",
        userCredentials: { email: testEmail, password_hash: "test_hash", user_id: userId, email_verified: true },
      });

      try {
        await callFn("adminSetDocumentsVerified", {
          session_token: sessionToken,
          user_id: userId,
          documents_verified: true,
        });

        const { data: fmData } = await callFn("seedTestBooking", { action: "readFoundingMember", user_id: userId });
        if (fmData.record !== null) throw new Error(`FoundingMember record found with documents_verified data — this violates the project rule that gate flags must never be stored on FoundingMember`);

        return `Passed — no FoundingMember written to`;
      } finally {
        await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        if (credData?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: credData.id });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId, title_prefix: "Documents" });
      }
    },
  },

  {
    id: "asdv_func_approved_notification",
    group: "adminSetDocumentsVerified",
    label: "Functional — approval creates bell notification for host",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — documents_verified: true must call sendNotification for the host. Currently no sendNotification call exists in this function.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-f3-${Date.now()}@integration.test`;

      const { data: userData } = await callFn("seedTestBooking", {
        action: "createUser",
        user: { email: testEmail, forename: "Test", surname: "User", documents_verified: false, stripe_verified: false, subscription_active: false },
      });
      const userId = userData?.id;
      if (!userId) throw new Error("Failed to create test user");

      const { data: credData } = await callFn("seedTestBooking", {
        action: "createUserCredentials",
        userCredentials: { email: testEmail, password_hash: "test_hash", user_id: userId, email_verified: true },
      });

      try {
        const { data } = await callFn("adminSetDocumentsVerified", {
          session_token: sessionToken,
          user_id: userId,
          documents_verified: true,
        });
        if (!data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);

        await new Promise(r => setTimeout(r, 1000));

        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: userId });
        const notif = (notifData?.notifications || []).find(n =>
          n.title?.toLowerCase().includes("document") || n.title?.toLowerCase().includes("verified")
        );
        if (!notif) throw new Error("No approval notification found for host — add sendNotification call to adminSetDocumentsVerified");

        return `Passed — approval notification created with title: "${notif.title}"`;
      } finally {
        await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        if (credData?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: credData.id });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId, title_prefix: "Documents" });
      }
    },
  },

  {
    id: "asdv_func_rejected_notification",
    group: "adminSetDocumentsVerified",
    label: "Functional — rejection creates bell notification with reason for host",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — documents_verified: false must call sendNotification with rejection_reason in the body. Add rejection_reason and rejection_notes to the function signature and wire into notification body.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-f4-${Date.now()}@integration.test`;

      const { data: userData } = await callFn("seedTestBooking", {
        action: "createUser",
        user: { email: testEmail, forename: "Test", surname: "User", documents_verified: false },
      });
      const userId = userData?.id;
      if (!userId) throw new Error("Failed to create test user");

      const { data: credData } = await callFn("seedTestBooking", {
        action: "createUserCredentials",
        userCredentials: { email: testEmail, password_hash: "test_hash", user_id: userId, email_verified: true },
      });

      try {
        const { data } = await callFn("adminSetDocumentsVerified", {
          session_token: sessionToken,
          user_id: userId,
          documents_verified: false,
          rejection_reason: "image_unclear",
          rejection_notes: "The image was too dark to read clearly",
        });
        if (!data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);

        await new Promise(r => setTimeout(r, 1000));

        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: userId });
        const notif = (notifData?.notifications || []).find(n =>
          n.title?.toLowerCase().includes("document") || n.title?.toLowerCase().includes("not accepted") || n.title?.toLowerCase().includes("rejected")
        );
        if (!notif) throw new Error("No rejection notification found — add sendNotification call for the rejection path");
        const body = notif.body?.toLowerCase() || "";
        if (!body.includes("unclear") && !body.includes("image")) throw new Error(`Rejection reason not in notification body — got: "${notif.body}"`);

        return `Passed — rejection notification created with reason in body`;
      } finally {
        await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        if (credData?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: credData.id });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId, title_prefix: "Documents" });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId, title_prefix: "Your documents" });
      }
    },
  },

  {
    id: "asdv_biz_no_gates",
    group: "adminSetDocumentsVerified",
    label: "Business — approved with no other gates: notification mentions both Stripe and subscription",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — after setting documents_verified: true, read User.stripe_verified and User.subscription_active. Both false → notification body must mention both Stripe account and subscription still needed.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-b1-${Date.now()}@integration.test`;

      const { data: userData } = await callFn("seedTestBooking", {
        action: "createUser",
        user: { email: testEmail, forename: "Test", surname: "User", documents_verified: false, stripe_verified: false, subscription_active: false },
      });
      const userId = userData?.id;
      if (!userId) throw new Error("Failed to create test user");
      const { data: credData } = await callFn("seedTestBooking", {
        action: "createUserCredentials",
        userCredentials: { email: testEmail, password_hash: "test_hash", user_id: userId, email_verified: true },
      });

      try {
        await callFn("adminSetDocumentsVerified", { session_token: sessionToken, user_id: userId, documents_verified: true });
        await new Promise(r => setTimeout(r, 1000));

        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: userId });
        const notif = (notifData?.notifications || []).find(n => n.title?.toLowerCase().includes("document") || n.title?.toLowerCase().includes("verified"));
        if (!notif) throw new Error("No approval notification found");

        const body = notif.body?.toLowerCase() || "";
        if (!body.includes("stripe") && !body.includes("bank")) throw new Error(`Body should mention Stripe — got: "${notif.body}"`);
        if (!body.includes("subscription")) throw new Error(`Body should mention subscription — got: "${notif.body}"`);

        return `Passed — notification correctly mentions both Stripe and subscription needed`;
      } finally {
        await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        if (credData?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: credData.id });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId, title_prefix: "Documents" });
      }
    },
  },

  {
    id: "asdv_biz_stripe_done",
    group: "adminSetDocumentsVerified",
    label: "Business — approved with Stripe done: notification mentions subscription only",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — User.stripe_verified: true, subscription_active: false → notification must mention subscription only, must NOT mention Stripe.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-b2-${Date.now()}@integration.test`;

      const { data: userData } = await callFn("seedTestBooking", {
        action: "createUser",
        user: { email: testEmail, forename: "Test", surname: "User", documents_verified: false, stripe_verified: true, subscription_active: false },
      });
      const userId = userData?.id;
      if (!userId) throw new Error("Failed to create test user");
      const { data: credData } = await callFn("seedTestBooking", {
        action: "createUserCredentials",
        userCredentials: { email: testEmail, password_hash: "test_hash", user_id: userId, email_verified: true },
      });

      try {
        await callFn("adminSetDocumentsVerified", { session_token: sessionToken, user_id: userId, documents_verified: true });
        await new Promise(r => setTimeout(r, 1000));

        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: userId });
        const notif = (notifData?.notifications || []).find(n => n.title?.toLowerCase().includes("document") || n.title?.toLowerCase().includes("verified"));
        if (!notif) throw new Error("No approval notification found");

        const body = notif.body?.toLowerCase() || "";
        if (body.includes("stripe") || body.includes("bank account")) throw new Error(`Body mentions Stripe but Stripe is already done — got: "${notif.body}"`);
        if (!body.includes("subscription")) throw new Error(`Body should mention subscription — got: "${notif.body}"`);

        return `Passed — notification mentions subscription only`;
      } finally {
        await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        if (credData?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: credData.id });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId, title_prefix: "Documents" });
      }
    },
  },

  {
    id: "asdv_biz_subscription_done",
    group: "adminSetDocumentsVerified",
    label: "Business — approved with subscription done: notification mentions Stripe only",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — User.stripe_verified: false, subscription_active: true → notification must mention Stripe only, must NOT mention subscription.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-b3-${Date.now()}@integration.test`;

      const { data: userData } = await callFn("seedTestBooking", {
        action: "createUser",
        user: { email: testEmail, forename: "Test", surname: "User", documents_verified: false, stripe_verified: false, subscription_active: true },
      });
      const userId = userData?.id;
      if (!userId) throw new Error("Failed to create test user");
      const { data: credData } = await callFn("seedTestBooking", {
        action: "createUserCredentials",
        userCredentials: { email: testEmail, password_hash: "test_hash", user_id: userId, email_verified: true },
      });

      try {
        await callFn("adminSetDocumentsVerified", { session_token: sessionToken, user_id: userId, documents_verified: true });
        await new Promise(r => setTimeout(r, 1000));

        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: userId });
        const notif = (notifData?.notifications || []).find(n => n.title?.toLowerCase().includes("document") || n.title?.toLowerCase().includes("verified"));
        if (!notif) throw new Error("No approval notification found");

        const body = notif.body?.toLowerCase() || "";
        if (body.includes("subscription")) throw new Error(`Body mentions subscription but it is already done — got: "${notif.body}"`);
        if (!body.includes("stripe") && !body.includes("bank")) throw new Error(`Body should mention Stripe — got: "${notif.body}"`);

        return `Passed — notification mentions Stripe only`;
      } finally {
        await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        if (credData?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: credData.id });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId, title_prefix: "Documents" });
      }
    },
  },

  {
    id: "asdv_biz_all_gates",
    group: "adminSetDocumentsVerified",
    label: "Business — all gates open: documents confirmed sent first, congratulations sent second",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — when stripe_verified: true AND subscription_active: true AND documents now verified, send TWO notifications: documents confirmed first, then congratulations/publish notification. Order matters — documents must be sent before congratulations.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-b4-${Date.now()}@integration.test`;

      const { data: userData } = await callFn("seedTestBooking", {
        action: "createUser",
        user: { email: testEmail, forename: "Test", surname: "User", documents_verified: false, stripe_verified: true, subscription_active: true },
      });
      const userId = userData?.id;
      if (!userId) throw new Error("Failed to create test user");
      const { data: credData } = await callFn("seedTestBooking", {
        action: "createUserCredentials",
        userCredentials: { email: testEmail, password_hash: "test_hash", user_id: userId, email_verified: true },
      });

      try {
        const { data } = await callFn("adminSetDocumentsVerified", { session_token: sessionToken, user_id: userId, documents_verified: true });
        if (!data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);

        await new Promise(r => setTimeout(r, 1500));

        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: userId });
        const notifications = notifData?.notifications || [];

        const docsNotif = notifications.find(n =>
          n.title?.toLowerCase().includes("document") || n.title?.toLowerCase().includes("verified")
        );
        const congratsNotif = notifications.find(n =>
          n.title?.toLowerCase().includes("approved") || n.title?.toLowerCase().includes("publish") || n.title?.toLowerCase().includes("congratulations")
        );

        if (!docsNotif) throw new Error(`Documents verified notification not found — titles found: ${notifications.map(n => n.title).join(", ")}`);
        if (!congratsNotif) throw new Error(`Congratulations/publish notification not found — two notifications must be sent when all gates open`);

        const docsTime = new Date(docsNotif.created_date).getTime();
        const congratsTime = new Date(congratsNotif.created_date).getTime();
        if (docsTime > congratsTime) throw new Error("Documents notification must be created before congratulations notification");

        return `Passed — two notifications created in correct order: "${docsNotif.title}" then "${congratsNotif.title}"`;
      } finally {
        await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        if (credData?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: credData.id });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId, title_prefix: "Documents" });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId, title_prefix: "You're fully" });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId, title_prefix: "Congratulations" });
      }
    },
  },

  // ── processDepositRefunds ─────────────────────────────────────────────
  
  {
    id: "pdr_reachable",
    group: "processDepositRefunds",
    label: "Function executes and returns correct shape",
    claudeHint: "Check base44/functions/processDepositRefunds/entry.ts — must return { success, processed, skipped, errors, total }. If 500, check STRIPE_SECRET_KEY is set in Base44 Secrets.",
    run: async () => {
      const { status, data } = await callFn("processDepositRefunds");
      if (status !== 200) throw new Error(`Expected 200, got ${status}: ${data.error}`);
      if (data.success !== true) throw new Error(`Expected success: true, got: ${JSON.stringify(data)}`);
      if (typeof data.processed !== "number") throw new Error("Missing 'processed' field");
      if (typeof data.skipped !== "number") throw new Error("Missing 'skipped' field");
      if (typeof data.errors !== "number") throw new Error("Missing 'errors' field");
      return `Passed — processed: ${data.processed}, skipped: ${data.skipped}, errors: ${data.errors}, total: ${data.total}`;
    },
  },
 
  {
    id: "pdr_skips_frozen",
    group: "processDepositRefunds",
    label: "Skips deposit_frozen=true — frozen deposit not refunded",
    claudeHint: "Check processDepositRefunds/entry.ts — deposit_frozen check must skip before Stripe is called. If deposit_status becomes 'refunding', the frozen guard is missing.",
    run: async () => {
      const pastDate = new Date(Date.now() - 86400000 * 3).toISOString().split("T")[0];
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "Deposit Refund Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id", check_in: pastDate, check_out: pastDate,
          booking_status: "completed", deposit_status: "held", total_amount: 0,
          deposit_frozen: true, stripe_deposit_intent_id: "pi_regression_frozen_test",
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      await callFn("processDepositRefunds");
      await new Promise(r => setTimeout(r, 1000));

      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (readBack?.booking?.deposit_status !== "held")
        throw new Error(`Expected 'held', got '${readBack?.booking?.deposit_status}' — frozen guard is broken`);
      return `Passed — frozen booking skipped, deposit_status still 'held'`;
    },
  },
  {
    id: "pdr_skips_no_intent",
    group: "processDepositRefunds",
    label: "Skips bookings with no stripe_deposit_intent_id — no crash",
    claudeHint: "Check processDepositRefunds/entry.ts — missing stripe_deposit_intent_id must be caught and skipped. If function returns success: false, the null check is absent.",
    run: async () => {
      const pastDate = new Date(Date.now() - 86400000 * 3).toISOString().split("T")[0];
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "Deposit Refund Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id", check_in: pastDate, check_out: pastDate,
          booking_status: "completed", deposit_status: "held", total_amount: 0, deposit_frozen: false,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      const { status, data } = await callFn("processDepositRefunds");
      await new Promise(r => setTimeout(r, 1000));

      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (status !== 200 || data.success !== true) throw new Error(`Function crashed: ${data.error}`);
      if (readBack?.booking?.deposit_status !== "held")
        throw new Error(`Expected 'held', got '${readBack?.booking?.deposit_status}'`);
      return `Passed — missing intent skipped, function stayed success: true`;
    },
  },
  {
    id: "pdr_skips_future_checkout",
    group: "processDepositRefunds",
    label: "Skips bookings where 48h window has not passed",
    claudeHint: "Check processDepositRefunds/entry.ts — now < checkoutPlus48 must skip. If deposit_status becomes 'refunding', the time guard is wrong.",
    run: async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "Deposit Refund Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id", check_in: futureDate, check_out: futureDate,
          booking_status: "completed", deposit_status: "held", total_amount: 0,
          deposit_frozen: false, stripe_deposit_intent_id: "pi_regression_future_test",
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      await callFn("processDepositRefunds");
      await new Promise(r => setTimeout(r, 1000));

      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (readBack?.booking?.deposit_status !== "held")
        throw new Error(`Expected 'held', got '${readBack?.booking?.deposit_status}' — 48h time guard is broken`);
      return `Passed — future checkout skipped, deposit_status still 'held'`;
    },
  },
  {
    id: "pdr_eligible_errors_gracefully",
    group: "processDepositRefunds",
    label: "Eligible booking with invalid Stripe ID — errors gracefully, function does not crash",
    claudeHint: "Check processDepositRefunds/entry.ts — the per-booking try/catch must catch Stripe errors and increment errors without throwing. If success: false, the catch block is missing or re-throwing.",
    run: async () => {
      const pastDate = new Date(Date.now() - 86400000 * 3).toISOString().split("T")[0];
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "Deposit Refund Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id", check_in: pastDate, check_out: pastDate,
          booking_status: "completed", deposit_status: "held", total_amount: 0,
          deposit_frozen: false, stripe_deposit_intent_id: "pi_regression_fake_should_error",
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      const { status, data } = await callFn("processDepositRefunds");
      await new Promise(r => setTimeout(r, 1000));

      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (status !== 200 || data.success !== true)
        throw new Error(`Function crashed on Stripe error — per-booking catch is broken: ${data.error}`);
      return `Passed — fake intent errored gracefully. success: true, errors: ${data.errors}`;
    },
  },
// ── releaseRentalPayments — business scenario tests ───────────────────
  {
    id: "rrp_biz_deposit_only_not_released",
    group: "releaseRentalPayments",
    label: "Business: Deposit only paid — not released before 24h check-in window",
    claudeHint: "Check releaseRentalPayments/entry.ts — DB filter requires rental_payment_status: 'held'. A booking where only the security deposit has been paid (deposit_status: 'held', rental_payment_status: 'unpaid') must never be touched by this function.",
    run: async () => {
      const futureRelease = new Date(Date.now() + 86400000).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "RRP Deposit Only Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date().toISOString().split("T")[0],
          check_out: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
          booking_status: "checked_in",
          deposit_status: "held",
          rental_payment_status: "unpaid",
          rental_frozen: false,
          rental_release_due_at: futureRelease,
          subtotal: 700, cleaning_fee: 50, security_deposit: 200, total_amount: 950,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      await callFn("releaseRentalPayments");
      await new Promise(r => setTimeout(r, 1000));

      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (readBack?.booking?.deposit_status !== "held")
        throw new Error(`Security deposit should remain 'held', got '${readBack?.booking?.deposit_status}'`);
      if (readBack?.booking?.rental_payment_status !== "unpaid")
        throw new Error(`Rental status should remain 'unpaid', got '${readBack?.booking?.rental_payment_status}'`);
      return `Passed — deposit only booking ignored entirely, deposit_status 'held', rental_payment_status 'unpaid'`;
    },
  },
  {
    id: "rrp_biz_full_payment_not_released_before_24h",
    group: "releaseRentalPayments",
    label: "Business: Full payment held — not released before 24h check-in window elapses",
    claudeHint: "Check releaseRentalPayments/entry.ts — rental_release_due_at in the future must prevent release even when booking is checked_in and rental_payment_status is 'held'.",
    run: async () => {
      const futureRelease = new Date(Date.now() + 86400000).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "RRP Full Payment 24h Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date().toISOString().split("T")[0],
          check_out: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
          booking_status: "checked_in",
          rental_payment_status: "held",
          rental_frozen: false,
          rental_release_due_at: futureRelease,
          subtotal: 700, cleaning_fee: 50, total_amount: 750,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      await callFn("releaseRentalPayments");
      await new Promise(r => setTimeout(r, 1000));

      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (readBack?.booking?.rental_payment_status !== "held")
        throw new Error(`Full payment should remain 'held' before 24h window, got '${readBack?.booking?.rental_payment_status}'`);
      return `Passed — full payment held, 24h not elapsed, rental_payment_status still 'held'`;
    },
  },
  {
    id: "rrp_biz_deposit_and_full_not_released_before_24h",
    group: "releaseRentalPayments",
    label: "Business: Deposit + full payment held — neither released before 24h check-in window",
    claudeHint: "Check releaseRentalPayments/entry.ts — when both deposit_status and rental_payment_status are 'held', the rental release function must not touch either before rental_release_due_at has passed.",
    run: async () => {
      const futureRelease = new Date(Date.now() + 86400000).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "RRP Deposit And Full Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date().toISOString().split("T")[0],
          check_out: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
          booking_status: "checked_in",
          deposit_status: "held",
          rental_payment_status: "held",
          rental_frozen: false,
          rental_release_due_at: futureRelease,
          subtotal: 700, cleaning_fee: 50, security_deposit: 200, total_amount: 950,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      await callFn("releaseRentalPayments");
      await new Promise(r => setTimeout(r, 1000));

      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (readBack?.booking?.rental_payment_status !== "held")
        throw new Error(`Rental should remain 'held' before 24h window, got '${readBack?.booking?.rental_payment_status}'`);
      if (readBack?.booking?.deposit_status !== "held")
        throw new Error(`Deposit should remain 'held', got '${readBack?.booking?.deposit_status}'`);
      return `Passed — deposit 'held', rental 'held', 24h not elapsed, neither released`;
    },
  },
  {
    id: "rrp_biz_payment_eligible_after_24h",
    group: "releaseRentalPayments",
    label: "Business: Payment eligible for release after 24h check-in window — enters processing loop",
    claudeHint: "Check releaseRentalPayments/entry.ts — a booking with rental_release_due_at in the past, booking_status checked_in/completed, rental_payment_status 'held', rental_frozen false must enter the results array.",
    run: async () => {
      const pastRelease = new Date(Date.now() - 86400000 * 2).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "RRP Eligible After 24h Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() - 86400000 * 3).toISOString().split("T")[0],
          check_out: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
          booking_status: "completed",
          rental_payment_status: "held",
          rental_frozen: false,
          rental_release_due_at: pastRelease,
          subtotal: 700, cleaning_fee: 50, total_amount: 750,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      const { status, data } = await callFn("releaseRentalPayments");
      await new Promise(r => setTimeout(r, 1000));

      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (status !== 200) throw new Error(`Function crashed: ${data.error}`);
      const entry = data.results?.find(r => r.booking_id === bookingId);
      if (!entry) throw new Error(`Booking did not enter the processing loop — time guard did not open. results: ${JSON.stringify(data.results)}`);
      return `Passed — 24h window elapsed, booking entered processing loop (result: ${entry.status}, reason: ${entry.reason || "n/a"})`;
    },
  },

  // ── checkInBooking ────────────────────────────────────────────────────
  {
    id: "cib_smoke",
    group: "checkInBooking",
    label: "Smoke: Function executes and returns correct shape",
    claudeHint: "base44/functions/checkInBooking/entry.ts does not exist yet — this test is expected to fail until the function is built.",
    run: async () => {
      const { status, data } = await callFn("checkInBooking", {});
      if (typeof data.success === "undefined" || data.error === "unrecognised_function") throw new Error("Function not found — checkInBooking has not been built yet");
      return `Passed — function reachable, shape correct`;
    },
  },
  {
    id: "cib_sets_checked_in_status",
    group: "checkInBooking",
    label: "Functional: Logging check-in sets booking_status to checked_in",
    claudeHint: "base44/functions/checkInBooking/entry.ts — must update booking_status to 'checked_in' when called with a valid booking_id and check_in_time.",
    run: async () => {
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "CheckIn Status Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date().toISOString().split("T")[0],
          check_out: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
          booking_status: "confirmed",
          rental_payment_status: "held",
          total_amount: 750,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      const { status, data } = await callFn("checkInBooking", {
        booking_id: bookingId,
        check_in_time: new Date().toISOString(),
        notes: "Integration test check-in",
      });
      await new Promise(r => setTimeout(r, 1000));

      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (status !== 200 || !data.success) throw new Error(`checkInBooking failed: ${data.error}`);
      if (readBack?.booking?.booking_status !== "checked_in")
        throw new Error(`Expected booking_status 'checked_in', got '${readBack?.booking?.booking_status}'`);
      return `Passed — booking_status correctly set to 'checked_in'`;
    },
  },
  {
    id: "cib_sets_rental_release_due_at",
    group: "checkInBooking",
    label: "Functional: Logging check-in sets rental_release_due_at to 24h from check-in time",
    claudeHint: "base44/functions/checkInBooking/entry.ts — must set rental_release_due_at to check_in_time + 24 hours. If missing or wrong, releaseRentalPayments will never trigger correctly.",
    run: async () => {
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "CheckIn ReleaseDate Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date().toISOString().split("T")[0],
          check_out: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
          booking_status: "confirmed",
          rental_payment_status: "held",
          total_amount: 750,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      const checkInTime = new Date();
      const expectedRelease = new Date(checkInTime.getTime() + 86400000);

      const { status: cibStatus, data: cibData } = await callFn("checkInBooking", {
        booking_id: bookingId,
        check_in_time: checkInTime.toISOString(),
        notes: "Integration test check-in",
      });
      await new Promise(r => setTimeout(r, 1000));

      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (cibStatus !== 200 || !cibData.success) throw new Error(`checkInBooking must exist and succeed before this test is meaningful — got ${cibStatus}: ${JSON.stringify(cibData)}`);
      const actualRelease = new Date(readBack?.booking?.rental_release_due_at);
      const diffMs = Math.abs(actualRelease - expectedRelease);

      if (!readBack?.booking?.rental_release_due_at)
        throw new Error(`rental_release_due_at not set — checkInBooking must write this field`);
      if (diffMs > 60000)
        throw new Error(`rental_release_due_at is ${actualRelease.toISOString()}, expected ~${expectedRelease.toISOString()} (within 1 min tolerance)`);
      return `Passed — rental_release_due_at set to ${actualRelease.toISOString()} (~24h from check-in)`;
    },
  },
  {
    id: "cib_missing_booking_id",
    group: "checkInBooking",
    label: "Smoke: Missing booking_id returns error",
    claudeHint: "base44/functions/checkInBooking/entry.ts — missing booking_id must return error not crash.",
    run: async () => {
      const { status, data } = await callFn("checkInBooking", { check_in_time: new Date().toISOString() });
      if (typeof data.success === "undefined" || data.error === "unrecognised_function") throw new Error("Function not found — checkInBooking has not been built yet");
      if (status !== 400 && data.success !== false && !data.error)
        throw new Error(`Expected error response, got status ${status}: ${JSON.stringify(data)}`);
      return `Passed — missing booking_id correctly rejected`;
    },
  },

  // ── autoCheckIn ───────────────────────────────────────────────────────
  {
    id: "aci_smoke",
    group: "autoCheckIn",
    label: "Smoke: Function executes and returns correct shape",
    claudeHint: "base44/functions/autoCheckIn/entry.ts does not exist yet — this test is expected to fail until the function is built.",
    run: async () => {
      const { status, data } = await callFn("autoCheckIn", {});
      if (status === 404) throw new Error("Function not found — autoCheckIn has not been built yet");
      if (typeof data.processed !== "number") throw new Error("Missing 'processed' field");
      if (!Array.isArray(data.results)) throw new Error("Missing 'results' array");
      return `Passed — processed: ${data.processed}`;
    },
  },
  {
    id: "aci_advances_overdue_confirmed_booking",
    group: "autoCheckIn",
    label: "Functional: Confirmed booking past check-in date → advanced to checked_in with rental_release_due_at set",
    claudeHint: "base44/functions/autoCheckIn/entry.ts — must find bookings where booking_status='confirmed' and check_in date has passed, set booking_status='checked_in' and rental_release_due_at=now+24h.",
    run: async () => {
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "AutoCheckIn Overdue Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
          booking_status: "confirmed",
          rental_payment_status: "held",
          total_amount: 750,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      const { status, data } = await callFn("autoCheckIn");
      await new Promise(r => setTimeout(r, 1000));

      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (status !== 200) throw new Error(`autoCheckIn crashed: ${data.error}`);
      if (readBack?.booking?.booking_status !== "checked_in")
        throw new Error(`Expected 'checked_in', got '${readBack?.booking?.booking_status}' — auto check-in did not fire`);
      if (!readBack?.booking?.rental_release_due_at)
        throw new Error(`rental_release_due_at not set — autoCheckIn must write this field`);
      return `Passed — overdue confirmed booking advanced to checked_in, rental_release_due_at set`;
    },
  },
  {
    id: "aci_skips_future_check_in",
    group: "autoCheckIn",
    label: "Functional: Confirmed booking with future check-in date — not advanced",
    claudeHint: "base44/functions/autoCheckIn/entry.ts — must only advance bookings where check_in date has passed. Future check-in dates must be left in 'confirmed' status.",
    run: async () => {
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "AutoCheckIn Future Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 86400000 * 10).toISOString().split("T")[0],
          booking_status: "confirmed",
          rental_payment_status: "held",
          total_amount: 750,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      const { status, data } = await callFn("autoCheckIn");
      await new Promise(r => setTimeout(r, 1000));

      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (status !== 200 || typeof data.processed !== "number" || !Array.isArray(data.results)) throw new Error(`autoCheckIn must exist and return correct shape before this test is meaningful — got ${status}: ${JSON.stringify(data)}`);
      if (readBack?.booking?.booking_status !== "confirmed")
        throw new Error(`Expected 'confirmed', got '${readBack?.booking?.booking_status}' — future booking should not be advanced`);
      return `Passed — future check-in booking left in 'confirmed'`;
    },
  },
  {
    id: "aci_skips_already_checked_in",
    group: "autoCheckIn",
    label: "Functional: Already checked_in booking — not touched",
    claudeHint: "base44/functions/autoCheckIn/entry.ts — must only process bookings with booking_status='confirmed'. Already checked_in bookings must be skipped entirely.",
    run: async () => {
      const existingRelease = new Date(Date.now() + 86400000).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "AutoCheckIn AlreadyIn Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
          booking_status: "checked_in",
          rental_payment_status: "held",
          rental_release_due_at: existingRelease,
          total_amount: 750,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);

      const { status: aciStatus, data: aciData } = await callFn("autoCheckIn");
      await new Promise(r => setTimeout(r, 1000));

      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });

      if (aciStatus !== 200 || typeof aciData.processed !== "number" || !Array.isArray(aciData.results)) throw new Error(`autoCheckIn must exist and return correct shape before this test is meaningful — got ${aciStatus}: ${JSON.stringify(aciData)}`);
      if (readBack?.booking?.booking_status !== "checked_in")
        throw new Error(`booking_status changed unexpectedly to '${readBack?.booking?.booking_status}'`);
      const releaseUnchanged = readBack?.booking?.rental_release_due_at === existingRelease;
      if (!releaseUnchanged)
        throw new Error(`rental_release_due_at was overwritten — already checked_in bookings must not be touched`);
      return `Passed — already checked_in booking skipped, rental_release_due_at unchanged`;
    },
  },
];



const GROUPS = [...new Set(TESTS.map(t => t.group))];

const STATUS_ICON = {
  idle: null,
  running: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />,
  pass: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  fail: <XCircle className="w-4 h-4 text-red-500" />,
  skip: <CheckCircle2 className="w-4 h-4 text-gray-400" />,
};

function ClaudePromptPanel({ failedTests, copied, onCopy }) {
  const prompt = buildClaudePrompt(failedTests);
  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 space-y-4">
      <div>
        <p className="text-sm font-bold text-red-800">
          {failedTests.length} test{failedTests.length > 1 ? "s" : ""} failing — get Claude to fix these
        </p>
        <p className="text-xs text-red-600 mt-0.5">
          Copy the prompt below and paste it into this conversation.
        </p>
      </div>
      <div className="bg-white border border-red-200 rounded-lg p-3 max-h-48 overflow-y-auto">
        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{prompt}</pre>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCopy}
          className="flex-1 py-2.5 rounded-lg bg-[#1E3A5F] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors"
        >
          {copied ? "Copied!" : "Copy Prompt"}
        </button>
        <a
          href={"https://claude.ai/new?q=" + encodeURIComponent(prompt.slice(0, 2000))}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 rounded-lg border border-[#1E3A5F] text-[#1E3A5F] text-sm font-semibold hover:bg-blue-50 transition-colors text-center"
        >
          Open Claude
        </a>
      </div>
    </div>
  );
}

export default function IntegrationTestsTab({ sessionToken }) {
  const { user } = useAuth();
  const [results, setResults] = useState({});
  const [runningAll, setRunningAll] = useState(false);
  const [copied, setCopied] = useState(false);

  const setResult = (id, result) =>
    setResults(prev => ({ ...prev, [id]: result }));

  const runTest = async (test) => {
    setResult(test.id, {
      status: "running",
      message: "",
      group: test.group,
      label: test.label,
      claudeHint: test.claudeHint,
    });
    try {
      const message = await test.run(sessionToken, user);
      const isSkip = message?.startsWith("Skipped");
      setResult(test.id, {
        status: isSkip ? "skip" : "pass",
        message,
        group: test.group,
        label: test.label,
        claudeHint: test.claudeHint,
      });
    } catch (err) {
      setResult(test.id, {
        status: "fail",
        message: err.message,
        group: test.group,
        label: test.label,
        claudeHint: test.claudeHint,
      });
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    for (const test of TESTS) {
      await runTest(test);
    }
    setRunningAll(false);
  };

  const runGroup = async (group) => {
    const groupTests = TESTS.filter(t => t.group === group);
    for (const test of groupTests) {
      await runTest(test);
    }
  };

  const passed = Object.values(results).filter(r => r.status === "pass").length;
  const failed = Object.values(results).filter(r => r.status === "fail").length;
  const total = TESTS.length;
  const failedTests = Object.values(results).filter(r => r.status === "fail");

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Integration Tests</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Live tests against backend functions in this environment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {Object.keys(results).length > 0 && (
            <span className="text-sm text-gray-500">
              {passed} passed · {failed} failed · {total - passed - failed} remaining
            </span>
          )}
          <Button
            onClick={runAll}
            disabled={runningAll}
            className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white gap-2"
          >
            {runningAll ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
            ) : (
              <><PlayCircle className="w-4 h-4" /> Run All Tests</>
            )}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {Object.keys(results).length > 0 && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${(passed / total) * 100}%` }}
          />
        </div>
      )}

      {/* Test groups */}
      {GROUPS.map(group => {
        const groupTests = TESTS.filter(t => t.group === group);
        const groupPassed = groupTests.filter(t => results[t.id]?.status === "pass").length;
        const groupFailed = groupTests.filter(t => results[t.id]?.status === "fail").length;

        return (
          <div key={group} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900 font-mono text-sm">{group}</h3>
                {groupFailed > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                    {groupFailed} failing
                  </span>
                )}
                {groupFailed === 0 && groupPassed > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                    {groupPassed}/{groupTests.length} passing
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runGroup(group)}
                className="h-7 px-3 text-xs gap-1"
              >
                <Play className="w-3 h-3" /> Run group
              </Button>
            </div>

            <div className="divide-y divide-gray-50">
              {groupTests.map(test => {
                const result = results[test.id];
                return (
                  <div key={test.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="flex-shrink-0 mt-0.5">
                      {STATUS_ICON[result?.status || "idle"] || (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium">{test.label}</p>
                      {result?.message && (
                        <p className={`text-xs mt-1 font-mono ${
                          result.status === "pass" ? "text-green-600" :
                          result.status === "fail" ? "text-red-600" :
                          "text-gray-400"
                        }`}>
                          {result.message}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runTest(test)}
                      disabled={result?.status === "running"}
                      className="h-7 px-3 text-xs flex-shrink-0"
                    >
                      {result?.status === "running" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : "Run"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Claude prompt panel — shown when there are failures */}
      {failedTests.length > 0 && (
        <ClaudePromptPanel
          failedTests={failedTests}
          copied={copied}
          onCopy={() => {
            const prompt = buildClaudePrompt(failedTests);
            navigator.clipboard.writeText(prompt).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
        />
      )}

      <p className="text-xs text-gray-400 text-center">
        Tests run against live functions in this environment. No production data is modified.
      </p>
    </div>
  );
}
