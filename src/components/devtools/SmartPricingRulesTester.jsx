import { useState } from "react";
import { base44 } from "@/api/base44Client";

function Result({ status }) {
  if (!status) return null;
  if (status.type === "ok")  return <p className="text-sm bg-gray-50 text-gray-700 rounded-lg px-4 py-3">{status.message}</p>;
  if (status.type === "err") return <p className="text-sm bg-red-50 text-red-500 rounded-lg px-4 py-3">{status.message}</p>;
  if (status.type === "checks") return (
    <div className="space-y-2">
      {status.checks.map((c, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-50 border border-gray-100">
          <span className="text-sm text-gray-700">{c.label}</span>
          <span className={`text-sm font-medium ${c.pass ? "text-green-600" : "text-red-500"}`}>{c.pass ? "✅ Pass" : "❌ Fail"}</span>
        </div>
      ))}
      <div className={`px-4 py-3 rounded-lg text-sm font-medium ${status.allPass ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
        {status.allPass ? "✅ All checks passed" : "❌ Some checks failed"}
      </div>
    </div>
  );
}

const TEST_RULES = [
  { rule_type: "seasonality", key: "7",    label: "July",                  multiplier: 1.3,  enabled: true },
  { rule_type: "seasonality", key: "1",    label: "January",               multiplier: 0.85, enabled: true },
  { rule_type: "day_of_week", key: "5",    label: "Friday",                multiplier: 1.2,  enabled: true },
  { rule_type: "day_of_week", key: "1",    label: "Monday",                multiplier: 0.9,  enabled: true },
  { rule_type: "lead_time",   key: "0-7",  label: "Last Minute (0-7 days)",multiplier: 1.15, enabled: true },
  { rule_type: "lead_time",   key: "121+", label: "Early Bird (121+ days)",multiplier: 0.95, enabled: true },
];

export default function SmartPricingRulesTester() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(null);
  const [createdIds, setCreatedIds] = useState([]);

  const step1_CreateRules = async () => {
    setLoading(true); setStatus(null);
    try {
      const ids = [];
      for (const rule of TEST_RULES) {
        const r = await base44.entities.SmartPricingRule.create(rule);
        ids.push(r.id);
      }
      setCreatedIds(ids);
      setStatus({ type: "ok", message: `✅ ${ids.length} test rules created — seasonality (July +30%, January -15%), day-of-week (Friday +20%, Monday -10%), lead-time (Last Minute +15%, Early Bird -5%).` });
    } catch (e) {
      setStatus({ type: "err", message: `❌ ${e.message}` });
    }
    setLoading(false);
  };

  const step2_VerifyRules = async () => {
    setLoading(true); setStatus(null);
    try {
      if (!createdIds.length) { setStatus({ type: "err", message: "❌ Run Step 1 first." }); setLoading(false); return; }

      const fetched = await Promise.all(createdIds.map(id => base44.entities.SmartPricingRule.get(id)));

      const julyRule  = fetched.find(r => r.rule_type === "seasonality" && r.key === "7");
      const janRule   = fetched.find(r => r.rule_type === "seasonality" && r.key === "1");
      const friRule   = fetched.find(r => r.rule_type === "day_of_week" && r.key === "5");
      const monRule   = fetched.find(r => r.rule_type === "day_of_week" && r.key === "1");
      const lmRule    = fetched.find(r => r.rule_type === "lead_time"   && r.key === "0-7");
      const ebRule    = fetched.find(r => r.rule_type === "lead_time"   && r.key === "121+");

      const checks = [
        { label: `All ${TEST_RULES.length} rules retrievable`,          pass: fetched.length === TEST_RULES.length },
        { label: "July seasonality multiplier = 1.3 (+30%)",           pass: julyRule?.multiplier === 1.3 },
        { label: "January seasonality multiplier = 0.85 (-15%)",       pass: janRule?.multiplier === 0.85 },
        { label: "Friday day_of_week multiplier = 1.2 (+20%)",         pass: friRule?.multiplier === 1.2 },
        { label: "Monday day_of_week multiplier = 0.9 (-10%)",         pass: monRule?.multiplier === 0.9 },
        { label: "Last Minute lead_time multiplier = 1.15 (+15%)",     pass: lmRule?.multiplier === 1.15 },
        { label: "Early Bird lead_time multiplier = 0.95 (-5%)",       pass: ebRule?.multiplier === 0.95 },
        { label: "All rules have enabled=true",                        pass: fetched.every(r => r.enabled === true) },
        { label: "Labels stored correctly on all rules",               pass: fetched.every(r => !!r.label) },
      ];
      setStatus({ type: "checks", checks, allPass: checks.every(c => c.pass) });
    } catch (e) {
      setStatus({ type: "err", message: `❌ ${e.message}` });
    }
    setLoading(false);
  };

  const step3_TestUpdate = async () => {
    setLoading(true); setStatus(null);
    try {
      if (!createdIds.length) { setStatus({ type: "err", message: "❌ Run Step 1 first." }); setLoading(false); return; }
      const idToUpdate = createdIds[0];
      await base44.entities.SmartPricingRule.update(idToUpdate, { multiplier: 1.5, notes: "Updated by integration test" });
      const updated = await base44.entities.SmartPricingRule.get(idToUpdate);
      const checks = [
        { label: "Multiplier updated to 1.5",          pass: updated.multiplier === 1.5 },
        { label: "Notes field stored",                 pass: updated.notes === "Updated by integration test" },
        { label: "rule_type unchanged after update",   pass: updated.rule_type === "seasonality" },
      ];
      setStatus({ type: "checks", checks, allPass: checks.every(c => c.pass) });
    } catch (e) {
      setStatus({ type: "err", message: `❌ ${e.message}` });
    }
    setLoading(false);
  };

  const step4_SimulateAppliedRate = async () => {
    setLoading(true); setStatus(null);
    try {
      const rules = await base44.entities.SmartPricingRule.list("-created_date", 500);
      // Simulate: base rate £100, July check-in on a Friday, booked 3 days in advance
      const baseRate = 100;
      const july  = rules.find(r => r.rule_type === "seasonality" && r.key === "7");
      const fri   = rules.find(r => r.rule_type === "day_of_week" && r.key === "5");
      const lm    = rules.find(r => r.rule_type === "lead_time"   && r.key === "0-7");

      const seasonMult = july?.multiplier ?? 1;
      const dowMult    = fri?.multiplier  ?? 1;
      const leadMult   = lm?.multiplier   ?? 1;

      const adjusted = baseRate * seasonMult * dowMult * leadMult;

      const checks = [
        { label: "July multiplier found",            pass: !!july && july.multiplier > 1 },
        { label: "Friday multiplier found",          pass: !!fri && fri.multiplier > 1 },
        { label: "Last-Minute multiplier found",     pass: !!lm && lm.multiplier > 1 },
        { label: `Adjusted rate > base (£${baseRate})`, pass: adjusted > baseRate },
        { label: `Computed rate = £${adjusted.toFixed(2)} (£100 × ${seasonMult} × ${dowMult} × ${leadMult})`, pass: adjusted > 0 },
      ];
      setStatus({ type: "checks", checks, allPass: checks.every(c => c.pass) });
    } catch (e) {
      setStatus({ type: "err", message: `❌ ${e.message}` });
    }
    setLoading(false);
  };

  const cleanUp = async () => {
    setLoading(true);
    try {
      for (const id of createdIds) {
        try { await base44.entities.SmartPricingRule.delete(id); } catch (_) {}
      }
      setCreatedIds([]);
      setStatus({ type: "ok", message: `🧹 ${createdIds.length} test rules deleted.` });
    } catch (e) {
      setStatus({ type: "err", message: `❌ Clean-up failed: ${e.message}` });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Smart Pricing Rules Tests</h2>
        <p className="text-xs text-gray-400">Creates rules for all three dimensions, verifies storage and retrieval, tests updates, and simulates a composed rate calculation.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={step1_CreateRules} disabled={loading} className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] disabled:opacity-50">
          1. Create Test Rules
        </button>
        <button onClick={step2_VerifyRules} disabled={loading || !createdIds.length} className="px-4 py-2 text-sm bg-[#0d9488] text-white rounded-lg hover:bg-[#0f766e] disabled:opacity-50">
          2. Verify All Fields
        </button>
        <button onClick={step3_TestUpdate} disabled={loading || !createdIds.length} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
          3. Test Rule Update
        </button>
        <button onClick={step4_SimulateAppliedRate} disabled={loading || !createdIds.length} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
          4. Simulate Applied Rate
        </button>
        {createdIds.length > 0 && (
          <button onClick={cleanUp} disabled={loading} className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">
            🧹 Clean Up
          </button>
        )}
      </div>

      <Result status={status} />
    </div>
  );
}