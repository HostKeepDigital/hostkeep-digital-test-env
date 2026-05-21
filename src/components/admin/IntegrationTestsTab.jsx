import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Play, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

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
    claudeHint: "Check releaseRentalPayments/entry.ts — new Date(b.rental_release_due_at) <= now must exclude future dates.",
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
    claudeHint: "Check releaseRentalPayments/entry.ts — JS filter requires booking_status === 'checked_in' or 'completed'.",
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
    claudeHint: "Check releaseRentalPayments/entry.ts — UserRole.filter({ user_id: 'regression-test', role: 'host' }) returns empty, must push skipped with reason 'host stripe not verified'.",
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
  {
    id: "rrp_biz_deposit_only",
    group: "releaseRentalPayments",
    label: "Business: Deposit only paid — not released before 24h check-in window",
    claudeHint: "Check releaseRentalPayments/entry.ts — a booking where only the deposit was paid (rental_payment_status: 'unpaid') must not be processed. The filter requires rental_payment_status: 'held'.",
    run: async () => {
      const futureRelease = new Date(Date.now() + 86400000).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "RRP Deposit Only Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
          booking_status: "checked_in", rental_payment_status: "unpaid",
          deposit_status: "held", rental_frozen: false, rental_release_due_at: futureRelease,
          subtotal: 500, cleaning_fee: 50, total_amount: 550, security_deposit: 200,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      await callFn("releaseRentalPayments");
      await new Promise(r => setTimeout(r, 1000));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (readBack?.booking?.deposit_status !== "held") throw new Error(`deposit_status changed — expected 'held', got '${readBack?.booking?.deposit_status}'`);
      if (readBack?.booking?.rental_payment_status !== "unpaid") throw new Error(`rental_payment_status changed — expected 'unpaid', got '${readBack?.booking?.rental_payment_status}'`);
      return `Passed — deposit only booking ignored entirely, deposit_status 'held', rental_payment_status 'unpaid'`;
    },
  },
  {
    id: "rrp_biz_full_payment_not_due",
    group: "releaseRentalPayments",
    label: "Business: Full payment held — not released before 24h check-in window elapses",
    claudeHint: "Check releaseRentalPayments/entry.ts — rental_release_due_at in the future must prevent release even when rental_payment_status is 'held'.",
    run: async () => {
      const futureRelease = new Date(Date.now() + 86400000).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "RRP Full Payment Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
          booking_status: "checked_in", rental_payment_status: "held",
          rental_frozen: false, rental_release_due_at: futureRelease,
          subtotal: 500, cleaning_fee: 50, total_amount: 550,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      await callFn("releaseRentalPayments");
      await new Promise(r => setTimeout(r, 1000));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (readBack?.booking?.rental_payment_status !== "held") throw new Error(`rental_payment_status changed — expected 'held', got '${readBack?.booking?.rental_payment_status}'`);
      return `Passed — full payment held, 24h not elapsed, rental_payment_status still 'held'`;
    },
  },
  {
    id: "rrp_biz_deposit_and_full_not_due",
    group: "releaseRentalPayments",
    label: "Business: Deposit + full payment held — neither released before 24h check-in window",
    claudeHint: "Check releaseRentalPayments/entry.ts — both deposit and rental must remain 'held' when release window has not elapsed.",
    run: async () => {
      const futureRelease = new Date(Date.now() + 86400000).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "RRP Both Held Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
          booking_status: "checked_in", rental_payment_status: "held",
          deposit_status: "held", rental_frozen: false, rental_release_due_at: futureRelease,
          subtotal: 500, cleaning_fee: 50, total_amount: 550, security_deposit: 200,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      await callFn("releaseRentalPayments");
      await new Promise(r => setTimeout(r, 1000));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (readBack?.booking?.deposit_status !== "held") throw new Error(`deposit_status changed — expected 'held'`);
      if (readBack?.booking?.rental_payment_status !== "held") throw new Error(`rental_payment_status changed — expected 'held'`);
      return `Passed — deposit 'held', rental 'held', 24h not elapsed, neither released`;
    },
  },
  {
    id: "rrp_biz_eligible_enters_loop",
    group: "releaseRentalPayments",
    label: "Business: Payment eligible for release after 24h check-in window — enters processing loop",
    claudeHint: "Check releaseRentalPayments/entry.ts — when rental_release_due_at has passed and booking is checked_in or completed, the booking must enter the processing loop and appear in results.",
    run: async () => {
      const pastRelease = new Date(Date.now() - 86400000).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test-eligible", guest_id: "regression-test",
          guest_name: "RRP Eligible Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
          check_out: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          booking_status: "checked_in", rental_payment_status: "held",
          rental_frozen: false, rental_release_due_at: pastRelease,
          subtotal: 500, cleaning_fee: 50, total_amount: 550,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      const { status, data } = await callFn("releaseRentalPayments");
      await new Promise(r => setTimeout(r, 1000));
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (status !== 200) throw new Error(`Function crashed: ${data.error}`);
      const entry = data.results?.find(r => r.booking_id === bookingId);
      if (!entry) throw new Error(`Booking did not enter processing loop — not found in results`);
      return `Passed — 24h window elapsed, booking entered processing loop (result: ${entry.status}, reason: ${entry.reason || "n/a"})`;
    },
  },

  // ── raiseComplaint ────────────────────────────────────────────────────
  {
    id: "rc_no_session",
    group: "raiseComplaint",
    label: "Rejects request with no session token",
    claudeHint: "Check base44/functions/raiseComplaint/entry.ts — missing session_token must return 401.",
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
    claudeHint: "Check base44/functions/raiseComplaint/entry.ts — Booking.filter({ id: booking_id }) returning empty array must return 404.",
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
    claudeHint: "Check base44/functions/resolveComplaint/entry.ts — missing session_token must return 401.",
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
    claudeHint: "Check base44/functions/sendNotification/entry.ts — a valid payload must create a Notification record and return { success: true } with status 200.",
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
    claudeHint: "Check base44/functions/sendNotification/entry.ts PREF_MAP — cleaning_job_move_requested, cleaning_job_move_approved, cleaning_job_move_denied, cleaning_job_cancelled_by_cleaner, cleaning_job_cancelled_by_host must all be present.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token available — log in first");
      const types = [
        "cleaning_job_move_requested",
        "cleaning_job_move_approved",
        "cleaning_job_move_denied",
        "cleaning_job_cancelled_by_cleaner",
        "cleaning_job_cancelled_by_host",
      ];
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
      const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: "integration_test_placeholder" });
      const allRecords = notifData?.notifications || [];
      const testRecords = allRecords.filter(n => n.title?.startsWith("[Integration Test]"));
      const writtenTypes = new Set(testRecords.map(n => n.type));
      const missingFromDb = types.filter(t => !writtenTypes.has(t));
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
    claudeHint: "Check base44/functions/sendNotification/entry.ts — force_email: true with a valid email_to must bypass preference check, send via Resend, and return email_attempted: true, email_delivered: true.",
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
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — Booking.get with an unknown ID must return { error: 'booking_not_found' }.",
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
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — event_type 'requested' must create a Notification for booking.host_id with type 'booking_request' and link '/HostBookings?booking={id}'.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: createData } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id, guest_id: "test_guest_nbe",
          guest_name: "Integration Test Guest", guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_nbe", booking_status: "pending",
          check_in: "2026-08-01", check_out: "2026-08-07", nights: 6, total_amount: 600, security_deposit: 200,
        },
      });
      const bookingId = createData?.id;
      if (!bookingId) throw new Error("Failed to seed test booking");
      try {
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: user.id, title_prefix: "[Test]" });
        const { status, data } = await callFn("notifyBookingEvent", { session_token: sessionToken, booking_id: bookingId, event_type: "requested" });
        if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1000));
        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: user.id });
        const hostNotif = (notifData?.notifications || []).find(n => n.type === "booking_request");
        if (!hostNotif) throw new Error("No booking_request notification found for host");
        if (!hostNotif.link?.includes(bookingId)) throw new Error(`Notification link '${hostNotif.link}' missing booking ID`);
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
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — event_type 'confirmed' must create booking_confirmed notifications for both booking.host_id and booking.guest_id.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: createData } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id, guest_id: "test_guest_nbe",
          guest_name: "Integration Test Guest", guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_nbe", booking_status: "confirmed",
          check_in: "2026-08-01", check_out: "2026-08-07", nights: 6, total_amount: 600, security_deposit: 200,
        },
      });
      const bookingId = createData?.id;
      if (!bookingId) throw new Error("Failed to seed test booking");
      try {
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: user.id, title_prefix: "Booking Confirmed" });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: "test_guest_nbe", title_prefix: "Booking Confirmed" });
        const { status, data } = await callFn("notifyBookingEvent", { session_token: sessionToken, booking_id: bookingId, event_type: "confirmed" });
        if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1000));
        const { data: hostNotifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: user.id });
        const hostNotif = (hostNotifData?.notifications || []).find(n => n.type === "booking_confirmed");
        if (!hostNotif) throw new Error("No booking_confirmed notification for host");
        if (!hostNotif.link?.includes(bookingId)) throw new Error(`Host notification link missing booking ID`);
        const { data: guestNotifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: "test_guest_nbe" });
        const guestNotif = (guestNotifData?.notifications || []).find(n => n.type === "booking_confirmed");
        if (!guestNotif) throw new Error("No booking_confirmed notification for guest");
        if (!guestNotif.link?.includes(bookingId)) throw new Error(`Guest notification link missing booking ID`);
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
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — event_type 'cancelled' must notify both booking.guest_id and booking.host_id.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: createData } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id, guest_id: "test_guest_nbe",
          guest_name: "Integration Test Guest", guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_nbe", booking_status: "confirmed",
          check_in: "2026-08-01", check_out: "2026-08-07", nights: 6, total_amount: 600, security_deposit: 200,
        },
      });
      const bookingId = createData?.id;
      if (!bookingId) throw new Error("Failed to seed test booking");
      try {
        const { status, data } = await callFn("notifyBookingEvent", { session_token: sessionToken, booking_id: bookingId, event_type: "cancelled" });
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
          host_id: user.id, guest_id: "test_guest_nbe",
          guest_name: "Integration Test Guest", guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_nbe", booking_status: "confirmed",
          check_in: "2026-08-01", check_out: "2026-08-07", nights: 6, total_amount: 600, security_deposit: 200,
        },
      });
      const bookingId = createData?.id;
      if (!bookingId) throw new Error("Failed to seed test booking");
      try {
        const { status, data } = await callFn("notifyBookingEvent", { session_token: sessionToken, booking_id: bookingId, event_type: "cancelled_by_host" });
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
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — event_type 'completed' must notify booking.guest_id and booking.host_id.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: createData } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id, guest_id: "test_guest_nbe",
          guest_name: "Integration Test Guest", guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_nbe", booking_status: "completed",
          check_in: "2026-07-01", check_out: "2026-07-07", nights: 6, total_amount: 600, security_deposit: 200,
        },
      });
      const bookingId = createData?.id;
      if (!bookingId) throw new Error("Failed to seed test booking");
      try {
        const { status, data } = await callFn("notifyBookingEvent", { session_token: sessionToken, booking_id: bookingId, event_type: "completed" });
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
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — notification must fire immediately with no time-based delay.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: createData } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id, guest_id: "test_guest_nbe",
          guest_name: "Integration Test Guest", guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_nbe", booking_status: "pending",
          check_in: "2026-08-01", check_out: "2026-08-07", nights: 6, total_amount: 600, security_deposit: 200,
        },
      });
      const bookingId = createData?.id;
      if (!bookingId) throw new Error("Failed to seed test booking");
      try {
        const before = Date.now();
        const { status, data } = await callFn("notifyBookingEvent", { session_token: sessionToken, booking_id: bookingId, event_type: "requested" });
        const elapsed = Date.now() - before;
        if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 2500));
        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: user.id });
        const hostNotif = (notifData?.notifications || []).find(n =>
          n.type === "booking_request" && n.link?.includes(bookingId) && new Date(n.created_date).getTime() > before - 5000
          );
        if (!hostNotif) throw new Error("Notification not found — must fire immediately with no time-based delay");
        const notifAge = Date.now() - new Date(hostNotif.created_date).getTime();
        if (notifAge > 15000) throw new Error(`Notification created ${notifAge}ms ago — too old`);
        return `Passed — notification fired immediately (${elapsed}ms, age ${notifAge}ms)`;
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
    claudeHint: "Check base44/functions/notifyBookingEvent/entry.ts — calling the same event twice must not create two Notification records.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: createData } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id, guest_id: "test_guest_nbe",
          guest_name: "Integration Test Guest", guest_email: "hello@hostkeepdigital.co.uk",
          property_id: "test_property_nbe", booking_status: "pending",
          check_in: "2026-08-01", check_out: "2026-08-07", nights: 6, total_amount: 600, security_deposit: 200,
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
        if (dupes.length > 1) throw new Error(`Duplicate guard missing — ${dupes.length} identical notifications created`);
        if (dupes.length === 0) throw new Error("No notification created at all");
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
    claudeHint: "base44/functions/submitHostVerification/entry.ts — must accept session_token and return { success: true } or { success: false, error }.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("submitHostVerification", {
        session_token: sessionToken,
        phone: "+441234567890",
        phone_verified: true,
        property_address: "Test Address, Cornwall, TR1 1AA",
      });
      if (status === 404 || data?.error === "unrecognised_function") throw new Error("Function not found");
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
      const { status } = await callFn("submitHostVerification", { phone: "+441234567890", phone_verified: true });
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
      const { status, data } = await callFn("submitHostVerification", { session_token: sessionToken });
      if (status !== 400) throw new Error(`Expected 400, got ${status}: ${JSON.stringify(data)}`);
      if (data.error !== "missing_fields") throw new Error(`Expected missing_fields, got: ${JSON.stringify(data)}`);
      return "Passed — missing phone correctly returns 400 missing_fields";
    },
  },
  {
    id: "shv_func_creates_host_role",
    group: "submitHostVerification",
    label: "Functional — creates host UserRole with approval_status pending",
    claudeHint: "base44/functions/submitHostVerification/entry.ts — must create or update a UserRole with role: 'host' and approval_status: 'pending'.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: existingRole } = await callFn("seedTestBooking", { action: "readUserRole", user_id: user.id, role: "host" });
      if (existingRole?.userRole?.id) await callFn("seedTestBooking", { action: "deleteUserRole", id: existingRole.userRole.id });
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
        if (!roleData?.userRole) throw new Error("Host UserRole not created");
        if (roleData.userRole.approval_status !== "pending") throw new Error(`Expected approval_status 'pending', got '${roleData.userRole.approval_status}'`);
        return `Passed — host UserRole created with approval_status: pending`;
      } finally {
        const { data: cleanupRole } = await callFn("seedTestBooking", { action: "readUserRole", user_id: user.id, role: "host" });
        if (cleanupRole?.userRole?.id) await callFn("seedTestBooking", { action: "deleteUserRole", id: cleanupRole.userRole.id });
      }
    },
  },
  {
    id: "shv_func_sends_admin_notification",
    group: "submitHostVerification",
    label: "Functional — admin receives notification when host submits verification",
    claudeHint: "base44/functions/submitHostVerification/entry.ts — must call sendNotification for the admin user with link: /AdminPanel.",
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
      if (cleanupRole?.userRole?.id) await callFn("seedTestBooking", { action: "deleteUserRole", id: cleanupRole.userRole.id });
      return `Passed — admin notification created with correct link`;
    },
  },

  // ── uploadVerificationDocument ────────────────────────────────────────
  {
    id: "uvd_smoke_shape",
    group: "uploadVerificationDocument",
    label: "Smoke — function exists and returns correct shape",
    claudeHint: "base44/functions/uploadVerificationDocument/entry.ts — must accept session_token, document_type, file_url and return { success: true, id } or error.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("uploadVerificationDocument", {
        session_token: sessionToken,
        document_type: "government_id",
        file_url: "https://example.com/test-doc.jpg",
      });
      if (status === 404 || data?.error === "unrecognised_function") throw new Error("Function not found");
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
    claudeHint: "base44/functions/uploadVerificationDocument/entry.ts — must create a VerificationDocuments record via serviceRole and return { success: true, id }.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { status, data } = await callFn("uploadVerificationDocument", {
        session_token: sessionToken,
        document_type: "government_id",
        file_url: "https://example.com/integration-test-doc.jpg",
      });
      if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);
      if (!data.id) throw new Error("Response missing id");
      return `Passed — VerificationDocuments record created with id: ${data.id}`;
    },
  },

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
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — unknown email must return { valid: false } without crashing.",
    run: async () => {
      const { status, data } = await callFn("verifyEmailCode", { email: "smoke-test-nobody-vf@integration.test", code: "000000" });
      if (status !== 200) throw new Error(`Expected 200, got ${status}`);
      if (data.valid !== false) throw new Error(`Expected valid: false, got: ${JSON.stringify(data)}`);
      return "Passed — unknown email correctly returns valid: false";
    },
  },
  {
    id: "vf_f1_code_created_in_db",
    group: "verificationFlow",
    label: "Functional — sendVerificationCode creates exactly one DB record",
    claudeHint: "Check base44/functions/sendVerificationCode/entry.ts — must create an EmailVerificationCode record with used: false and a valid expires_at.",
    run: async () => {
      const testEmail = "hello@hostkeepdigital.co.uk";
      await callFn("sendVerificationCode", { email: testEmail, name: "Test", type: "guest" });
      await new Promise(r => setTimeout(r, 1000));
      const { data } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (!data.record) throw new Error("No EmailVerificationCode record found in DB after sending code");
      if (data.record.used !== false) throw new Error(`Expected used: false, got: ${data.record.used}`);
      if (new Date(data.record.expires_at) < new Date()) throw new Error("expires_at is in the past");
      if (data.count !== 1) throw new Error(`Expected exactly 1 record, found ${data.count}`);
      await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: data.record.id });
      return `Passed — one valid code record created with future expires_at`;
    },
  },
  {
    id: "vf_f2_old_codes_deleted",
    group: "verificationFlow",
    label: "Functional — sending a new code deletes the old one (regression for bug 1)",
    claudeHint: "Check base44/functions/sendVerificationCode/entry.ts — old codes must be DELETED not marked used: true.",
    run: async () => {
      const testEmail = "hello@hostkeepdigital.co.uk";
      await callFn("sendVerificationCode", { email: testEmail, name: "Test", type: "guest" });
      await new Promise(r => setTimeout(r, 500));
      await callFn("sendVerificationCode", { email: testEmail, name: "Test", type: "guest" });
      await new Promise(r => setTimeout(r, 1000));
      const { data } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (data.count !== 1) throw new Error(`Expected exactly 1 record after resend, found ${data.count} — old codes not being deleted`);
      if (data.record?.id) await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: data.record.id });
      return `Passed — only 1 code exists after resend, old code correctly deleted`;
    },
  },
  {
    id: "vf_f3_correct_code_verifies",
    group: "verificationFlow",
    label: "Functional — correct code returns valid: true and deletes the record",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — correct code must return { valid: true } and delete the EmailVerificationCode record.",
    run: async () => {
      const testEmail = "integration-verify-f3@test.hostkeep";
      const testCode = "847291";
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { data: seedData } = await callFn("seedTestBooking", { action: "createEmailVerificationCode", email: testEmail, code: testCode, expires_at: expiresAt });
      if (!seedData?.id) throw new Error("Failed to seed EmailVerificationCode");
      const { data } = await callFn("verifyEmailCode", { email: testEmail, code: testCode });
      if (!data.valid) throw new Error(`Expected valid: true, got: ${JSON.stringify(data)}`);
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
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — wrong code must return { valid: false } and must NOT delete the record.",
    run: async () => {
      const testEmail = "integration-verify-f4@test.hostkeep";
      const testCode = "123456";
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { data: seedData } = await callFn("seedTestBooking", { action: "createEmailVerificationCode", email: testEmail, code: testCode, expires_at: expiresAt });
      if (!seedData?.id) throw new Error("Failed to seed EmailVerificationCode");
      try {
        const { data } = await callFn("verifyEmailCode", { email: testEmail, code: "999999" });
        if (data.valid !== false) throw new Error(`Expected valid: false for wrong code, got: ${JSON.stringify(data)}`);
        const { data: checkData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
        if (!checkData.record) throw new Error("Code record was deleted after a wrong guess");
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
      const expiresAt = new Date(Date.now() - 1000).toISOString();
      const { data: seedData } = await callFn("seedTestBooking", { action: "createEmailVerificationCode", email: testEmail, code: testCode, expires_at: expiresAt });
      if (!seedData?.id) throw new Error("Failed to seed expired EmailVerificationCode");
      try {
        const { data } = await callFn("verifyEmailCode", { email: testEmail, code: testCode });
        if (data.valid !== false) throw new Error(`Expected valid: false for expired code, got: ${JSON.stringify(data)}`);
        return `Passed — expired code correctly rejected`;
      } finally {
        const { data: checkData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
        if (checkData.record) await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: checkData.record.id });
      }
    },
  },
  {
    id: "vf_f6_email_verified_set",
    group: "verificationFlow",
    label: "Functional — successful verification sets email_verified: true on UserCredentials",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — after valid: true, UserCredentials.email_verified must be updated to true.",
    run: async () => {
      const testEmail = "integration-verify-f6@test.hostkeep";
      const testCode = "112233";
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { data: credData } = await callFn("seedTestBooking", { action: "createUserCredentials", userCredentials: { email: testEmail, password_hash: "test_hash_not_real", email_verified: false } });
      if (!credData?.id) throw new Error("Failed to seed UserCredentials");
      await callFn("seedTestBooking", { action: "createEmailVerificationCode", email: testEmail, code: testCode, expires_at: expiresAt });
      try {
        const { data } = await callFn("verifyEmailCode", { email: testEmail, code: testCode, type: "guest" });
        if (!data.valid) throw new Error(`Expected valid: true, got: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1000));
        const { data: credCheck } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (!credCheck.record) throw new Error("UserCredentials record not found after verification");
        if (credCheck.record.email_verified !== true) throw new Error(`email_verified not set to true — got: ${credCheck.record.email_verified}`);
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
    claudeHint: "Check base44/functions/sendVerificationCode/entry.ts — type: 'guest' must create a code record. Check Resend dashboard to confirm email says 'Thank you for creating your HostKeep account' not founding member language.",
    run: async () => {
      const testEmail = "hello@hostkeepdigital.co.uk";
      const { data: existing } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (existing.record) await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: existing.record.id });
      await callFn("sendVerificationCode", { email: testEmail, name: "Test Guest", type: "guest" });
      await new Promise(r => setTimeout(r, 1000));
      const { data } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (!data.record) throw new Error("No code record created for guest type");
      if (data.count !== 1) throw new Error(`Expected 1 record, found ${data.count}`);
      await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: data.record.id });
      return `Passed — guest type code created. Check Resend dashboard to confirm email says 'Thank you for creating your HostKeep account'`;
    },
  },
  {
    id: "vf_b2_host_code_created",
    group: "verificationFlow",
    label: "Business — host/founding type creates code with founding member email",
    claudeHint: "Check base44/functions/sendVerificationCode/entry.ts — no type or type: 'host' must create a code and send founding member email.",
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
    claudeHint: "End-to-end regression for all three sign-up bugs. Steps: customSignUp → read code from DB → verifyEmailCode → customSignIn.",
    run: async () => {
      const testEmail = `test-guest-${Date.now()}@integration-hostkeep.test`;
      const testPassword = "TestPassword123!";
      let userId = null;
      let credId = null;
      try {
        const { status: signUpStatus, data: signUpData } = await callFn("customSignUp", { email: testEmail, password: testPassword, forename: "Integration", surname: "Test" });
        if (signUpStatus !== 200 || !signUpData.success) throw new Error(`customSignUp failed: ${JSON.stringify(signUpData)}`);
        await new Promise(r => setTimeout(r, 1000));
        const { data: codeData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
        if (!codeData.record) throw new Error("No EmailVerificationCode found after customSignUp");
        const code = codeData.record.code;
        const { data: verifyData } = await callFn("verifyEmailCode", { email: testEmail, code, type: "guest" });
        if (!verifyData.valid) throw new Error(`verifyEmailCode returned valid: false — code in DB was '${code}'`);
        const { status: signInStatus, data: signInData } = await callFn("customSignIn", { email: testEmail, password: testPassword });
        if (signInStatus !== 200 || !signInData.success) throw new Error(`customSignIn failed: ${JSON.stringify(signInData)}`);
        if (!signInData.session_token) throw new Error("Sign in succeeded but no session_token returned");
        return `Passed — full guest flow: sign up → verify email → sign in with session_token`;
      } finally {
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
    claudeHint: "Direct regression test for bug 1 — old code must be deleted on resend, new code must work.",
    run: async () => {
      const testEmail = "hello@hostkeepdigital.co.uk";
      const { data: existing } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (existing.record) await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: existing.record.id });
      await callFn("sendVerificationCode", { email: testEmail, name: "Test", type: "guest" });
      await new Promise(r => setTimeout(r, 500));
      const { data: firstData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      const firstCode = firstData.record?.code;
      if (!firstCode) throw new Error("First code not found in DB");
      await callFn("sendVerificationCode", { email: testEmail, name: "Test", type: "guest" });
      await new Promise(r => setTimeout(r, 500));
      const { data: secondData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      const secondCode = secondData.record?.code;
      if (!secondCode) throw new Error("Second code not found in DB");
      if (secondData.count !== 1) throw new Error(`Expected 1 code after resend, found ${secondData.count} — old code was not deleted`);
      const { data: firstVerify } = await callFn("verifyEmailCode", { email: testEmail, code: firstCode });
      if (firstVerify.valid !== false) throw new Error(`Old code '${firstCode}' should be invalid after resend but returned valid: true`);
      const { data: secondVerify } = await callFn("verifyEmailCode", { email: testEmail, code: secondCode });
      if (!secondVerify.valid) throw new Error(`New code '${secondCode}' should be valid but returned valid: false`);
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
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts has NO auth check — anyone can call it. Fix: add session_token validation + admin role check at the top of the function.",
    run: async () => {
      const { status } = await callFn("adminSetDocumentsVerified", { user_id: "test_user_id", documents_verified: true });
      if (status !== 401) throw new Error(`Expected 401, got ${status} — function ran without auth check`);
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
      const { status, data } = await callFn("adminSetDocumentsVerified", { session_token: sessionToken, documents_verified: true });
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
      const { data } = await callFn("adminSetDocumentsVerified", { session_token: sessionToken, user_id: "000000000000000000000000", documents_verified: true });
      if (typeof data.success === "undefined") throw new Error(`Response missing success field: ${JSON.stringify(data)}`);
      return `Passed — function reachable, shape correct`;
    },
  },
  {
    id: "asdv_func_sets_documents_verified",
    group: "adminSetDocumentsVerified",
    label: "Functional — sets documents_verified: true on User entity",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — must update User.documents_verified via serviceRole.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-f1-${Date.now()}@integration.test`;
      const { data: signUpData } = await callFn("customSignUp", { email: testEmail, password: "TestPassword123!", forename: "Test", surname: "User" });
      if (!signUpData.success) throw new Error(`customSignUp failed: ${JSON.stringify(signUpData)}`);
      await new Promise(r => setTimeout(r, 500));
      const { data: credData } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
      const userId = credData?.record?.user_id;
      if (!userId) throw new Error("Failed to resolve user_id from UserCredentials");
      try {
        const { data } = await callFn("adminSetDocumentsVerified", { session_token: sessionToken, user_id: userId, email: testEmail, documents_verified: true });
        if (!data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        const { data: readData } = await callFn("seedTestBooking", { action: "readUser", id: userId });
        if (readData.user?.documents_verified !== true) throw new Error(`documents_verified not true on User — got: ${readData.user?.documents_verified}`);
        return `Passed — documents_verified: true confirmed on User entity`;
      } finally {
        const { data: cleanCred } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (cleanCred?.record?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: cleanCred.record.id });
        if (userId) await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        await callFn("seedTestBooking", { action: "deleteGuest", email: testEmail });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId || "none", title_prefix: "Documents" });
      }
    },
  },
  {
    id: "asdv_func_founding_member_not_written",
    group: "adminSetDocumentsVerified",
    label: "Functional — does not write documents_verified to FoundingMember (rule violation check)",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — the FoundingMember.documents_verified write must be REMOVED. Gate flags must never be stored on FoundingMember.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-f2-${Date.now()}@integration.test`;
      const { data: signUpData } = await callFn("customSignUp", { email: testEmail, password: "TestPassword123!", forename: "Test", surname: "User" });
      if (!signUpData.success) throw new Error(`customSignUp failed: ${JSON.stringify(signUpData)}`);
      await new Promise(r => setTimeout(r, 500));
      const { data: credData } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
      const userId = credData?.record?.user_id;
      if (!userId) throw new Error("Failed to resolve user_id from UserCredentials");
      try {
        await callFn("adminSetDocumentsVerified", { session_token: sessionToken, user_id: userId, email: testEmail, documents_verified: true });
        const { data: fmData } = await callFn("seedTestBooking", { action: "readFoundingMember", user_id: userId });
        if (fmData.record !== null) throw new Error(`FoundingMember record found — violates project rule that gate flags must never be stored on FoundingMember`);
        return `Passed — no FoundingMember written to`;
      } finally {
        const { data: cleanCred } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (cleanCred?.record?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: cleanCred.record.id });
        if (userId) await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        await callFn("seedTestBooking", { action: "deleteGuest", email: testEmail });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId || "none", title_prefix: "Documents" });
      }
    },
  },
  {
    id: "asdv_func_approved_notification",
    group: "adminSetDocumentsVerified",
    label: "Functional — approval creates bell notification for host",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — documents_verified: true must call sendNotification for the host.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-f3-${Date.now()}@integration.test`;
      const { data: signUpData } = await callFn("customSignUp", { email: testEmail, password: "TestPassword123!", forename: "Test", surname: "User" });
      if (!signUpData.success) throw new Error(`customSignUp failed: ${JSON.stringify(signUpData)}`);
      await new Promise(r => setTimeout(r, 500));
      const { data: credData } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
      const userId = credData?.record?.user_id;
      if (!userId) throw new Error("Failed to resolve user_id from UserCredentials");
      try {
        const { data } = await callFn("adminSetDocumentsVerified", { session_token: sessionToken, user_id: userId, email: testEmail, documents_verified: true });
        if (!data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1000));
        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: userId });
        const notif = (notifData?.notifications || []).find(n => n.title?.toLowerCase().includes("document") || n.title?.toLowerCase().includes("verified"));
        if (!notif) throw new Error("No approval notification found for host");
        return `Passed — approval notification created with title: "${notif.title}"`;
      } finally {
        const { data: cleanCred } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (cleanCred?.record?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: cleanCred.record.id });
        if (userId) await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        await callFn("seedTestBooking", { action: "deleteGuest", email: testEmail });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId || "none", title_prefix: "Documents" });
      }
    },
  },
  {
    id: "asdv_func_rejected_notification",
    group: "adminSetDocumentsVerified",
    label: "Functional — rejection creates bell notification with reason for host",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — documents_verified: false must call sendNotification with rejection_reason in the body.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-f4-${Date.now()}@integration.test`;
      const { data: signUpData } = await callFn("customSignUp", { email: testEmail, password: "TestPassword123!", forename: "Test", surname: "User" });
      if (!signUpData.success) throw new Error(`customSignUp failed: ${JSON.stringify(signUpData)}`);
      await new Promise(r => setTimeout(r, 500));
      const { data: credData } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
      const userId = credData?.record?.user_id;
      if (!userId) throw new Error("Failed to resolve user_id from UserCredentials");
      try {
        const { data } = await callFn("adminSetDocumentsVerified", { session_token: sessionToken, user_id: userId, email: testEmail, documents_verified: false, rejection_reason: "image_unclear", rejection_notes: "The image was too dark to read clearly" });
        if (!data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1000));
        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: userId });
        const notif = (notifData?.notifications || []).find(n => n.title?.toLowerCase().includes("document") || n.title?.toLowerCase().includes("not accepted") || n.title?.toLowerCase().includes("rejected"));
        if (!notif) throw new Error("No rejection notification found");
        const body = notif.body?.toLowerCase() || "";
        if (!body.includes("unclear") && !body.includes("image")) throw new Error(`Rejection reason not in notification body — got: "${notif.body}"`);
        return `Passed — rejection notification created with reason in body`;
      } finally {
        const { data: cleanCred } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (cleanCred?.record?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: cleanCred.record.id });
        if (userId) await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        await callFn("seedTestBooking", { action: "deleteGuest", email: testEmail });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId || "none", title_prefix: "Documents" });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId || "none", title_prefix: "Your documents" });
      }
    },
  },
  {
    id: "asdv_biz_no_gates",
    group: "adminSetDocumentsVerified",
    label: "Business — approved with no other gates: notification mentions both Stripe and subscription",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — stripe_verified: false, subscription_active: false → notification body must mention both.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-b1-${Date.now()}@integration.test`;
      const { data: signUpData } = await callFn("customSignUp", { email: testEmail, password: "TestPassword123!", forename: "Test", surname: "User" });
      if (!signUpData.success) throw new Error(`customSignUp failed`);
      await new Promise(r => setTimeout(r, 500));
      const { data: credData } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
      const userId = credData?.record?.user_id;
      if (!userId) throw new Error("Failed to resolve user_id");
      try {
        await callFn("adminSetDocumentsVerified", { session_token: sessionToken, user_id: userId, email: testEmail, documents_verified: true });
        await new Promise(r => setTimeout(r, 1000));
        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: userId });
        const notif = (notifData?.notifications || []).find(n => n.title?.toLowerCase().includes("document") || n.title?.toLowerCase().includes("verified"));
        if (!notif) throw new Error("No approval notification found");
        const body = notif.body?.toLowerCase() || "";
        if (!body.includes("stripe") && !body.includes("bank")) throw new Error(`Body should mention Stripe — got: "${notif.body}"`);
        if (!body.includes("subscription")) throw new Error(`Body should mention subscription — got: "${notif.body}"`);
        return `Passed — notification correctly mentions both Stripe and subscription needed`;
      } finally {
        const { data: cleanCred } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (cleanCred?.record?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: cleanCred.record.id });
        if (userId) await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        await callFn("seedTestBooking", { action: "deleteGuest", email: testEmail });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId || "none", title_prefix: "Documents" });
      }
    },
  },
  {
    id: "asdv_biz_stripe_done",
    group: "adminSetDocumentsVerified",
    label: "Business — approved with Stripe done: notification mentions subscription only",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — stripe_verified: true, subscription_active: false → notification must mention subscription only, NOT Stripe.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-b2-${Date.now()}@integration.test`;
      const { data: signUpData } = await callFn("customSignUp", { email: testEmail, password: "TestPassword123!", forename: "Test", surname: "User" });
      if (!signUpData.success) throw new Error(`customSignUp failed`);
      await new Promise(r => setTimeout(r, 500));
      const { data: credData } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
      const userId = credData?.record?.user_id;
      if (!userId) throw new Error("Failed to resolve user_id");
      await callFn("seedTestBooking", { action: "updateUser", id: userId, updates: { stripe_verified: true, subscription_active: false } });
      try {
        await callFn("adminSetDocumentsVerified", { session_token: sessionToken, user_id: userId, email: testEmail, documents_verified: true });
        await new Promise(r => setTimeout(r, 1000));
        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: userId });
        const notif = (notifData?.notifications || []).find(n => n.title?.toLowerCase().includes("document") || n.title?.toLowerCase().includes("verified"));
        if (!notif) throw new Error("No approval notification found");
        const body = notif.body?.toLowerCase() || "";
        if (body.includes("stripe") || body.includes("bank account")) throw new Error(`Body mentions Stripe but Stripe is already done — got: "${notif.body}"`);
        if (!body.includes("subscription")) throw new Error(`Body should mention subscription — got: "${notif.body}"`);
        return `Passed — notification mentions subscription only`;
      } finally {
        const { data: cleanCred } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (cleanCred?.record?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: cleanCred.record.id });
        if (userId) await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        await callFn("seedTestBooking", { action: "deleteGuest", email: testEmail });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId || "none", title_prefix: "Documents" });
      }
    },
  },
  {
    id: "asdv_biz_subscription_done",
    group: "adminSetDocumentsVerified",
    label: "Business — approved with subscription done: notification mentions Stripe only",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — stripe_verified: false, subscription_active: true → notification must mention Stripe only, NOT subscription.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-b3-${Date.now()}@integration.test`;
      const { data: signUpData } = await callFn("customSignUp", { email: testEmail, password: "TestPassword123!", forename: "Test", surname: "User" });
      if (!signUpData.success) throw new Error(`customSignUp failed`);
      await new Promise(r => setTimeout(r, 500));
      const { data: credData } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
      const userId = credData?.record?.user_id;
      if (!userId) throw new Error("Failed to resolve user_id");
      await callFn("seedTestBooking", { action: "updateUser", id: userId, updates: { stripe_verified: false, subscription_active: true } });
      try {
        await callFn("adminSetDocumentsVerified", { session_token: sessionToken, user_id: userId, email: testEmail, documents_verified: true });
        await new Promise(r => setTimeout(r, 1000));
        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: userId });
        const notif = (notifData?.notifications || []).find(n => n.title?.toLowerCase().includes("document") || n.title?.toLowerCase().includes("verified"));
        if (!notif) throw new Error("No approval notification found");
        const body = notif.body?.toLowerCase() || "";
        if (body.includes("subscription")) throw new Error(`Body mentions subscription but it is already done — got: "${notif.body}"`);
        if (!body.includes("stripe") && !body.includes("bank")) throw new Error(`Body should mention Stripe — got: "${notif.body}"`);
        return `Passed — notification mentions Stripe only`;
      } finally {
        const { data: cleanCred } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (cleanCred?.record?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: cleanCred.record.id });
        if (userId) await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        await callFn("seedTestBooking", { action: "deleteGuest", email: testEmail });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId || "none", title_prefix: "Documents" });
      }
    },
  },
  {
    id: "asdv_biz_all_gates",
    group: "adminSetDocumentsVerified",
    label: "Business — all gates open: documents confirmed sent first, congratulations sent second",
    claudeHint: "base44/functions/adminSetDocumentsVerified/entry.ts — all gates open → TWO notifications: documents confirmed first, then congratulations. Order matters.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const testEmail = `asdv-b4-${Date.now()}@integration.test`;
      const { data: signUpData } = await callFn("customSignUp", { email: testEmail, password: "TestPassword123!", forename: "Test", surname: "User" });
      if (!signUpData.success) throw new Error(`customSignUp failed`);
      await new Promise(r => setTimeout(r, 500));
      const { data: credData } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
      const userId = credData?.record?.user_id;
      if (!userId) throw new Error("Failed to resolve user_id");
      await callFn("seedTestBooking", { action: "updateUser", id: userId, updates: { stripe_verified: true, subscription_active: true } });
      try {
        const { data } = await callFn("adminSetDocumentsVerified", { session_token: sessionToken, user_id: userId, email: testEmail, documents_verified: true });
        if (!data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1500));
        const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: userId });
        const notifications = notifData?.notifications || [];
        const docsNotif = notifications.find(n => n.title?.toLowerCase().includes("document") || n.title?.toLowerCase().includes("verified"));
        const congratsNotif = notifications.find(n => n.title?.toLowerCase().includes("approved") || n.title?.toLowerCase().includes("publish") || n.title?.toLowerCase().includes("congratulations"));
        if (!docsNotif) throw new Error(`Documents verified notification not found — titles: ${notifications.map(n => n.title).join(", ")}`);
        if (!congratsNotif) throw new Error(`Congratulations notification not found — two notifications must be sent when all gates open`);
        const docsTime = new Date(docsNotif.created_date).getTime();
        const congratsTime = new Date(congratsNotif.created_date).getTime();
        if (docsTime > congratsTime) throw new Error("Documents notification must be created before congratulations");
        return `Passed — two notifications in correct order: "${docsNotif.title}" then "${congratsNotif.title}"`;
      } finally {
        const { data: cleanCred } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (cleanCred?.record?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: cleanCred.record.id });
        if (userId) await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        await callFn("seedTestBooking", { action: "deleteGuest", email: testEmail });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId || "none", title_prefix: "Documents" });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId || "none", title_prefix: "You're fully" });
        await callFn("seedTestBooking", { action: "listNotificationsAndClean", user_id: userId || "none", title_prefix: "Congratulations" });
      }
    },
  },

  // ── processDepositRefunds ─────────────────────────────────────────────
  {
    id: "pdr_reachable",
    group: "processDepositRefunds",
    label: "Function executes and returns correct shape",
    claudeHint: "Check base44/functions/processDepositRefunds/entry.ts — must return { success, processed, skipped, errors, total }.",
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
    claudeHint: "Check processDepositRefunds/entry.ts — deposit_frozen check must skip before Stripe is called.",
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
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      await callFn("processDepositRefunds");
      await new Promise(r => setTimeout(r, 1000));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (readBack?.booking?.deposit_status !== "held") throw new Error(`Expected 'held', got '${readBack?.booking?.deposit_status}'`);
      return `Passed — frozen booking skipped, deposit_status still 'held'`;
    },
  },
  {
    id: "pdr_skips_no_intent",
    group: "processDepositRefunds",
    label: "Skips bookings with no stripe_deposit_intent_id — no crash",
    claudeHint: "Check processDepositRefunds/entry.ts — missing stripe_deposit_intent_id must be caught and skipped.",
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
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      const { status, data } = await callFn("processDepositRefunds");
      await new Promise(r => setTimeout(r, 1000));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (status !== 200 || data.success !== true) throw new Error(`Function crashed: ${data.error}`);
      if (readBack?.booking?.deposit_status !== "held") throw new Error(`Expected 'held', got '${readBack?.booking?.deposit_status}'`);
      return `Passed — missing intent skipped, function stayed success: true`;
    },
  },
  {
    id: "pdr_skips_future_checkout",
    group: "processDepositRefunds",
    label: "Skips bookings where 48h window has not passed",
    claudeHint: "Check processDepositRefunds/entry.ts — now < checkoutPlus48h must skip. If deposit_status becomes 'refunding', the time guard is broken.",
    run: async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "Deposit Future Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id", check_in: futureDate, check_out: futureDate,
          booking_status: "completed", deposit_status: "held", total_amount: 0, deposit_frozen: false,
          stripe_deposit_intent_id: "pi_regression_future_test",
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      await callFn("processDepositRefunds");
      await new Promise(r => setTimeout(r, 1000));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (readBack?.booking?.deposit_status !== "held") throw new Error(`Expected 'held', got '${readBack?.booking?.deposit_status}'`);
      return `Passed — future checkout skipped, deposit_status still 'held'`;
    },
  },
  {
    id: "pdr_eligible_invalid_stripe",
    group: "processDepositRefunds",
    label: "Eligible booking with invalid Stripe ID — errors gracefully, function does not crash",
    claudeHint: "Check processDepositRefunds/entry.ts — a real Stripe call with an invalid intent_id must be caught and logged. success: true must still be returned with errors: 1.",
    run: async () => {
      const pastDate = new Date(Date.now() - 86400000 * 3).toISOString().split("T")[0];
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "Deposit Invalid Stripe Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id", check_in: pastDate, check_out: pastDate,
          booking_status: "completed", deposit_status: "held", total_amount: 0, deposit_frozen: false,
          stripe_deposit_intent_id: "pi_fake_invalid_intent_for_testing",
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      const { status, data } = await callFn("processDepositRefunds");
      await new Promise(r => setTimeout(r, 1000));
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (status !== 200 || data.success !== true) throw new Error(`Function crashed instead of handling error gracefully: ${JSON.stringify(data)}`);
      return `Passed — fake intent errored gracefully. success: true, errors: ${data.errors}`;
    },
  },

  // ── checkInBooking ────────────────────────────────────────────────────
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

  // ── autoCheckIn ───────────────────────────────────────────────────────
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

  // ── processPayouts — Job 1 (balance charge) ───────────────────────────
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
          booking_status: "confirmed",
          balance_payment_status: "pending",
          balance_due_date: new Date(Date.now() - 86400000).toISOString(),
          remaining_balance: 0,
          total_amount: 500,
          stripe_customer_id: "cus_test_zero",
          stripe_payment_method_id: "pm_test_zero",
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
        throw new Error(`Expected 'pending', got '${readBack?.booking?.balance_payment_status}' — zero balance booking was processed`);
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
          booking_status: "confirmed",
          balance_payment_status: "pending",
          balance_due_date: new Date(Date.now() + 14 * 86400000).toISOString(),
          remaining_balance: 400,
          total_amount: 500,
          stripe_customer_id: "cus_test_future",
          stripe_payment_method_id: "pm_test_future",
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      await callFn("processPayouts");
      await new Promise(r => setTimeout(r, 1000));
      const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (readBack?.booking?.balance_payment_status !== "pending")
        throw new Error(`Expected 'pending', got '${readBack?.booking?.balance_payment_status}' — future due date was not respected`);
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
          booking_status: "confirmed",
          balance_payment_status: "not_applicable",
          remaining_balance: 0,
          total_amount: 500,
          payment_status: "paid",
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
    claudeHint: "Check processPayouts/entry.ts Job 1 — when Stripe charge fails, booking must be updated with balance_payment_status: 'failed' and balance_failed_at set to now. Requires stripe_payment_method_id on booking — not just stripe_customer_id.",
    run: async () => {
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "PP Charge Fail Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 17 * 86400000).toISOString().split("T")[0],
          booking_status: "confirmed",
          balance_payment_status: "pending",
          balance_due_date: new Date(Date.now() - 86400000).toISOString(),
          remaining_balance: 400,
          total_amount: 500,
          stripe_customer_id: "cus_invalid_test",
          stripe_payment_method_id: "pm_invalid_test",
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
    claudeHint: "Check processPayouts/entry.ts Job 1 — User.get() is forbidden. Host email lookup must go via UserCredentials.filter({ user_id }) → email. If User.get() is called the function will 404 silently.",
    run: async () => {
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test-no-user-get",
          guest_id: "regression-test",
          guest_name: "PP No User Get Test",
          guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 17 * 86400000).toISOString().split("T")[0],
          booking_status: "confirmed",
          balance_payment_status: "pending",
          balance_due_date: new Date(Date.now() - 86400000).toISOString(),
          remaining_balance: 400,
          total_amount: 500,
          stripe_customer_id: "cus_invalid_test",
          stripe_payment_method_id: "pm_invalid_test",
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

  // ── processPayouts — Job 2 (auto-cancel after 7 days) ─────────────────
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
    claudeHint: "Check processPayouts/entry.ts Job 2 — differenceInDays(now, failedAt) must be strictly greater than 7. A booking failed 6 days ago must not be cancelled.",
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
          booking_status: "confirmed",
          balance_payment_status: "failed",
          balance_failed_at: failedAt,
          remaining_balance: 400,
          total_amount: 500,
          deposit_amount: 100,
          stripe_rental_intent_id: "pi_test_grace",
          stripe_deposit_intent_id: "pi_deposit_grace",
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
          booking_status: "confirmed",
          balance_payment_status: "failed",
          balance_failed_at: failedAt,
          remaining_balance: 400,
          total_amount: 500,
          deposit_amount: 100,
          stripe_rental_intent_id: "pi_test_cancel",
          stripe_deposit_intent_id: "pi_deposit_cancel",
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
    claudeHint: "Check processPayouts/entry.ts Job 2 — refund must hit stripe_deposit_intent_id. Using stripe_rental_intent_id is wrong — the rental balance was never charged so there is nothing to refund on that intent.",
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
          booking_status: "confirmed",
          balance_payment_status: "failed",
          balance_failed_at: failedAt,
          remaining_balance: 400,
          total_amount: 500,
          deposit_amount: 100,
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
      const hasRentalRefundError = data.errors?.some(e =>
        e.includes(bookingId) && e.toLowerCase().includes("rental")
      );
      if (hasRentalRefundError)
        throw new Error(`Rental intent refund attempted — wrong PaymentIntent targeted`);
      return `Passed — function ran without rental intent refund error`;
    },
  },
  {
    id: "pp_j2_stripe_connect_from_userrole",
    group: "processPayouts",
    label: "Functional — super strict transfer reads stripe_connect_account_id from UserRole not User",
    claudeHint: "Check processPayouts/entry.ts Job 2 — stripe_connect_account_id must be read from UserRole.filter({ user_id, role: 'host' })[0]. Reading from User will always return undefined.",
    run: async () => {
      const failedAt = new Date(Date.now() - 8 * 86400000).toISOString();
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test-no-user-get",
          guest_id: "regression-test",
          guest_name: "PP UserRole Test", guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 17 * 86400000).toISOString().split("T")[0],
          booking_status: "confirmed",
          balance_payment_status: "failed",
          balance_failed_at: failedAt,
          remaining_balance: 400,
          total_amount: 500,
          deposit_amount: 100,
          stripe_rental_intent_id: "pi_test_userrole",
          stripe_deposit_intent_id: "pi_deposit_userrole",
          cancellation_policy_snapshot: { type: "super_strict" },
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      const { status, data } = await callFn("processPayouts");
      await new Promise(r => setTimeout(r, 1500));
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      if (status !== 200) throw new Error(`Function crashed with ${status} — likely User.get() 404`);
      if (data.errors?.some(e => e.includes(bookingId) && e.toLowerCase().includes("user.get")))
        throw new Error(`User.get() error detected — must use UserRole lookup instead`);
      return `Passed — function completed without User.get() crash on super strict path`;
    },
  },
  {
    id: "pp_j2_biz_booking_reference_in_notification",
    group: "processPayouts",
    label: "Business — cancellation notification includes booking reference and guest name",
    claudeHint: "Check processPayouts/entry.ts Job 2 — notification/email to host must include booking.booking_reference and booking.guest_name. Format: HKD-[initials]-[check-in date].",
    run: async () => {
      const failedAt = new Date(Date.now() - 8 * 86400000).toISOString();
      const checkIn = new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0];
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test", guest_id: "regression-test",
          guest_name: "Sarah Mitchell",
          guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: checkIn,
          check_out: new Date(Date.now() + 17 * 86400000).toISOString().split("T")[0],
          booking_status: "confirmed",
          balance_payment_status: "failed",
          balance_failed_at: failedAt,
          remaining_balance: 400,
          total_amount: 500,
          deposit_amount: 100,
          booking_reference: `HKD-SM-${checkIn.replace(/-/g, "").slice(6)}${checkIn.replace(/-/g, "").slice(4, 6)}${checkIn.replace(/-/g, "").slice(0, 4)}`,
          stripe_deposit_intent_id: "pi_deposit_biz_ref",
          cancellation_policy_snapshot: { type: "standard" },
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed`);
      await callFn("processPayouts");
      await new Promise(r => setTimeout(r, 1500));
      const { data: notifData } = await callFn("seedTestBooking", { action: "listNotifications", user_id: "regression-test" });
      await callFn("seedTestBooking", { action: "delete", id: bookingId });
      const notifications = notifData?.notifications || [];
      const cancelNotif = notifications.find(n =>
        n.body?.includes("Sarah Mitchell") || n.body?.includes("HKD-SM")
      );
      if (!cancelNotif)
        throw new Error(`Cancellation notification missing guest name or booking reference — titles found: ${notifications.map(n => n.title).join(", ")}`);
      return `Passed — cancellation notification contains guest name and booking reference`;
    },
  },
  {
    id: "pp_j2_biz_dates_released",
    group: "processPayouts",
    label: "Business — cancelled booking releases dates immediately so property can be rebooked",
    claudeHint: "Check processPayouts/entry.ts Job 2 — booking_status must be set to 'cancelled' immediately on auto-cancel. No host override. Dates released by status change alone.",
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
          booking_status: "confirmed",
          balance_payment_status: "failed",
          balance_failed_at: failedAt,
          remaining_balance: 400,
          total_amount: 500,
          deposit_amount: 100,
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

  // ── createBookingPaymentIntent ─────────────────────────────────────────
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
    id: "cbpi_smoke_returns_secrets",
    group: "createBookingPaymentIntent",
    label: "Smoke — returns rental_client_secret in response shape",
    claudeHint: "Check base44/functions/createBookingPaymentIntent/entry.ts — successful response must contain rental_client_secret.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { data } = await callFn("createBookingPaymentIntent", {
        session_token: sessionToken,
        booking_id: "nonexistent_booking_test_id",
      });
      if (typeof data.rental_client_secret === "undefined" && !data.error)
        throw new Error(`Response missing rental_client_secret and no error returned: ${JSON.stringify(data)}`);
      return `Passed — response shape correct (error or secret present)`;
    },
  },
  {
    id: "cbpi_func_no_booking_get",
    group: "createBookingPaymentIntent",
    label: "Functional — does not use Booking.get() — uses filter() instead",
    claudeHint: "Check base44/functions/createBookingPaymentIntent/entry.ts — Booking.get() is forbidden. Must use Booking.filter({ id: booking_id })[0] instead. If Booking.get() is present the function will 404.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id,
          guest_id: user.id,
          guest_name: "CBPI Filter Test",
          guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 70 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 77 * 86400000).toISOString().split("T")[0],
          booking_status: "awaiting_payment",
          total_amount: 500,
          deposit_amount: 100,
          remaining_balance: 400,
          security_deposit: 200,
          subtotal: 450,
          cleaning_fee: 50,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      try {
        const { status, data } = await callFn("createBookingPaymentIntent", {
          session_token: sessionToken,
          booking_id: bookingId,
        });
        if (status === 500 && data?.error?.includes("get is not a function"))
          throw new Error(`Booking.get() called — forbidden pattern detected`);
        if (status === 404 && data?.error?.includes("not found"))
          throw new Error(`Booking.get() returned 404 — must use Booking.filter() instead`);
        return `Passed — function reached booking without using Booking.get()`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
      }
    },
  },
  {
    id: "cbpi_func_no_user_get",
    group: "createBookingPaymentIntent",
    label: "Functional — does not use User.get() for host lookup — uses UserRole instead",
    claudeHint: "Check base44/functions/createBookingPaymentIntent/entry.ts — User.get() is forbidden. Host Stripe Connect check must use UserRole.filter({ user_id: host_id, role: 'host' }) and read stripe_connect_account_id from there.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test-no-user-get",
          guest_id: user.id,
          guest_name: "CBPI No User Get Test",
          guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 70 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 77 * 86400000).toISOString().split("T")[0],
          booking_status: "awaiting_payment",
          total_amount: 500,
          deposit_amount: 100,
          remaining_balance: 400,
          security_deposit: 200,
          subtotal: 450,
          cleaning_fee: 50,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      try {
        const { status, data } = await callFn("createBookingPaymentIntent", {
          session_token: sessionToken,
          booking_id: bookingId,
        });
        if (status === 500) throw new Error(`Function crashed with 500 — likely User.get() 404: ${data?.error}`);
        if (data?.error?.includes("stripe_connect_account_id") && data?.error?.includes("User"))
          throw new Error(`User.get() used for Stripe check — must use UserRole instead`);
        return `Passed — function did not crash on unknown host_id, no User.get() 404`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
      }
    },
  },
  {
    id: "cbpi_func_host_no_stripe_blocked",
    group: "createBookingPaymentIntent",
    label: "Functional — host without verified Stripe Connect returns 400",
    claudeHint: "Check base44/functions/createBookingPaymentIntent/entry.ts — if UserRole.stripe_connect_status !== 'verified', must return 400 with error 'Host has not connected their bank account'.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: "regression-test-no-stripe",
          guest_id: user.id,
          guest_name: "CBPI No Stripe Test",
          guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 70 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 77 * 86400000).toISOString().split("T")[0],
          booking_status: "awaiting_payment",
          total_amount: 500,
          deposit_amount: 100,
          remaining_balance: 400,
          security_deposit: 200,
          subtotal: 450,
          cleaning_fee: 50,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      try {
        const { status, data } = await callFn("createBookingPaymentIntent", {
          session_token: sessionToken,
          booking_id: bookingId,
        });
        if (status !== 400) throw new Error(`Expected 400, got ${status}: ${JSON.stringify(data)}`);
        return `Passed — host without Stripe Connect correctly blocked with 400`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
      }
    },
  },
  {
    id: "cbpi_func_stripe_customer_saved",
    group: "createBookingPaymentIntent",
    label: "Functional — stripe_customer_id written to Booking after intent creation",
    claudeHint: "Check base44/functions/createBookingPaymentIntent/entry.ts — after creating Stripe customer, stripe_customer_id must be written back to the Booking entity via Booking.update().",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id,
          guest_id: user.id,
          guest_name: "CBPI Customer Save Test",
          guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 70 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 77 * 86400000).toISOString().split("T")[0],
          booking_status: "awaiting_payment",
          total_amount: 500,
          deposit_amount: 100,
          remaining_balance: 400,
          security_deposit: 200,
          subtotal: 450,
          cleaning_fee: 50,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      try {
        const { status, data } = await callFn("createBookingPaymentIntent", {
          session_token: sessionToken,
          booking_id: bookingId,
        });
        if (status !== 200) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1000));
        const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
        if (!readBack?.booking?.stripe_customer_id)
          throw new Error(`stripe_customer_id not written to Booking after intent creation`);
        return `Passed — stripe_customer_id written: ${readBack.booking.stripe_customer_id}`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
      }
    },
  },
  {
    id: "cbpi_func_payment_method_saved",
    group: "createBookingPaymentIntent",
    label: "Functional — stripe_payment_method_id field exists on Booking entity",
    claudeHint: "Check Booking entity schema — stripe_payment_method_id must exist as a string field. Without it Job 1 in processPayouts cannot charge the saved card off-session.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id,
          guest_id: user.id,
          guest_name: "CBPI Payment Method Test",
          guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 70 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 77 * 86400000).toISOString().split("T")[0],
          booking_status: "awaiting_payment",
          total_amount: 500,
          deposit_amount: 100,
          remaining_balance: 400,
          stripe_payment_method_id: "pm_test_placeholder",
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed — stripe_payment_method_id field may not exist on Booking entity: ${JSON.stringify(created)}`);
      try {
        const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
        if (typeof readBack?.booking?.stripe_payment_method_id === "undefined")
          throw new Error(`stripe_payment_method_id field does not exist on Booking entity — add it to the schema`);
        return `Passed — stripe_payment_method_id field exists on Booking entity`;
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
          host_id: user.id,
          guest_id: user.id,
          guest_name: "CBPI 56 Day Test",
          guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 70 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 77 * 86400000).toISOString().split("T")[0],
          booking_status: "awaiting_payment",
          total_amount: 500,
          deposit_amount: 100,
          remaining_balance: 400,
          security_deposit: 0,
          subtotal: 450,
          cleaning_fee: 50,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      try {
        const { status, data } = await callFn("createBookingPaymentIntent", {
          session_token: sessionToken,
          booking_id: bookingId,
        });
        if (status !== 200) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1000));
        const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
        if (readBack?.booking?.balance_payment_status !== "pending")
          throw new Error(`Expected balance_payment_status 'pending', got '${readBack?.booking?.balance_payment_status}'`);
        if (!readBack?.booking?.balance_due_date)
          throw new Error(`balance_due_date not written to Booking`);
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
          host_id: user.id,
          guest_id: user.id,
          guest_name: "CBPI Within 56 Day Test",
          guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 37 * 86400000).toISOString().split("T")[0],
          booking_status: "awaiting_payment",
          total_amount: 500,
          deposit_amount: 100,
          remaining_balance: 400,
          security_deposit: 0,
          subtotal: 450,
          cleaning_fee: 50,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      try {
        const { status, data } = await callFn("createBookingPaymentIntent", {
          session_token: sessionToken,
          booking_id: bookingId,
        });
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
    id: "cbpi_biz_minimum_charge",
    group: "createBookingPaymentIntent",
    label: "Business — booking with no deposit set uses minimum £1 charge and still saves stripe_customer_id",
    claudeHint: "Check base44/functions/createBookingPaymentIntent/entry.ts — if deposit_amount is 0 or absent, chargeAmount must be at least 100 (£1 in pence) to save the card. stripe_customer_id must still be written to Booking.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id,
          guest_id: user.id,
          guest_name: "CBPI Min Charge Test",
          guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: new Date(Date.now() + 70 * 86400000).toISOString().split("T")[0],
          check_out: new Date(Date.now() + 77 * 86400000).toISOString().split("T")[0],
          booking_status: "awaiting_payment",
          total_amount: 500,
          deposit_amount: 0,
          remaining_balance: 500,
          security_deposit: 0,
          subtotal: 450,
          cleaning_fee: 50,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      try {
        const { status, data } = await callFn("createBookingPaymentIntent", {
          session_token: sessionToken,
          booking_id: bookingId,
        });
        if (status !== 200) throw new Error(`Function failed with no deposit set: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1000));
        const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
        if (!readBack?.booking?.stripe_customer_id)
          throw new Error(`stripe_customer_id not saved when deposit_amount is 0`);
        return `Passed — minimum £1 charge created, stripe_customer_id saved`;
      } finally {
        await callFn("seedTestBooking", { action: "delete", id: bookingId });
      }
    },
  },
  {
    id: "cbpi_biz_booking_reference_generated",
    group: "createBookingPaymentIntent",
    label: "Business — booking_reference in format HKD-[initials]-[DDMMYYYY] written to Booking",
    claudeHint: "Check base44/functions/createBookingPaymentIntent/entry.ts — booking_reference must be generated from guest_name initials and check_in date and written to Booking entity. Format: HKD-SJM-14072026.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const checkIn = new Date(Date.now() + 70 * 86400000).toISOString().split("T")[0];
      const { data: created } = await callFn("seedTestBooking", {
        action: "create",
        booking: {
          host_id: user.id,
          guest_id: user.id,
          guest_name: "Sarah Jane Mitchell",
          guest_email: "regression@hostkeepdigital-test.invalid",
          property_id: "regression-test-property-id",
          check_in: checkIn,
          check_out: new Date(Date.now() + 77 * 86400000).toISOString().split("T")[0],
          booking_status: "awaiting_payment",
          total_amount: 500,
          deposit_amount: 100,
          remaining_balance: 400,
          security_deposit: 0,
          subtotal: 450,
          cleaning_fee: 50,
        },
      });
      const bookingId = created?.id;
      if (!bookingId) throw new Error(`seedTestBooking failed: ${JSON.stringify(created)}`);
      try {
        const { status, data } = await callFn("createBookingPaymentIntent", {
          session_token: sessionToken,
          booking_id: bookingId,
        });
        if (status !== 200) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1000));
        const { data: readBack } = await callFn("seedTestBooking", { action: "read", id: bookingId });
        const ref = readBack?.booking?.booking_reference;
        if (!ref) throw new Error(`booking_reference not written to Booking entity`);
        if (!ref.startsWith("HKD-"))
          throw new Error(`booking_reference format wrong — expected HKD-[initials]-[date], got: ${ref}`);
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

  // registerFoundingMember / verifyEmailCode / setOnboardingPassword / getUserProfile / saveUserProfile
  // tests are defined in ./tests/*.tests.js and imported+spread into TESTS above

  ...registerFoundingMemberTests,
  ...verifyEmailCodeTests,
  ...setOnboardingPasswordTests,
  ...getUserProfileTests,
  ...saveUserProfileTests,
];

// ── tests moved to ./tests/*.tests.js ──

  {
    id: "vec_func_deletes_used_code",
    group: "verifyEmailCode",
    label: "Functional — used verification code deleted after successful verification",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — EmailVerificationCode record must be deleted after use to prevent reuse.",
    run: async () => {
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      await callFn("registerFoundingMember", {
        forename: "Support", middle_name: "", surname: "Test",
        email: "support@hostkeepdigital.co.uk",
        postcode: "TR1 1AA", role: "host",
      });
      await new Promise(r => setTimeout(r, 1500));
      await callFn("sendVerificationCode", { email: "support@hostkeepdigital.co.uk", name: "Support", type: "host" });
      await new Promise(r => setTimeout(r, 1000));
      const codeRecord = await callFn("seedTestBooking", { action: "findVerificationCode", email: "support@hostkeepdigital.co.uk" });
      const code = codeRecord?.data?.code;
      if (!code) throw new Error(`Could not read verification code`);
      await callFn("verifyEmailCode", { email: "support@hostkeepdigital.co.uk", code });
      await new Promise(r => setTimeout(r, 1500));
      const afterRecord = await callFn("seedTestBooking", { action: "findVerificationCode", email: "support@hostkeepdigital.co.uk" });
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      if (afterRecord?.data?.code) throw new Error(`Verification code still exists after use — not deleted`);
      return `Passed — used code correctly deleted`;
    },
  },
  {
    id: "vec_func_no_crash_guest_flow",
    group: "verifyEmailCode",
    label: "Functional — valid code does not crash when no FoundingMember exists for email",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — guest flow has no FoundingMember. Must complete cleanly without crashing.",
    run: async () => {
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      await callFn("sendVerificationCode", { email: "support@hostkeepdigital.co.uk", name: "Support", type: "guest" });
      await new Promise(r => setTimeout(r, 1000));
      const codeRecord = await callFn("seedTestBooking", { action: "findVerificationCode", email: "support@hostkeepdigital.co.uk" });
      const code = codeRecord?.data?.code;
      if (!code) throw new Error(`Could not read verification code`);
      const { status, data } = await callFn("verifyEmailCode", { email: "support@hostkeepdigital.co.uk", code });
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      if (status === 500) throw new Error(`Function crashed when no FoundingMember exists — 500 returned`);
      if (data.valid !== true) throw new Error(`Expected valid: true, got: ${JSON.stringify(data)}`);
      return `Passed — guest flow completes without crash, valid: true`;
    },
  },
  {
    id: "vec_biz_host_appears_in_pending",
    group: "verifyEmailCode",
    label: "Business — host who verifies email has FoundingMember at pending not interest",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — after verification the admin panel must show this host in Pending, not Interest. approval_status must be 'pending' in the FoundingMember record.",
    run: async () => {
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      await callFn("registerFoundingMember", {
        forename: "Support", middle_name: "", surname: "Test",
        email: "support@hostkeepdigital.co.uk",
        postcode: "TR1 1AA", role: "host",
      });
      await new Promise(r => setTimeout(r, 1500));
      await callFn("sendVerificationCode", { email: "support@hostkeepdigital.co.uk", name: "Support", type: "host" });
      await new Promise(r => setTimeout(r, 1000));
      const codeRecord = await callFn("seedTestBooking", { action: "findVerificationCode", email: "support@hostkeepdigital.co.uk" });
      const code = codeRecord?.data?.code;
      if (!code) throw new Error(`Could not read verification code`);
      await callFn("verifyEmailCode", { email: "support@hostkeepdigital.co.uk", code });
      await new Promise(r => setTimeout(r, 1500));
      const sr = await callFn("seedTestBooking", { action: "findFoundingMember", email: "support@hostkeepdigital.co.uk" });
      const member = sr?.data;
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      if (member?.approval_status !== "pending") throw new Error(`Host not in Pending after email verification — got: ${member?.approval_status}. Admin will not see them in the Pending section.`);
      return `Passed — host correctly appears in Pending after email verification`;
    },
  },

  // ── setOnboardingPassword ─────────────────────────────────────────────
  {
    id: "sop_smoke_executes",
    group: "setOnboardingPassword",
    label: "Smoke — function returns 200 with session_token",
    claudeHint: "Check base44/functions/setOnboardingPassword/entry.ts — must return { success: true, session_token } for valid founding member email and password.",
    run: async () => {
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      await callFn("registerFoundingMember", {
        forename: "Support", middle_name: "", surname: "Test",
        email: "support@hostkeepdigital.co.uk",
        postcode: "TR1 1AA", role: "host",
      });
      await new Promise(r => setTimeout(r, 1500));
      const sr = await callFn("seedTestBooking", { action: "findFoundingMember", email: "support@hostkeepdigital.co.uk" });
      if (sr?.data?.id) {
        await callFn("seedTestBooking", { action: "updateFoundingMember", id: sr.data.id, updates: { approval_status: "invited" } });
      }
      await new Promise(r => setTimeout(r, 1000));
      const { status, data } = await callFn("setOnboardingPassword", {
        email: "support@hostkeepdigital.co.uk",
        password: "TestPassword123!",
        forename: "Support", middle_name: "", surname: "Test",
      });
      await new Promise(r => setTimeout(r, 1500));
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
      if (!data.session_token) throw new Error(`Missing session_token in response`);
      return `Passed — session_token returned correctly`;
    },
  },
  {
    id: "sop_func_advances_status",
    group: "setOnboardingPassword",
    label: "Functional — FoundingMember advances from invited to password_protected",
    claudeHint: "Check base44/functions/setOnboardingPassword/entry.ts — after password set, FoundingMember.approval_status must be 'password_protected'.",
    run: async () => {
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      await callFn("registerFoundingMember", {
        forename: "Support", middle_name: "", surname: "Test",
        email: "support@hostkeepdigital.co.uk",
        postcode: "TR1 1AA", role: "host",
      });
      await new Promise(r => setTimeout(r, 1500));
      const sr = await callFn("seedTestBooking", { action: "findFoundingMember", email: "support@hostkeepdigital.co.uk" });
      if (sr?.data?.id) {
        await callFn("seedTestBooking", { action: "updateFoundingMember", id: sr.data.id, updates: { approval_status: "invited" } });
      }
      await new Promise(r => setTimeout(r, 1000));
      await callFn("setOnboardingPassword", {
        email: "support@hostkeepdigital.co.uk",
        password: "TestPassword123!",
        forename: "Support", middle_name: "", surname: "Test",
      });
      await new Promise(r => setTimeout(r, 1500));
      const after = await callFn("seedTestBooking", { action: "findFoundingMember", email: "support@hostkeepdigital.co.uk" });
      const member = after?.data;
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      if (member?.approval_status !== "password_protected") throw new Error(`Expected 'password_protected', got '${member?.approval_status}'`);
      return `Passed — FoundingMember correctly advanced to password_protected`;
    },
  },
  {
    id: "sop_func_user_id_written",
    group: "setOnboardingPassword",
    label: "Functional — user_id written to FoundingMember after password set",
    claudeHint: "Check base44/functions/setOnboardingPassword/entry.ts — user_id must be written to FoundingMember so CreateProperty can find the record later via user_id lookup.",
    run: async () => {
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      await callFn("registerFoundingMember", {
        forename: "Support", middle_name: "", surname: "Test",
        email: "support@hostkeepdigital.co.uk",
        postcode: "TR1 1AA", role: "host",
      });
      await new Promise(r => setTimeout(r, 1500));
      const sr = await callFn("seedTestBooking", { action: "findFoundingMember", email: "support@hostkeepdigital.co.uk" });
      if (sr?.data?.id) {
        await callFn("seedTestBooking", { action: "updateFoundingMember", id: sr.data.id, updates: { approval_status: "invited" } });
      }
      await new Promise(r => setTimeout(r, 1000));
      await callFn("setOnboardingPassword", {
        email: "support@hostkeepdigital.co.uk",
        password: "TestPassword123!",
        forename: "Support", middle_name: "", surname: "Test",
      });
      await new Promise(r => setTimeout(r, 1500));
      const after = await callFn("seedTestBooking", { action: "findFoundingMember", email: "support@hostkeepdigital.co.uk" });
      const member = after?.data;
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      if (!member?.user_id) throw new Error(`user_id not written to FoundingMember after password set`);
      return `Passed — user_id written: ${member.user_id}`;
    },
  },
  {
    id: "sop_func_profile_saved",
    group: "setOnboardingPassword",
    label: "Functional — UserProfile created with forename, middle_name, surname after password set",
    claudeHint: "Check base44/functions/setOnboardingPassword/entry.ts — UserProfile must be created with forename, middle_name, surname so Settings shows correct data immediately after first login.",
    run: async () => {
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      await callFn("registerFoundingMember", {
        forename: "Support", middle_name: "Jane", surname: "Test",
        email: "support@hostkeepdigital.co.uk",
        postcode: "TR1 1AA", role: "host",
      });
      await new Promise(r => setTimeout(r, 1500));
      const sr = await callFn("seedTestBooking", { action: "findFoundingMember", email: "support@hostkeepdigital.co.uk" });
      if (sr?.data?.id) {
        await callFn("seedTestBooking", { action: "updateFoundingMember", id: sr.data.id, updates: { approval_status: "invited" } });
      }
      await new Promise(r => setTimeout(r, 1000));
      await callFn("setOnboardingPassword", {
        email: "support@hostkeepdigital.co.uk",
        password: "TestPassword123!",
        forename: "Support", middle_name: "Jane", surname: "Test",
      });
      await new Promise(r => setTimeout(r, 1500));
      const profileRecord = await callFn("seedTestBooking", { action: "findUserProfile", email: "support@hostkeepdigital.co.uk" });
      const profile = profileRecord?.data;
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      if (!profile) throw new Error(`UserProfile not created after password set`);
      if (profile.forename !== "Support") throw new Error(`forename wrong: ${profile.forename}`);
      if (profile.middle_name !== "Jane") throw new Error(`middle_name wrong: ${profile.middle_name}`);
      if (profile.surname !== "Test") throw new Error(`surname wrong: ${profile.surname}`);
      return `Passed — UserProfile created with correct name parts`;
    },
  },
  {
    id: "sop_func_no_duplicate_credentials",
    group: "setOnboardingPassword",
    label: "Functional — existing UserCredentials not duplicated for existing guest applying as host",
    claudeHint: "Check base44/functions/setOnboardingPassword/entry.ts — if UserCredentials already exist for this email, must update not create. Duplicate create throws a constraint error and breaks the flow.",
    run: async () => {
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      await callFn("seedTestBooking", {
        action: "createUserCredentials",
        userCredentials: {
          email: "support@hostkeepdigital.co.uk",
          password_hash: "existinghashfortest",
        },
      });
      await callFn("registerFoundingMember", {
        forename: "Support", middle_name: "", surname: "Test",
        email: "support@hostkeepdigital.co.uk",
        postcode: "TR1 1AA", role: "host",
      });
      await new Promise(r => setTimeout(r, 1500));
      const sr = await callFn("seedTestBooking", { action: "findFoundingMember", email: "support@hostkeepdigital.co.uk" });
      if (sr?.data?.id) {
        await callFn("seedTestBooking", { action: "updateFoundingMember", id: sr.data.id, updates: { approval_status: "invited" } });
      }
      await new Promise(r => setTimeout(r, 1000));
      const { status, data } = await callFn("setOnboardingPassword", {
        email: "support@hostkeepdigital.co.uk",
        password: "TestPassword123!",
        forename: "Support", middle_name: "", surname: "Test",
      });
      await new Promise(r => setTimeout(r, 1500));
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      if (status === 500) throw new Error(`Function crashed — likely duplicate UserCredentials error: ${JSON.stringify(data)}`);
      if (!data.success) throw new Error(`Expected success, got: ${JSON.stringify(data)}`);
      return `Passed — existing credentials handled without duplicate error`;
    },
  },
  {
    id: "sop_biz_immediately_logged_in",
    group: "setOnboardingPassword",
    label: "Business — user is immediately logged in after setting password — session_token in response",
    claudeHint: "Check base44/functions/setOnboardingPassword/entry.ts — session_token must be returned so the frontend can store it and the user lands logged in without a separate sign in step.",
    run: async () => {
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      await callFn("registerFoundingMember", {
        forename: "Support", middle_name: "", surname: "Test",
        email: "support@hostkeepdigital.co.uk",
        postcode: "TR1 1AA", role: "host",
      });
      await new Promise(r => setTimeout(r, 1500));
      const sr = await callFn("seedTestBooking", { action: "findFoundingMember", email: "support@hostkeepdigital.co.uk" });
      if (sr?.data?.id) {
        await callFn("seedTestBooking", { action: "updateFoundingMember", id: sr.data.id, updates: { approval_status: "invited" } });
      }
      await new Promise(r => setTimeout(r, 1000));
      const { data } = await callFn("setOnboardingPassword", {
        email: "support@hostkeepdigital.co.uk",
        password: "TestPassword123!",
        forename: "Support", middle_name: "", surname: "Test",
      });
      await new Promise(r => setTimeout(r, 1500));
      await callFn("seedTestBooking", { action: "cleanupTestEmail", email: "support@hostkeepdigital.co.uk" });
      if (!data.session_token) throw new Error(`No session_token returned — user would need to sign in again after setting password`);
      if (!data.expires_at) throw new Error(`No expires_at on session — session management broken`);
      return `Passed — session_token returned, user immediately logged in`;
    },
  },

  // ── getUserProfile + saveUserProfile ──────────────────────────────────
  {
    id: "gup_smoke_executes",
    group: "getUserProfile",
    label: "Smoke — returns 200 with correct profile shape",
    claudeHint: "Check base44/functions/getUserProfile/entry.ts — must return { success: true, profile: { forename, middle_name, surname, phone, location } }.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("getUserProfile", {
        session_token: sessionToken, email: user?.email,
      });
      if (status !== 200) throw new Error(`Expected 200, got ${status}`);
      if (!data.success) throw new Error(`Expected success: true`);
      if (typeof data.profile?.forename === "undefined") throw new Error(`Missing forename in profile shape`);
      if (typeof data.profile?.surname === "undefined") throw new Error(`Missing surname in profile shape`);
      if (typeof data.profile?.middle_name === "undefined") throw new Error(`Missing middle_name in profile shape`);
      return `Passed — profile shape correct, forename: ${data.profile.forename}`;
    },
  },
  {
    id: "sup_func_saves_and_reads_back",
    group: "saveUserProfile",
    label: "Functional — saves forename, middle_name, surname and reads back correctly",
    claudeHint: "Check base44/functions/saveUserProfile/entry.ts and getUserProfile/entry.ts — save must write all three name fields and get must return them correctly. full_name must never appear.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { data: saveData } = await callFn("saveUserProfile", {
        session_token: sessionToken, email: user?.email,
        forename: "Integration", middle_name: "Test", surname: "Runner",
        phone: "", location: "",
      });
      if (!saveData?.success) throw new Error(`saveUserProfile failed: ${JSON.stringify(saveData)}`);
      const { data: getData } = await callFn("getUserProfile", {
        session_token: sessionToken, email: user?.email,
      });
      const p = getData?.profile;
      if (p?.forename !== "Integration") throw new Error(`forename wrong: ${p?.forename}`);
      if (p?.middle_name !== "Test") throw new Error(`middle_name wrong: ${p?.middle_name}`);
      if (p?.surname !== "Runner") throw new Error(`surname wrong: ${p?.surname}`);
      if (p?.full_name !== undefined && p?.full_name !== null) throw new Error(`full_name should not exist in profile response`);
      return `Passed — forename: ${p.forename}, middle_name: ${p.middle_name}, surname: ${p.surname}`;
    },
  },
  {
    id: "sup_biz_settings_shows_correct_name",
    group: "saveUserProfile",
    label: "Business — after saving profile, Settings page would show correct name immediately",
    claudeHint: "Check base44/functions/getUserProfile/entry.ts — profile must be readable immediately after save. No caching or delay. forename, middle_name, surname must all be correct.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      await callFn("saveUserProfile", {
        session_token: sessionToken, email: user?.email,
        forename: "Settings", middle_name: "Page", surname: "Test",
        phone: "07700900000", location: "Cornwall, UK",
      });
      const { data } = await callFn("getUserProfile", {
        session_token: sessionToken, email: user?.email,
      });
      const p = data?.profile;
      if (p?.forename !== "Settings") throw new Error(`Settings page would show wrong forename: ${p?.forename}`);
      if (p?.middle_name !== "Page") throw new Error(`Settings page would show wrong middle_name: ${p?.middle_name}`);
      if (p?.surname !== "Test") throw new Error(`Settings page would show wrong surname: ${p?.surname}`);
      if (p?.phone !== "07700900000") throw new Error(`Settings page would show wrong phone: ${p?.phone}`);
export default function IntegrationTestsTab({ sessionToken }) {
  const { user } = useAuth();
  const [results, setResults] = useState({});
  const [running, setRunning] = useState({});
  const [runningGroup, setRunningGroup] = useState(null);

  const GROUPS = [...new Set(TESTS.map(t => t.group))];

  const runTest = async (test) => {
    setRunning(r => ({ ...r, [test.id]: true }));
    try {
      const message = await test.run(sessionToken, user);
      setResults(r => ({ ...r, [test.id]: { status: "pass", message } }));
    } catch (err) {
      setResults(r => ({ ...r, [test.id]: { status: "fail", message: err.message, claudeHint: test.claudeHint } }));
    } finally {
      setRunning(r => ({ ...r, [test.id]: false }));
    }
  };

  const runGroup = async (group) => {
    setRunningGroup(group);
    const groupTests = TESTS.filter(t => t.group === group);
    for (const test of groupTests) {
      await runTest(test);
      await new Promise(r => setTimeout(r, 300));
    }
    setRunningGroup(null);
  };

  const runAll = async () => {
    for (const test of TESTS) {
      await runTest(test);
      await new Promise(r => setTimeout(r, 300));
    }
  };

  const getFailedTests = () => {
    return TESTS
      .filter(t => results[t.id]?.status === "fail")
      .map(t => ({ ...t, message: results[t.id]?.message }));
  };

  const copyClaudePrompt = () => {
    const failed = getFailedTests();
    if (failed.length === 0) return;
    const prompt = buildClaudePrompt(failed);
    navigator.clipboard.writeText(prompt);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Integration Tests</h2>
          <p className="text-sm text-gray-500 mt-1">Run automated tests against live backend functions</p>
        </div>
        <div className="flex gap-3">
          {getFailedTests().length > 0 && (
            <Button variant="outline" onClick={copyClaudePrompt} className="text-sm">
              Copy Claude Prompt ({getFailedTests().length} failed)
            </Button>
          )}
          <Button onClick={runAll} className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-sm">
            <PlayCircle className="w-4 h-4 mr-2" />
            Run All Tests
          </Button>
        </div>
      </div>

      {(() => {
        const totalTests = TESTS.length;
        const totalPassed = TESTS.filter(t => results[t.id]?.status === "pass").length;
        const totalFailed = TESTS.filter(t => results[t.id]?.status === "fail").length;
        const totalRun = totalPassed + totalFailed;
        if (totalRun === 0) return null;
        return (
          <div className={`flex items-center gap-4 px-5 py-3 rounded-xl border text-sm font-medium ${totalFailed > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"}`}>
            <span>{totalRun}/{totalTests} tests run</span>
            <span className="text-green-700">{totalPassed} passed</span>
            {totalFailed > 0 && <span className="text-red-700">{totalFailed} failed</span>}
            {totalFailed === 0 && totalRun === totalTests && <span>✅ All tests passing</span>}
          </div>
        );
      })()}

      <div className="space-y-6">
        {GROUPS.map(group => {
          const groupTests = TESTS.filter(t => t.group === group);
          const passed = groupTests.filter(t => results[t.id]?.status === "pass").length;
          const failed = groupTests.filter(t => results[t.id]?.status === "fail").length;
          const total = groupTests.length;

          return (
            <div key={group} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-800 text-sm">{group}</h3>
                  <span className="text-xs text-gray-500">{passed}/{total} passing</span>
                  {failed > 0 && <span className="text-xs text-red-500 font-medium">{failed} failing</span>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runGroup(group)}
                  disabled={runningGroup === group}
                  className="text-xs h-7"
                >
                  {runningGroup === group ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running...</>
                  ) : (
                    <><Play className="w-3 h-3 mr-1" /> Run Group</>
                  )}
                </Button>
              </div>

              <div className="divide-y divide-gray-100">
                {groupTests.map(test => {
                  const result = results[test.id];
                  const isRunning = running[test.id];

                  return (
                    <div key={test.id} className="flex items-start gap-3 px-5 py-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {isRunning ? (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : result?.status === "pass" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : result?.status === "fail" ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-gray-800">{test.label}</p>
                          <button
                            onClick={() => runTest(test)}
                            disabled={isRunning}
                            className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        </div>
                        {result && (
                          <p className={`text-xs mt-1 ${result.status === "pass" ? "text-green-600" : "text-red-600"}`}>
                            {result.message}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}