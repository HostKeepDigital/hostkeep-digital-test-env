import { useState } from "react";
import { base44 } from "@/api/base44Client";

const NOTIFICATION_TYPES = [
  { type: "booking_request",    label: "Booking Request",       prefKey: "bookings" },
  { type: "booking_confirmed",  label: "Booking Confirmed",     prefKey: "bookings" },
  { type: "booking_cancelled",  label: "Booking Cancelled",     prefKey: "bookings" },
  { type: "new_message",        label: "New Message",           prefKey: "messages" },
  { type: "cleaning_job_assigned", label: "Cleaning Job Assigned", prefKey: "jobs" },
  { type: "payment_received",   label: "Payment Received",      prefKey: "payments" },
  { type: "general",            label: "General",               prefKey: "general" },
];

function Result({ r }) {
  return (
    <div className={`flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0`}>
      <span className={`text-xs font-bold mt-0.5 w-12 flex-shrink-0 ${
        r.status === "PASS" ? "text-green-600" :
        r.status === "FAIL" ? "text-red-600" :
        r.status === "WARN" ? "text-amber-600" : "text-gray-400"
      }`}>{r.status}</span>
      <div>
        <p className="text-xs font-medium text-gray-800">{r.label}</p>
        {r.detail && <p className="text-xs text-gray-500">{r.detail}</p>}
      </div>
    </div>
  );
}

export default function NotificationSystemTester() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [createdIds, setCreatedIds] = useState([]);
  const [cleaning, setCleaning] = useState(false);

  async function runTests() {
    setRunning(true);
    setResults([]);
    const log = [];
    const ids = [];

    // Get a real user to send to (current admin)
    let testUserId = null;
    let testUserEmail = null;
    try {
      const me = await base44.auth.me();
      testUserId = me.id;
      testUserEmail = me.email;
      log.push({ status: "PASS", label: "Fetched test user", detail: `User: ${testUserEmail}` });
    } catch (e) {
      log.push({ status: "FAIL", label: "Could not fetch current user", detail: e.message });
      setResults(log);
      setRunning(false);
      return;
    }

    // Test each notification type
    for (const nt of NOTIFICATION_TYPES) {
      try {
        const res = await base44.functions.invoke("sendNotification", {
          user_id: testUserId,
          type: nt.type,
          title: `[TEST] ${nt.label}`,
          body: `Integration test notification for type: ${nt.type}. Sent at ${new Date().toISOString()}.`,
          link: null,
          force_email: false,
        });

        if (res.data?.success) {
          log.push({ status: "PASS", label: `Notification sent: ${nt.label}`, detail: `type=${nt.type}, prefKey=${nt.prefKey}` });
        } else {
          log.push({ status: "FAIL", label: `sendNotification failed: ${nt.label}`, detail: JSON.stringify(res.data) });
        }
      } catch (e) {
        log.push({ status: "FAIL", label: `Error sending: ${nt.label}`, detail: e.message });
      }
    }

    // Verify DB records were created
    try {
      const allNotifs = await base44.entities.Notification.filter({ user_id: testUserId });
      const testNotifs = allNotifs.filter(n => n.title?.startsWith("[TEST]"));
      testNotifs.forEach(n => ids.push(n.id));

      if (testNotifs.length === NOTIFICATION_TYPES.length) {
        log.push({ status: "PASS", label: "DB records verified", detail: `${testNotifs.length} Notification records created in database` });
      } else {
        log.push({ status: "WARN", label: "DB record count mismatch", detail: `Expected ${NOTIFICATION_TYPES.length}, found ${testNotifs.length}` });
      }
    } catch (e) {
      log.push({ status: "FAIL", label: "DB verification failed", detail: e.message });
    }

    // Test force_email flag
    try {
      const res = await base44.functions.invoke("sendNotification", {
        user_id: testUserId,
        email_to: testUserEmail,
        type: "general",
        title: "[TEST] Force Email",
        body: "This is a forced email test from the notification integration suite.",
        force_email: true,
      });
      if (res.data?.success) {
        log.push({ status: "PASS", label: "Force email notification", detail: `Email dispatched to ${testUserEmail} via Resend` });
      } else {
        log.push({ status: "FAIL", label: "Force email failed", detail: JSON.stringify(res.data) });
      }
    } catch (e) {
      log.push({ status: "FAIL", label: "Force email error", detail: e.message });
    }

    // Test missing fields validation
    try {
      const res = await base44.functions.invoke("sendNotification", {
        user_id: testUserId,
        // missing type, title, body intentionally
      });
      if (res.data?.error === "missing_fields") {
        log.push({ status: "PASS", label: "Missing fields validation", detail: "Returns missing_fields error as expected" });
      } else {
        log.push({ status: "WARN", label: "Missing fields validation", detail: "Did not return expected error" });
      }
    } catch {
      log.push({ status: "PASS", label: "Missing fields validation", detail: "Request rejected (expected)" });
    }

    // Push notification gap notice
    log.push({
      status: "WARN",
      label: "Mobile push (iOS/Android) NOT implemented",
      detail: "sendNotification only creates DB records + sends email. No FCM/APNs push integration exists. To enable, add Firebase Cloud Messaging (FCM) to sendNotification and store device tokens on the User entity.",
    });

    setCreatedIds(ids);
    setResults(log);
    setRunning(false);
  }

  async function cleanup() {
    setCleaning(true);
    // Delete all [TEST] notifications for current user
    try {
      const me = await base44.auth.me();
      const allNotifs = await base44.entities.Notification.filter({ user_id: me.id });
      const testNotifs = allNotifs.filter(n => n.title?.startsWith("[TEST]"));
      for (const n of testNotifs) {
        await base44.entities.Notification.delete(n.id);
      }
    } catch (_) {}
    setCreatedIds([]);
    setCleaning(false);
  }

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const warned = results.filter(r => r.status === "WARN").length;

  return (
    <div className="space-y-4">
      {/* Push notification warning */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <p className="text-xs font-semibold text-blue-700 mb-1">📱 Mobile Push Notifications</p>
        <p className="text-xs text-blue-600">
          The current <code className="bg-blue-100 px-1 rounded">sendNotification</code> function creates in-app DB records and sends emails via Resend.
          <strong> Native iOS/Android push (FCM/APNs) is not yet wired up.</strong> These tests verify the existing in-app + email pipeline.
          Ask to enable FCM push if needed.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={runTests}
          disabled={running}
          className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {running ? "Running tests…" : "▶ Run Notification Tests"}
        </button>
        {createdIds.length > 0 && (
          <button
            onClick={cleanup}
            disabled={cleaning}
            className="px-4 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {cleaning ? "Cleaning…" : "🗑 Clean Up"}
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-1">
          <div className="flex gap-4 mb-3 pb-3 border-b border-gray-200">
            <span className="text-xs font-bold text-green-600">✓ {passed} PASS</span>
            {warned > 0 && <span className="text-xs font-bold text-amber-600">⚠ {warned} WARN</span>}
            {failed > 0 && <span className="text-xs font-bold text-red-600">✗ {failed} FAIL</span>}
          </div>
          {results.map((r, i) => <Result key={i} r={r} />)}
        </div>
      )}

      {createdIds.length > 0 && (
        <p className="text-xs text-gray-400">{createdIds.length} test notification record(s) in DB — click Clean Up to remove.</p>
      )}
    </div>
  );
}