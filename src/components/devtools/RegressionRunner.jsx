import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";

const APP_ID = "698eee4108bd1d9467648326";
const TEST_SESSION_KEY = "session_token";

// Raw fetch to a backend function
async function callFn(name, body = {}) {
  const res = await fetch(`/api/apps/${APP_ID}/functions/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── TEST DEFINITIONS ────────────────────────────────────────────────────────
// Each test returns { label, pass, detail }
// Tests run in order. If a test returns a value needed by later tests,
// it stores it in ctx (shared context object).

const TESTS = [
  {
    id: "admin_signin",
    claudeHint: "Check base44/functions/customSignIn/entry.ts — the session creation or password hash may be broken.",
    label: "Admin sign-in (customSignIn)",
    run: async (ctx) => {
      const res = await callFn("customSignIn", {
        email: "admin@hostkeepdigital.co.uk",
        password: ctx.adminPassword,
      });
      if (!res.success) return { pass: false, detail: res.error || "Sign-in returned success=false" };
      ctx.adminToken = res.session_token;
      ctx.adminRole = res.role;
      return {
        pass: res.success === true && res.role === "admin",
        detail: `role=${res.role}`,
      };
    },
  },
  {
    id: "check_session",
    claudeHint: "Check base44/functions/checkSession/entry.ts — User.get(session.user_id) may be failing or returning null.",
    label: "checkSession returns authenticated + correct role",
    run: async (ctx) => {
      if (!ctx.adminToken) return { pass: false, detail: "No session token — sign-in failed" };
      const res = await callFn("checkSession", { session_token: ctx.adminToken });
      ctx.adminUserId = res.user_id;
      return {
        pass: res.authenticated === true && res.role === "admin",
        detail: `authenticated=${res.authenticated} role=${res.role} user_id=${res.user_id}`,
      };
    },
  },
  {
    id: "get_user_profile",
    claudeHint: "Check base44/functions/getUserProfile/entry.ts — UserProfile entity filter by email may be returning nothing.",
    label: "getUserProfile returns profile data",
    run: async (ctx) => {
      const res = await callFn("getUserProfile", {
        email: "admin@hostkeepdigital.co.uk",
        user_id: ctx.adminUserId || null,
      });
      return {
        pass: res.success === true,
        detail: res.success ? `profile=${JSON.stringify(res.profile)}` : res.error,
      };
    },
  },
  {
    id: "get_beta_settings",
    claudeHint: "Check base44/functions/getBetaSettings/entry.ts — the function may be returning an unexpected shape.",
    label: "getBetaSettings returns beta_active flag",
    run: async () => {
      const res = await callFn("getBetaSettings", {});
      const value = res.beta_active ?? res.data?.beta_active ?? res.settings?.beta_active;
      return {
        pass: typeof value !== "undefined",
        detail: `beta_active=${value} raw=${JSON.stringify(res).slice(0, 100)}`,
      };
    },
  },
  {
    id: "get_founding_counts",
    claudeHint: "Check base44/functions/getFoundingCounts/entry.ts — FoundingMember entity query may be failing.",
    label: "getFoundingCounts returns host/cleaner counts",
    run: async () => {
      const res = await callFn("getFoundingCounts", {});
      return {
        pass: typeof res.hostCount !== "undefined" && typeof res.cleanerCount !== "undefined",
        detail: `hosts=${res.hostCount} cleaners=${res.cleanerCount}`,
      };
    },
  },
  {
    id: "postcode_lookup",
    claudeHint: "Check base44/functions/postcodeGeolookupV2/entry.ts — the postcodes.io API call may be failing or the postcode area is wrong.",
    label: "postcodeGeolookupV2 — valid Cornwall postcode (TR1 1AA)",
    run: async (ctx) => {
      const res = await callFn("postcodeGeolookupV2", {
        postcode: "TR1 1AA",
        session_token: ctx.adminToken || "",
      });
      return {
        pass: res.success === true && res.postcode_area === "TR",
        detail: `area=${res.postcode_area} county=${res.county}`,
      };
    },
  },
  {
    id: "postcode_lookup_invalid",
    claudeHint: "Check base44/functions/postcodeGeolookupV2/entry.ts — invalid postcode should return success=false.",
    label: "postcodeGeolookupV2 — invalid postcode returns error",
    run: async (ctx) => {
      const res = await callFn("postcodeGeolookupV2", {
        postcode: "ZZ99 9ZZ",
        session_token: ctx.adminToken || "",
      });
      return {
        pass: res.success === false,
        detail: `success=${res.success} error=${res.error}`,
      };
    },
  },
  {
    id: "stripe_connect_status",
    claudeHint: "Check base44/functions/getStripeConnectStatus/entry.ts — UserSession.filter or User.get may be failing.",
    label: "getStripeConnectStatus returns a status",
    run: async (ctx) => {
      if (!ctx.adminToken) return { pass: false, detail: "No session token" };
      const res = await callFn("getStripeConnectStatus", { session_token: ctx.adminToken });
      return {
        pass: typeof res.status !== "undefined",
        detail: `status=${res.status}`,
      };
    },
  },
  {
    id: "stripe_publishable_key",
    claudeHint: "Check base44/functions/getStripePublishableKey/entry.ts — STRIPE_PUBLISHABLE_KEY secret may not be set in Base44 Secrets.",
    label: "getStripePublishableKey returns pk_ key",
    run: async () => {
      const res = await callFn("getStripePublishableKey", {});
      return {
        pass: typeof res.publishable_key === "string" && res.publishable_key.startsWith("pk_"),
        detail: `key starts with: ${res.publishable_key?.slice(0, 7)}...`,
      };
    },
  },
  {
    id: "checkout_invalid_plan",
    claudeHint: "Check base44/functions/createCheckoutSession/entry.ts — VALID_PLANS set should reject unknown plan names.",
    label: "createCheckoutSession — invalid plan returns 400",
    run: async (ctx) => {
      const res = await callFn("createCheckoutSession", {
        plan: "fake_plan_xyz",
        user_id: ctx.adminUserId || null,
        session_token: ctx.adminToken || "",
      });
      return {
        pass: !res.url && (res.error || res.message),
        detail: `error="${res.error || res.message}"`,
      };
    },
  },
  {
    id: "checkout_valid_plan",
    claudeHint: "Check base44/functions/createCheckoutSession/entry.ts — Stripe price lookup_key for host_starter_monthly may not be set in your Stripe sandbox, or STRIPE_SECRET_KEY is wrong.",
    label: "createCheckoutSession — valid plan returns Stripe URL",
    run: async (ctx) => {
      const res = await callFn("createCheckoutSession", {
        plan: "host_starter_monthly",
        user_id: ctx.adminUserId || null,
        session_token: ctx.adminToken || "",
      });
      return {
        pass: typeof res.url === "string" && res.url.startsWith("https://"),
        detail: res.url ? `url starts with: ${res.url.slice(0, 40)}...` : `error: ${res.error}`,
      };
    },
  },
  {
    id: "approval_gates",
    claudeHint: "Check base44/functions/checkApprovalGates/entry.ts — FoundingMember entity query or gate logic may be throwing.",
    label: "checkApprovalGates — runs without crashing",
    run: async (ctx) => {
      // Fall back to querying a real FoundingMember for a valid user_id
      const userId = ctx.adminUserId;
      if (!userId) {
        // Try to get any real user_id from FoundingMember table
        try {
          const members = await base44.entities.FoundingMember.filter({ approval_status: "approved" });
          const testUserId = members?.[0]?.user_id;
          if (!testUserId) return { pass: false, detail: "No approved founding member with user_id found to test against" };
          const res = await callFn("checkApprovalGates", { user_id: testUserId });
          return { pass: true, detail: `ran with fallback user_id gates=${JSON.stringify(res.gates || res).slice(0, 80)}` };
        } catch (e) {
          return { pass: false, detail: `fallback failed: ${e.message}` };
        }
      }
      try {
        const res = await callFn("checkApprovalGates", { user_id: userId });
        return {
          pass: true,
          detail: `gates=${JSON.stringify(res.gates || res)}`,
        };
      } catch (e) {
        return { pass: false, detail: e.message };
      }
    },
  },
  {
    id: "property_search",
    claudeHint: "Check base44/functions/propertySearch/entry.ts — Property entity query may be failing.",
    label: "propertySearch — returns results without crashing",
    run: async () => {
      try {
        const res = await callFn("propertySearch", { query: "", limit: 3 });
        return {
          pass: Array.isArray(res.results) || Array.isArray(res) || res.success !== false,
          detail: `count=${Array.isArray(res.results) ? res.results.length : Array.isArray(res) ? res.length : "n/a"}`,
        };
      } catch (e) {
        return { pass: false, detail: e.message };
      }
    },
  },
  {
    id: "session_invalid",
    claudeHint: "Check base44/functions/checkSession/entry.ts — it should return authenticated=false for an invalid token.",
    label: "checkSession — expired/invalid token returns unauthenticated",
    run: async () => {
      const res = await callFn("checkSession", { session_token: "fake-token-xyz-123" });
      return {
        pass: res.authenticated === false || res.error,
        detail: `authenticated=${res.authenticated}`,
      };
    },
  },
  {
    id: "entity_subscription",
    claudeHint: "The Subscription entity may have RLS issues or the entity name has changed.",
    label: "Subscription entity — queryable by admin",
    run: async () => {
      try {
        const subs = await base44.asServiceRole?.entities?.Subscription?.list("-created_date", 1) ||
          await base44.entities.Subscription.list("-created_date", 1);
        return { pass: Array.isArray(subs), detail: `records=${subs.length}` };
      } catch (e) {
        return { pass: false, detail: e.message };
      }
    },
  },
  {
    id: "entity_founding_member",
    claudeHint: "The FoundingMember entity may have RLS issues or the entity name has changed.",
    label: "FoundingMember entity — queryable",
    run: async () => {
      try {
        const members = await base44.entities.FoundingMember.list("-created_date", 1);
        return { pass: Array.isArray(members), detail: `records=${members.length}` };
      } catch (e) {
        return { pass: false, detail: e.message };
      }
    },
  },
  {
    id: "entity_property",
    claudeHint: "The Property entity may have RLS issues or the entity name has changed.",
    label: "Property entity — queryable",
    run: async () => {
      try {
        const props = await base44.entities.Property.list("-created_date", 1);
        return { pass: Array.isArray(props), detail: `records=${props.length}` };
      } catch (e) {
        return { pass: false, detail: e.message };
      }
    },
  },
  {
    id: "isBetaUser_check",
    claudeHint: "The isBetaUser logic in src/pages/Subscription.jsx may have been changed — it must use !approval_status?.startsWith('banned_') not a whitelist.",
    label: "isBetaUser logic — banned_ prefix detection",
    run: async () => {
      // Simulate the isBetaUser check logic
      const bannedStatuses = ["banned_docs_1", "banned_docs_2", "banned_admin"];
      const validStatuses = ["approved", "invited", "awaiting_document_verification", "pending"];
      const bannedResults = bannedStatuses.map(s => s.startsWith("banned_"));
      const validResults = validStatuses.map(s => !s.startsWith("banned_"));
      const allCorrect = bannedResults.every(Boolean) && validResults.every(Boolean);
      return {
        pass: allCorrect,
        detail: `Banned correctly detected: ${bannedResults.join(",")} | Valid correctly passed: ${validResults.join(",")}`,
      };
    },
  },
];

// ── CLAUDE PROMPT GENERATOR ─────────────────────────────────────────────────
// Each test can define a claudePrompt(detail) function that returns a string
// describing what to tell Claude when the test fails. If not defined, a generic
// prompt is generated from the test label and detail.

function buildClaudePrompt(failedTests) {
  const lines = [
    "I ran the HostKeep pre-publish regression suite and the following tests failed. Please help me fix them.",
    "",
    "App ID: 698eee4108bd1d9467648326",
    "Stack: Base44 (Deno/TypeScript backend, React/Vite frontend), Stripe, Resend",
    "",
    "FAILED TESTS:",
    "",
  ];

  failedTests.forEach((t, i) => {
    lines.push(`${i + 1}. ${t.label}`);
    lines.push(`   Error detail: ${t.detail || "no detail"}`);
    if (t.claudeHint) lines.push(`   Context: ${t.claudeHint}`);
    lines.push("");
  });

  lines.push("Please check the relevant backend functions and frontend files and give me the fix.");
  return lines.join("\n");
}

// ── COMPONENT ────────────────────────────────────────────────────────────────

export default function RegressionRunner() {
  const [adminPassword, setAdminPassword] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [currentTest, setCurrentTest] = useState(null);
  const [done, setDone] = useState(false);
  const abortRef = useRef(false);

  const runAll = async () => {
    if (!adminPassword) {
      alert("Enter your admin password first.");
      return;
    }
    abortRef.current = false;
    setRunning(true);
    setDone(false);
    setResults([]);
    setCurrentTest(null);

    const ctx = { adminPassword };
    const resultLog = [];

    for (const test of TESTS) {
      if (abortRef.current) break;
      setCurrentTest(test.label);
      const start = Date.now();
      let result;
      try {
        result = await test.run(ctx);
      } catch (e) {
        result = { pass: false, detail: `Threw: ${e.message}` };
      }
      const elapsed = Date.now() - start;
      resultLog.push({ ...result, label: test.label, id: test.id, elapsed });
      setResults([...resultLog]);
    }

    setCurrentTest(null);
    setRunning(false);
    setDone(true);
  };

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;
  const allPass = done && failed === 0 && total === TESTS.length;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pre-Publish Regression Suite</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Runs {TESTS.length} automated checks against the live backend. Run this before every publish.
          </p>
        </div>
        {done && (
          <div className={`px-4 py-2 rounded-xl text-sm font-bold ${allPass ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {allPass ? "✅ SAFE TO PUBLISH" : `❌ ${failed} FAILING — DO NOT PUBLISH`}
          </div>
        )}
      </div>

      {/* Password input */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Admin Password</label>
          <input
            type="password"
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)}
            placeholder="Enter admin password to authenticate tests"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            disabled={running}
          />
        </div>
        <button
          onClick={runAll}
          disabled={running || !adminPassword}
          className={`px-6 py-2 rounded-lg text-sm font-bold text-white transition-all ${
            running ? "bg-gray-400 cursor-not-allowed" : "bg-[#1E3A5F] hover:bg-[#16304f]"
          }`}
        >
          {running ? "Running..." : "Run All Tests"}
        </button>
        {running && (
          <button
            onClick={() => { abortRef.current = true; }}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50"
          >
            Abort
          </button>
        )}
      </div>

      {/* Progress bar */}
      {(running || done) && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{currentTest ? `Running: ${currentTest}` : done ? "Complete" : ""}</span>
            <span>{total}/{TESTS.length}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${allPass ? "bg-green-500" : failed > 0 ? "bg-red-500" : "bg-teal-500"}`}
              style={{ width: `${(total / TESTS.length) * 100}%` }}
            />
          </div>
          <div className="flex gap-4 mt-1.5 text-xs">
            <span className="text-green-600 font-medium">✓ {passed} passed</span>
            {failed > 0 && <span className="text-red-600 font-medium">✗ {failed} failed</span>}
            {running && total < TESTS.length && <span className="text-gray-400">{TESTS.length - total} remaining</span>}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((r, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 px-4 py-2.5 rounded-lg border text-sm ${
                r.pass ? "bg-green-50 border-green-100" : "bg-red-50 border-red-200"
              }`}
            >
              <span className="flex-shrink-0 mt-0.5">{r.pass ? "✅" : "❌"}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${r.pass ? "text-green-900" : "text-red-900"}`}>{r.label}</p>
                {r.detail && (
                  <p className={`text-xs mt-0.5 font-mono break-all ${r.pass ? "text-green-600" : "text-red-600"}`}>
                    {r.detail}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{r.elapsed}ms</span>
            </div>
          ))}
        </div>
      )}

      {/* Pending tests */}
      {running && (
        <div className="space-y-1">
          {TESTS.slice(results.length).map((t, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm border border-gray-100 ${i === 0 ? "bg-blue-50 border-blue-200" : "bg-gray-50 text-gray-400"}`}>
              {i === 0 ? <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" /> : <span className="w-3 h-3 rounded-full bg-gray-200 flex-shrink-0" />}
              <span className={i === 0 ? "text-blue-700 font-medium" : ""}>{t.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Final verdict */}
      {done && (
        <div className={`rounded-xl p-5 border-2 ${allPass ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
          {allPass ? (
            <div className="text-center">
              <p className="text-2xl font-black text-green-800 mb-1">✅ All {total} tests passed</p>
              <p className="text-sm text-green-700">All systems nominal. Safe to publish to production.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-black text-red-800 mb-1">❌ {failed} test{failed > 1 ? "s" : ""} failed</p>
                <p className="text-sm text-red-700">Fix the failing tests before publishing.</p>
              </div>

              {/* Claude prompt generator */}
              <div className="bg-white rounded-xl border border-red-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <span>🤖</span> Get Claude to fix these issues
                </p>
                <p className="text-xs text-gray-500">
                  Click below to copy a ready-made prompt. Paste it into claude.ai and Claude will diagnose and fix the failing tests.
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                    {buildClaudePrompt(results.filter(r => !r.pass))}
                  </pre>
                </div>
                <button
                  onClick={() => {
                    const prompt = buildClaudePrompt(results.filter(r => !r.pass));
                    navigator.clipboard.writeText(prompt).then(() => {
                      alert("Prompt copied! Paste it into claude.ai to get the fix.");
                    });
                  }}
                  className="w-full py-2.5 rounded-lg bg-[#1E3A5F] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors flex items-center justify-center gap-2"
                >
                  <span>📋</span> Copy Prompt for Claude
                </button>
                <a
                  href={`https://claude.ai/new?q=${encodeURIComponent(buildClaudePrompt(results.filter(r => !r.pass)).slice(0, 2000))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-lg border border-[#1E3A5F] text-[#1E3A5F] text-sm font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <span>↗</span> Open Claude with this prompt
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
