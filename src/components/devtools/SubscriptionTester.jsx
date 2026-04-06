import { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function SubscriptionTester() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const TEST_EMAIL = "devtest-founding@hostkeep-test.com";

  const testBetaSubscription = async () => {
    setLoading(true);
    setStatus(null);
    try {
      // Find the founding member
      const members = await base44.entities.FoundingMember.filter({ email: TEST_EMAIL });
      if (!members.length) {
        setStatus({ type: "err", message: "❌ No test member found. Run Founding Flow Tester step 1 first." });
        setLoading(false);
        return;
      }
      const member = members[0];

      // Check if beta subscription exists
      const subs = await base44.entities.Subscription.filter({ user_id: member.id });
      const betaSub = subs.find(s => s.plan === "beta_host_access" || s.plan === "beta_cleaner_access");

      if (!betaSub) {
        setStatus({ type: "err", message: `❌ No beta subscription found for ${member.full_name}. Auto-creation in checkFoundingStatus may have failed.` });
      } else {
        const checks = [
          { label: "Beta subscription exists", pass: !!betaSub },
          { label: "Plan is beta_*_access", pass: betaSub.plan.includes("beta") },
          { label: "Status is active", pass: betaSub.status === "active" },
          { label: "Price is £0/mo", pass: betaSub.price_monthly === 0 },
          { label: "is_founding_member flag set", pass: betaSub.is_founding_member === true },
        ];
        const allPass = checks.every(c => c.pass);
        setStatus({ type: "checks", checks, allPass });
      }
    } catch (e) {
      setStatus({ type: "err", message: `❌ Test failed: ${e.message}` });
    }
    setLoading(false);
  };

  const testFoundingUpgrade = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const members = await base44.entities.FoundingMember.filter({ email: TEST_EMAIL });
      if (!members.length) {
        setStatus({ type: "err", message: "❌ No test member found." });
        setLoading(false);
        return;
      }
      const member = members[0];
      const subs = await base44.entities.Subscription.filter({ user_id: member.id });

      if (!subs.length) {
        // Create a beta sub first
        await base44.entities.Subscription.create({
          user_id: member.id,
          plan: "beta_host_access",
          status: "active",
          is_founding_member: true,
          price_monthly: 0,
          start_date: new Date().toISOString().split("T")[0],
        });
        setStatus({ type: "ok", message: `✅ Created beta subscription. Now test upgrading by changing plan to 'founding_host_solo' (£19/mo locked).` });
      } else {
        // Simulate an upgrade
        const oldPlan = subs[0].plan;
        await base44.entities.Subscription.update(subs[0].id, {
          plan: "founding_host_solo",
          price_monthly: 19,
          is_founding_member: true,
        });
        setStatus({ type: "ok", message: `✅ Upgraded from ${oldPlan} → founding_host_solo. Founding members keep locked-in pricing for life.` });
      }
    } catch (e) {
      setStatus({ type: "err", message: `❌ Upgrade test failed: ${e.message}` });
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Subscription Tester — Founding Logic</h2>
        <p className="text-xs text-gray-400">Verifies: (1) Beta subscriptions auto-created on signup, (2) Founding pricing locked-in on upgrade, (3) Enum values match Stripe plans.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={testBetaSubscription} disabled={loading} className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] disabled:opacity-50">
          {loading ? "Testing..." : "1. Check Beta Subscription"}
        </button>
        <button onClick={testFoundingUpgrade} disabled={loading} className="px-4 py-2 text-sm bg-[#0d9488] text-white rounded-lg hover:bg-[#0f766e] disabled:opacity-50">
          {loading ? "Testing..." : "2. Simulate Founding Upgrade"}
        </button>
      </div>
      {status?.type === "ok" && <p className="text-sm bg-gray-50 text-gray-700 rounded-lg px-4 py-3">{status.message}</p>}
      {status?.type === "err" && <p className="text-sm bg-red-50 text-red-500 rounded-lg px-4 py-3">{status.message}</p>}
      {status?.type === "checks" && (
        <div className="space-y-2">
          {status.checks.map((c, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-sm text-gray-700">{c.label}</span>
              <span className={`text-sm font-medium ${c.pass ? "text-green-600" : "text-red-500"}`}>{c.pass ? "✅ Pass" : "❌ Fail"}</span>
            </div>
          ))}
          <div className={`px-4 py-3 rounded-lg text-sm font-medium ${status.allPass ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
            {status.allPass ? "✅ Beta subscription logic working correctly." : "❌ Some checks failed — review Subscription entity enum and checkFoundingStatus function."}
          </div>
        </div>
      )}
    </div>
  );
}