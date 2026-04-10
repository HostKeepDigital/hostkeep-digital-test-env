import { useState, useMemo } from "react";
import { Calculator, TrendingUp } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const PROPERTY_TYPES = ["cottage","apartment","lodge","chalet","cabin","house","bungalow","caravan"];

export default function PricingSimulatorPanel({ rules, marketRecords }) {
  const [selectedType, setSelectedType] = useState("cottage");
  const [manualBase, setManualBase] = useState("");

  // Find avg nightly rate from market data for selected property type
  const marketBase = useMemo(() => {
    if (!marketRecords?.length) return null;
    const relevant = marketRecords.filter(r =>
      !r.is_stale &&
      r.avg_nightly_rate &&
      (r.property_type?.toLowerCase().includes(selectedType) || selectedType === "all")
    );
    if (!relevant.length) return null;
    return Math.round(relevant.reduce((s, r) => s + r.avg_nightly_rate, 0) / relevant.length);
  }, [marketRecords, selectedType]);

  const baseRate = manualBase ? Number(manualBase) : (marketBase || 120);

  // Build simulation grid: months × days with combined multipliers
  const grid = useMemo(() => {
    return MONTHS.map((month, mi) => {
      const seasonMult = rules.seasonality?.[mi + 1] ?? 1;
      return {
        month,
        days: DAYS.map((day, di) => {
          const dowMult = rules.day_of_week?.[di] ?? 1;
          const combined = seasonMult * dowMult;
          const price = Math.round(baseRate * combined);
          return { day, price, combined };
        }),
        avgPrice: Math.round(baseRate * seasonMult),
        seasonMult,
      };
    });
  }, [rules, baseRate]);

  const allPrices = grid.flatMap(r => r.days.map(d => d.price));
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 1;

  function cellColor(price) {
    const ratio = (price - minPrice) / priceRange;
    if (ratio > 0.75) return "bg-teal-600 text-white";
    if (ratio > 0.5)  return "bg-teal-200 text-teal-900";
    if (ratio > 0.25) return "bg-gray-100 text-gray-700";
    return "bg-red-50 text-red-700";
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Calculator className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Pricing Simulator</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              See projected nightly rates using your current rules + market data
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Property Type</label>
          <div className="flex flex-wrap gap-1.5">
            {PROPERTY_TYPES.map(t => (
              <button
                key={t}
                onClick={() => { setSelectedType(t); setManualBase(""); }}
                className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all capitalize ${
                  selectedType === t
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            Base Rate (£/night)
            {marketBase && !manualBase && (
              <span className="ml-1 text-teal-600">← from market data</span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={manualBase || baseRate}
              onChange={e => setManualBase(e.target.value)}
              className="w-24 border border-gray-200 rounded-lg p-2 text-sm"
              min={10} max={10000}
            />
            {manualBase && marketBase && (
              <button onClick={() => setManualBase("")} className="text-xs text-teal-600 hover:underline">
                Use market avg (£{marketBase})
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
          <span>
            Range: <span className="font-semibold text-gray-800">£{minPrice} – £{maxPrice}</span>
          </span>
        </div>
      </div>

      {/* Grid: months as rows, days as columns */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="py-2 px-2 text-left text-gray-400 font-medium w-12">Month</th>
              <th className="py-2 px-2 text-center text-gray-400 font-medium">Avg</th>
              {DAYS.map(d => (
                <th key={d} className="py-2 px-1 text-center text-gray-400 font-medium min-w-[50px]">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map(({ month, days, avgPrice, seasonMult }) => {
              const pct = Math.round((seasonMult - 1) * 100);
              return (
                <tr key={month} className="border-t border-gray-50">
                  <td className="py-1.5 px-2 font-semibold text-gray-700">{month}</td>
                  <td className="py-1.5 px-2 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-semibold text-gray-800">£{avgPrice}</span>
                      <span className={`text-[10px] font-medium ${pct > 0 ? "text-teal-600" : pct < 0 ? "text-red-500" : "text-gray-400"}`}>
                        {pct !== 0 ? (pct > 0 ? `+${pct}%` : `${pct}%`) : "—"}
                      </span>
                    </div>
                  </td>
                  {days.map(({ day, price, combined }) => {
                    const cp = Math.round((combined - 1) * 100);
                    return (
                      <td key={day} className="py-1 px-1">
                        <div className={`rounded-md text-center py-1 px-1 ${cellColor(price)}`}>
                          <div className="font-semibold">£{price}</div>
                          {cp !== 0 && (
                            <div className="text-[9px] opacity-80">{cp > 0 ? `+${cp}%` : `${cp}%`}</div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 flex-wrap text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-teal-600 inline-block" /> Peak pricing</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-teal-200 inline-block" /> Above average</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Average</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 inline-block" /> Below average</span>
      </div>
    </div>
  );
}