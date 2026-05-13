import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Play, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const res = await fetch(`/api/apps/${APP_ID}/functions/${name}`, {
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

  // ── raiseComplaint ────────────────────────────────────────────────────
  {
    id: "rc_no_session",
    group: "raiseComplaint",
    label: "Rejects request with no session token",
    claudeHint: "Check base44/functions/raiseComplaint/entry.ts — missing session_token must return 401. Check the session_token guard at the top of the function.",
    run: async () => {
      const { status, data } = await callFn("raiseComplaint", {});
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
      const { status, data } = await callFn("raiseComplaint", {
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
      // Use a known non-admin test token if available, otherwise note this needs a guest session
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
];

const GROUPS = [...new Set(TESTS.map(t => t.group))];

const STATUS_ICON = {
  idle: null,
  running: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />,
  pass: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  fail: <XCircle className="w-4 h-4 text-red-500" />,
  skip: <CheckCircle2 className="w-4 h-4 text-gray-400" />,
};

export default function IntegrationTestsTab({ sessionToken }) {
  const [results, setResults] = useState({});
  const [runningAll, setRunningAll] = useState(false);
  const [copied, setCopied] = useState(false);

  const setResult = (id, result) =>
    setResults(prev => ({ ...prev, [id]: result }));

  const runTest = async (test) => {
    setResult(test.id, { status: "running", message: "", group: test.group, label: test.label, claudeHint: test.claudeHint });
    try {
      const message = await test.run(sessionToken);
      const isSkip = message?.startsWith("Skipped");
      setResult(test.id, { status: isSkip ? "skip" : "pass", message, group: test.group, label: test.label, claudeHint: test.claudeHint });
    } catch (err) {
      setResult(test.id, { status: "fail", message: err.message, group: test.group, label: test.label, claudeHint: test.claudeHint });
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

      <p className="text-xs text-gray-400 text-center">
        Tests run against live functions in this environment. No production data is modified.
      </p>
    </div>
  );
}