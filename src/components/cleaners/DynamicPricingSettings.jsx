/**
 * DynamicPricingSettings
 * Two sections: Last-Minute Urgency Tiers + Seasonal Demand Windows.
 * Fully self-contained — receives `dynamicPricing` object and `onChange` callback.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Zap, CalendarRange, Plus, Trash2, Info } from "lucide-react";
import { nanoid } from "https://esm.sh/nanoid@5.0.7";

const DEFAULT_TIERS = [
  { id: "t1", days_before: 1, uplift_percent: 25, label: "Same day" },
  { id: "t2", days_before: 3, uplift_percent: 15, label: "1–3 days" },
  { id: "t3", days_before: 7, uplift_percent: 10, label: "4–7 days" },
];

const DEFAULT_WINDOWS = [
  { id: "w1", name: "Summer Peak", start_date: "2025-06-01", end_date: "2025-08-31", multiplier: 1.2 },
];

export default function DynamicPricingSettings({ dynamicPricing = {}, onChange }) {
  const [lm, setLm] = useState({
    enabled: dynamicPricing.last_minute?.enabled ?? false,
    tiers: dynamicPricing.last_minute?.tiers?.length
      ? dynamicPricing.last_minute.tiers
      : DEFAULT_TIERS,
  });

  const [seasonal, setSeasonal] = useState({
    enabled: dynamicPricing.seasonal?.enabled ?? false,
    windows: dynamicPricing.seasonal?.windows?.length
      ? dynamicPricing.seasonal.windows
      : DEFAULT_WINDOWS,
  });

  function emit(newLm, newSeasonal) {
    onChange({ last_minute: newLm, seasonal: newSeasonal });
  }

  // ── Last-minute helpers ────────────────────────────────────────────────────
  function toggleLm() {
    const next = { ...lm, enabled: !lm.enabled };
    setLm(next);
    emit(next, seasonal);
  }

  function updateTier(id, field, value) {
    const tiers = lm.tiers.map((t) =>
      t.id === id ? { ...t, [field]: field === "label" ? value : Number(value) } : t
    );
    const next = { ...lm, tiers };
    setLm(next);
    emit(next, seasonal);
  }

  function addTier() {
    const tiers = [...lm.tiers, { id: nanoid(6), days_before: 2, uplift_percent: 10, label: "New tier" }];
    const next = { ...lm, tiers };
    setLm(next);
    emit(next, seasonal);
  }

  function removeTier(id) {
    const tiers = lm.tiers.filter((t) => t.id !== id);
    const next = { ...lm, tiers };
    setLm(next);
    emit(next, seasonal);
  }

  // ── Seasonal helpers ───────────────────────────────────────────────────────
  function toggleSeasonal() {
    const next = { ...seasonal, enabled: !seasonal.enabled };
    setSeasonal(next);
    emit(lm, next);
  }

  function updateWindow(id, field, value) {
    const windows = seasonal.windows.map((w) =>
      w.id === id
        ? { ...w, [field]: field === "name" ? value : field === "multiplier" ? parseFloat(value) || 1 : value }
        : w
    );
    const next = { ...seasonal, windows };
    setSeasonal(next);
    emit(lm, next);
  }

  function addWindow() {
    const windows = [
      ...seasonal.windows,
      { id: nanoid(6), name: "New season", start_date: "", end_date: "", multiplier: 1.1 },
    ];
    const next = { ...seasonal, windows };
    setSeasonal(next);
    emit(lm, next);
  }

  function removeWindow(id) {
    const windows = seasonal.windows.filter((w) => w.id !== id);
    const next = { ...seasonal, windows };
    setSeasonal(next);
    emit(lm, next);
  }

  const sortedTiers = [...lm.tiers].sort((a, b) => a.days_before - b.days_before);

  return (
    <div className="space-y-6">

      {/* ── Last-minute urgency ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-base">Last-Minute Urgency Pricing</CardTitle>
            </div>
            <Switch checked={lm.enabled} onCheckedChange={toggleLm} />
          </div>
          <CardDescription>
            Automatically charge more when a host books a clean at short notice. Each tier triggers if the job
            date is <em>within</em> that many days.
          </CardDescription>
        </CardHeader>

        {lm.enabled && (
          <CardContent className="space-y-4">
            {/* Tier rows */}
            <div className="space-y-3">
              {sortedTiers.map((tier, idx) => (
                <div
                  key={tier.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end bg-amber-50 border border-amber-100 rounded-xl p-3"
                >
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Label</Label>
                    <Input
                      value={tier.label}
                      onChange={(e) => updateTier(tier.id, "label", e.target.value)}
                      className="text-sm h-8"
                      placeholder="e.g. Same day"
                    />
                  </div>
                  <div className="w-28">
                    <Label className="text-xs text-gray-500 mb-1 block">Within (days)</Label>
                    <Input
                      type="number" min="1" max="60"
                      value={tier.days_before}
                      onChange={(e) => updateTier(tier.id, "days_before", e.target.value)}
                      className="text-sm h-8"
                    />
                  </div>
                  <div className="w-28">
                    <Label className="text-xs text-gray-500 mb-1 block">Uplift %</Label>
                    <div className="relative">
                      <Input
                        type="number" min="0" max="200"
                        value={tier.uplift_percent}
                        onChange={(e) => updateTier(tier.id, "uplift_percent", e.target.value)}
                        className="text-sm h-8 pr-6"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeTier(tier.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors mt-5"
                    title="Remove tier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={addTier} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add tier
            </Button>

            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              Tiers are evaluated from smallest to largest. The <strong>first matching tier</strong> applies.
              Example: a booking made 2 days before a clean matches "3 days" but not "1 day".
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Seasonal demand ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-base">Seasonal Demand Multipliers</CardTitle>
            </div>
            <Switch checked={seasonal.enabled} onCheckedChange={toggleSeasonal} />
          </div>
          <CardDescription>
            Increase your rates during busy periods like school holidays or bank holidays. Enter a
            multiplier — 1.2 = 20% uplift, 1.5 = 50% uplift.
          </CardDescription>
        </CardHeader>

        {seasonal.enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {seasonal.windows.map((win) => (
                <div
                  key={win.id}
                  className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end bg-blue-50 border border-blue-100 rounded-xl p-3"
                >
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Season name</Label>
                    <Input
                      value={win.name}
                      onChange={(e) => updateWindow(win.id, "name", e.target.value)}
                      className="text-sm h-8"
                      placeholder="e.g. Summer Peak"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Start date</Label>
                    <Input
                      type="date"
                      value={win.start_date}
                      onChange={(e) => updateWindow(win.id, "start_date", e.target.value)}
                      className="text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">End date</Label>
                    <Input
                      type="date"
                      value={win.end_date}
                      onChange={(e) => updateWindow(win.id, "end_date", e.target.value)}
                      className="text-sm h-8"
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs text-gray-500 mb-1 block">Multiplier</Label>
                    <Input
                      type="number" min="1" max="5" step="0.05"
                      value={win.multiplier}
                      onChange={(e) => updateWindow(win.id, "multiplier", e.target.value)}
                      className="text-sm h-8"
                    />
                  </div>
                  <button
                    onClick={() => removeWindow(win.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors mt-5"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={addWindow} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add season
            </Button>

            {/* Preview table */}
            {seasonal.windows.some((w) => w.name && w.multiplier) && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left font-medium text-gray-500 py-1.5 pr-4">Season</th>
                      <th className="text-left font-medium text-gray-500 py-1.5 pr-4">Period</th>
                      <th className="text-right font-medium text-gray-500 py-1.5">Uplift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonal.windows.filter((w) => w.name).map((w) => (
                      <tr key={w.id} className="border-b border-gray-50">
                        <td className="py-1.5 pr-4 font-medium text-gray-700">{w.name}</td>
                        <td className="py-1.5 pr-4 text-gray-500">
                          {w.start_date && w.end_date
                            ? `${w.start_date} → ${w.end_date}`
                            : "—"}
                        </td>
                        <td className="py-1.5 text-right">
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                            +{Math.round((w.multiplier - 1) * 100)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              Dates repeat annually — year is matched to the year of the scheduled clean date.
              Only the <strong>first matching window</strong> applies per job.
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}