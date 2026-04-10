import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Minus, Save, RefreshCw, Info } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const LEAD_BUCKETS = [
  { key: "0-7",    label: "Last Minute\n(0–7 days)",  min: 0,   max: 7   },
  { key: "8-21",   label: "Short Notice\n(8–21 days)", min: 8,   max: 21  },
  { key: "22-60",  label: "Planned\n(22–60 days)",    min: 22,  max: 60  },
  { key: "61-120", label: "Advance\n(61–120 days)",   min: 61,  max: 120 },
  { key: "121+",   label: "Early Bird\n(121+ days)",  min: 121, max: 9999 },
];

function getLeadBucket(days) {
  if (days == null) return null;
  return LEAD_BUCKETS.find(b => days >= b.min && days <= b.max)?.key ?? null;
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function MultiplierInput({ value, onChange }) {
  const pct = Math.round((value - 1) * 100);
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={-50} max={100} step={5}
        value={pct}
        onChange={e => onChange(1 + Number(e.target.value) / 100)}
        className="w-28 accent-teal-600"
      />
      <span className={`text-xs font-semibold w-14 text-right ${pct > 0 ? "text-teal-600" : pct < 0 ? "text-red-500" : "text-gray-400"}`}>
        {pct > 0 ? `+${pct}%` : `${pct}%`}
      </span>
    </div>
  );
}

function RuleSection({ title, description, rows, ruleType, rules, onRuleChange, chartData, xKey, xLabel }) {
  const maxRate = Math.max(...chartData.map(d => d.avgRate || 0), 1);
  const globalAvg = avg(chartData.map(d => d.avgRate).filter(Boolean));

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
          <Info className="w-3 h-3" />
          <span>Market avg: £{globalAvg.toFixed(0)}/night</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(v) => [`£${v.toFixed(0)}/night`, "Avg Nightly Rate"]}
              contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #f0f0f0" }}
            />
            <ReferenceLine y={globalAvg} stroke="#0d9488" strokeDasharray="3 3" strokeWidth={1} />
            <Bar dataKey="avgRate" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    !entry.avgRate ? "#f3f4f6"
                    : entry.avgRate > globalAvg * 1.1 ? "#0d9488"
                    : entry.avgRate < globalAvg * 0.9 ? "#f87171"
                    : "#94a3b8"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400">Teal = high demand · Red = low demand · Dashed line = market average</p>

      {/* Config table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-2 px-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{xLabel}</th>
              <th className="py-2 px-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Bookings</th>
              <th className="py-2 px-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Rate</th>
              <th className="py-2 px-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">vs Market</th>
              <th className="py-2 px-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Adjustment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => {
              const ruleKey = String(row.key);
              const currentMultiplier = rules[ruleKey] ?? 1;
              const vsAvg = globalAvg > 0 && row.avgRate ? ((row.avgRate / globalAvg - 1) * 100) : 0;
              return (
                <tr key={ruleKey} className="hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-medium text-gray-800 text-xs whitespace-nowrap">{row.label}</td>
                  <td className="py-2.5 px-3 text-gray-500 text-xs">{row.count ?? 0}</td>
                  <td className="py-2.5 px-3 text-gray-700 text-xs font-medium">
                    {row.avgRate ? `£${row.avgRate.toFixed(0)}` : <span className="text-gray-300">No data</span>}
                  </td>
                  <td className="py-2.5 px-3 text-xs">
                    {row.avgRate ? (
                      <span className={`flex items-center gap-1 ${vsAvg > 5 ? "text-teal-600" : vsAvg < -5 ? "text-red-500" : "text-gray-400"}`}>
                        {vsAvg > 5 ? <TrendingUp className="w-3 h-3" /> : vsAvg < -5 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {vsAvg > 0 ? "+" : ""}{vsAvg.toFixed(0)}%
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    <MultiplierInput
                      value={currentMultiplier}
                      onChange={(v) => onRuleChange(ruleType, ruleKey, v)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SmartPricingTab() {
  const [snapshots, setSnapshots] = useState([]);
  const [savedRules, setSavedRules] = useState([]);
  const [rules, setRules] = useState({ seasonality: {}, day_of_week: {}, lead_time: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snapshotCount, setSnapshotCount] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const [snaps, existing] = await Promise.all([
        base44.entities.PricingSnapshot.list("-created_date", 2000),
        base44.entities.SmartPricingRule.list("-created_date", 500),
      ]);
      setSnapshots(snaps || []);
      setSnapshotCount((snaps || []).length);
      setSavedRules(existing || []);

      // Hydrate local rule state from saved rules
      const hydrated = { seasonality: {}, day_of_week: {}, lead_time: {} };
      for (const r of (existing || [])) {
        if (hydrated[r.rule_type]) hydrated[r.rule_type][r.key] = r.multiplier;
      }
      setRules(hydrated);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRuleChange = (ruleType, key, value) => {
    setRules(prev => ({ ...prev, [ruleType]: { ...prev[ruleType], [key]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert all rules
      const allChanges = [
        ...Object.entries(rules.seasonality).map(([key, multiplier]) => ({
          rule_type: "seasonality", key,
          label: MONTHS[Number(key) - 1] || key,
          multiplier,
        })),
        ...Object.entries(rules.day_of_week).map(([key, multiplier]) => ({
          rule_type: "day_of_week", key,
          label: DAYS[Number(key)] || key,
          multiplier,
        })),
        ...Object.entries(rules.lead_time).map(([key, multiplier]) => ({
          rule_type: "lead_time", key,
          label: LEAD_BUCKETS.find(b => b.key === key)?.label.replace("\n", " ") || key,
          multiplier,
        })),
      ];

      for (const change of allChanges) {
        const existing = savedRules.find(r => r.rule_type === change.rule_type && r.key === change.key);
        if (existing) {
          await base44.entities.SmartPricingRule.update(existing.id, { multiplier: change.multiplier, label: change.label, enabled: true });
        } else {
          await base44.entities.SmartPricingRule.create({ ...change, enabled: true });
        }
      }

      toast.success("Smart pricing rules saved");
      await load();
    } catch (e) {
      toast.error("Failed to save: " + e.message);
    }
    setSaving(false);
  };

  // ── Compute analytics from snapshots ───────────────────────────────────────

  const { seasonalityRows, seasonalityChart, dowRows, dowChart, leadRows, leadChart } = useMemo(() => {
    // Group by month
    const byMonth = {};
    const byDow   = {};
    const byLead  = {};

    for (const s of snapshots) {
      if (s.nightly_rate && s.nightly_rate > 0) {
        const m = s.check_in_month;
        const d = s.check_in_day_of_week;
        const lb = getLeadBucket(s.booking_lead_days);

        if (m != null) {
          if (!byMonth[m]) byMonth[m] = [];
          byMonth[m].push(s.nightly_rate);
        }
        if (d != null) {
          if (!byDow[d]) byDow[d] = [];
          byDow[d].push(s.nightly_rate);
        }
        if (lb) {
          if (!byLead[lb]) byLead[lb] = [];
          byLead[lb].push(s.nightly_rate);
        }
      }
    }

    const seasonalityRows = Array.from({ length: 12 }, (_, i) => {
      const key = i + 1;
      const rates = byMonth[key] || [];
      return { key, label: MONTHS[i], count: rates.length, avgRate: rates.length ? avg(rates) : null };
    });

    const dowRows = Array.from({ length: 7 }, (_, i) => {
      const rates = byDow[i] || [];
      return { key: i, label: DAYS[i], count: rates.length, avgRate: rates.length ? avg(rates) : null };
    });

    const leadRows = LEAD_BUCKETS.map(b => {
      const rates = byLead[b.key] || [];
      return { key: b.key, label: b.label.replace("\n", " "), count: rates.length, avgRate: rates.length ? avg(rates) : null };
    });

    return {
      seasonalityRows,
      seasonalityChart: seasonalityRows.map(r => ({ name: r.label, avgRate: r.avgRate })),
      dowRows,
      dowChart: dowRows.map(r => ({ name: r.label, avgRate: r.avgRate })),
      leadRows,
      leadChart: leadRows.map(r => ({ name: r.label.split(" ")[0], avgRate: r.avgRate })),
    };
  }, [snapshots]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Smart Pricing Configuration</h2>
          <p className="text-sm text-gray-400 mt-1">
            Based on <span className="font-semibold text-teal-600">{snapshotCount}</span> historical booking{snapshotCount !== 1 ? "s" : ""}.
            {snapshotCount < 10 && " More data will improve accuracy — snapshots are captured automatically on every confirmed booking."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white">
            <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save Rules"}
          </Button>
        </div>
      </div>

      {snapshotCount === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="text-sm text-amber-700 font-semibold mb-1">No pricing data yet</p>
          <p className="text-xs text-amber-600">
            PricingSnapshots are captured automatically each time a booking is confirmed.
            As bookings come in, the charts below will populate with real market rate data.
            You can still configure adjustments in advance — they'll be stored and ready to use.
          </p>
        </div>
      )}

      {/* Seasonality */}
      <RuleSection
        title="Seasonality — by Month"
        description="Average nightly rates per calendar month across all properties and areas."
        rows={seasonalityRows}
        ruleType="seasonality"
        rules={rules.seasonality}
        onRuleChange={handleRuleChange}
        chartData={seasonalityChart}
        xKey="name"
        xLabel="Month"
      />

      {/* Day of Week */}
      <RuleSection
        title="Day-of-Week Demand"
        description="Average nightly rates by check-in day of week."
        rows={dowRows}
        ruleType="day_of_week"
        rules={rules.day_of_week}
        onRuleChange={handleRuleChange}
        chartData={dowChart}
        xKey="name"
        xLabel="Day"
      />

      {/* Lead Time */}
      <RuleSection
        title="Booking Lead-Time"
        description="How far in advance guests book — higher demand windows may justify rate adjustments."
        rows={leadRows}
        ruleType="lead_time"
        rules={rules.lead_time}
        onRuleChange={handleRuleChange}
        chartData={leadChart}
        xKey="name"
        xLabel="Lead Time"
      />

      {/* Saved rules summary */}
      {savedRules.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Active Rules</h3>
          <div className="flex flex-wrap gap-2">
            {savedRules.filter(r => r.enabled && r.multiplier !== 1).map(r => {
              const pct = Math.round((r.multiplier - 1) * 100);
              return (
                <span key={r.id} className={`text-xs px-3 py-1.5 rounded-full font-medium border ${pct > 0 ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                  {r.label}: {pct > 0 ? "+" : ""}{pct}%
                </span>
              );
            })}
            {savedRules.filter(r => r.enabled && r.multiplier !== 1).length === 0 && (
              <p className="text-xs text-gray-400">No adjustments configured yet — all multipliers are at ×1.0 (no change).</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}