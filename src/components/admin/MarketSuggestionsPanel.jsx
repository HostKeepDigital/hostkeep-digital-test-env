import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function deriveSuggestions(records) {
  if (!records.length) return null;

  // Aggregate peak/low months across all records, weighted by sample_size
  const monthScore = {}; // +1 for peak, -1 for low
  let totalWeekendPremium = 0;
  let weekendCount = 0;

  for (const r of records) {
    const weight = r.sample_size || 1;
    (r.peak_months || []).forEach(m => {
      const idx = FULL_MONTHS.findIndex(fm => fm.toLowerCase() === m.toLowerCase());
      if (idx >= 0) monthScore[idx + 1] = (monthScore[idx + 1] || 0) + weight;
    });
    (r.low_months || []).forEach(m => {
      const idx = FULL_MONTHS.findIndex(fm => fm.toLowerCase() === m.toLowerCase());
      if (idx >= 0) monthScore[idx + 1] = (monthScore[idx + 1] || 0) - weight;
    });
    if (r.weekend_premium_pct) {
      totalWeekendPremium += r.weekend_premium_pct;
      weekendCount++;
    }
  }

  const avgWeekendPremium = weekendCount > 0 ? totalWeekendPremium / weekendCount : 0;

  // Convert month scores to multipliers
  const maxScore = Math.max(...Object.values(monthScore).map(Math.abs), 1);
  const seasonality = {};
  Object.entries(monthScore).forEach(([month, score]) => {
    const normalised = score / maxScore; // -1 to +1
    if (normalised > 0.3) seasonality[month] = +(1 + normalised * 0.35).toFixed(2); // up to +35%
    else if (normalised < -0.3) seasonality[month] = +(1 + normalised * 0.2).toFixed(2); // down to -20%
  });

  // Weekend premium → day_of_week (Fri=5, Sat=6, Sun=0)
  const day_of_week = {};
  if (avgWeekendPremium > 5) {
    const mult = +(1 + avgWeekendPremium / 100).toFixed(2);
    day_of_week[5] = mult; // Friday
    day_of_week[6] = mult; // Saturday
  }

  return { seasonality, day_of_week, avgWeekendPremium, recordCount: records.length };
}

export default function MarketSuggestionsPanel({ onApply }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    base44.entities.MarketPricing.list("-created_date", 50)
      .then(r => setRecords(r || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!records.length) return null;

  const suggestions = deriveSuggestions(records);
  if (!suggestions) return null;

  const { seasonality, day_of_week, avgWeekendPremium, recordCount } = suggestions;
  const totalSuggestions = Object.keys(seasonality).length + Object.keys(day_of_week).length;

  const handleApply = () => {
    onApply({ seasonality, day_of_week });
    setApplied(true);
    toast.success(`Applied ${totalSuggestions} market-derived pricing suggestions`);
  };

  return (
    <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-teal-900">
              Market-Derived Suggestions Available
            </p>
            <p className="text-xs text-teal-600 mt-0.5">
              Based on {recordCount} market analysis{recordCount > 1 ? "es" : ""} — {totalSuggestions} adjustments ready to apply
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {applied && <CheckCircle className="w-4 h-4 text-teal-600" />}
          {open ? <ChevronUp className="w-4 h-4 text-teal-600" /> : <ChevronDown className="w-4 h-4 text-teal-600" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-teal-200">
          <p className="text-xs text-teal-700 pt-3">
            These suggestions are derived from your market intelligence data. Applying them will pre-fill the sliders below — you can still fine-tune afterwards.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Seasonality suggestions */}
            {Object.keys(seasonality).length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-teal-100">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Seasonal Adjustments</p>
                <div className="space-y-1.5">
                  {Object.entries(seasonality).map(([month, mult]) => {
                    const pct = Math.round((mult - 1) * 100);
                    return (
                      <div key={month} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700">{MONTHS[Number(month) - 1]}</span>
                        <span className={`font-semibold ${pct > 0 ? "text-teal-600" : "text-red-500"}`}>
                          {pct > 0 ? "+" : ""}{pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Day of week suggestions */}
            {avgWeekendPremium > 5 && (
              <div className="bg-white rounded-lg p-4 border border-teal-100">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Weekend Premium</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-700">Friday</span>
                    <span className="font-semibold text-teal-600">+{Math.round(avgWeekendPremium)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-700">Saturday</span>
                    <span className="font-semibold text-teal-600">+{Math.round(avgWeekendPremium)}%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Average weekend premium across your market analyses
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={handleApply}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2 text-sm"
            disabled={applied}
          >
            <Sparkles className="w-4 h-4" />
            {applied ? "Suggestions Applied — Save Rules to Confirm" : "Apply Suggestions to Rules"}
          </Button>
        </div>
      )}
    </div>
  );
}