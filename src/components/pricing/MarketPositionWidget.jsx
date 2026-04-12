import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Minus, BarChart2 } from "lucide-react";

export default function MarketPositionWidget({ nightlyRate, postcodeArea, propertyType, bedrooms, month }) {
  const [market, setMarket] = useState(null);
  const [matchQuality, setMatchQuality] = useState("none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postcodeArea) { setLoading(false); return; }

    base44.entities.MarketPricing.list("-scraped_at", 50)
      .then(records => {
        const active = (records || []).filter(r => !r.is_stale);

        // Priority: exact (area + type + bedrooms), then type match, then area only
        const exact = active.find(r =>
          r.postcode_area === postcodeArea &&
          r.property_type === propertyType &&
          r.bedrooms === bedrooms
        );
        const typeMatch = active.find(r =>
          r.postcode_area === postcodeArea &&
          r.property_type === propertyType
        );
        const areaMatch = active.find(r => r.postcode_area === postcodeArea);

        const best = exact || typeMatch || areaMatch || null;
        setMarket(best);
        setMatchQuality(exact ? "exact" : typeMatch ? "type" : areaMatch ? "area" : "none");
      })
      .finally(() => setLoading(false));
  }, [postcodeArea, propertyType, bedrooms]);

  if (loading) return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-400 animate-pulse">
      Loading market data…
    </div>
  );

  if (!market) return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 flex items-center gap-3">
      <BarChart2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <p className="text-xs text-gray-500">
        No market data yet for this area. Run a market scrape from the Admin panel to see competitor pricing here.
      </p>
    </div>
  );

  if (!nightlyRate) return null;

  const median = market.median_nightly_rate || market.avg_nightly_rate;
  if (!median) return null;

  // UK seasonal peaks
  const seasonalPeaks = [
    { label: "Easter",          months: [3, 4],  boost: 1.25 },
    { label: "Summer",          months: [7, 8],  boost: 1.35 },
    { label: "Half-term (Feb)", months: [2],     boost: 1.15 },
    { label: "Half-term (Oct)", months: [10],    boost: 1.20 },
    { label: "Christmas",       months: [12, 1], boost: 1.30 },
  ];

  const viewMonth = (month || new Date()).getMonth() + 1;
  const currentSeasonalPeak = seasonalPeaks.find(p => p.months.includes(viewMonth));

  // Use monthly_rate_index if available for a more accurate median this month
  const monthName = (month || new Date()).toLocaleString('default', { month: 'long' });
  const monthMultiplier = market.monthly_rate_index?.[monthName] || null;
  const adjustedMedian = monthMultiplier ? Math.round(median * monthMultiplier) : median;

  const diff = ((nightlyRate - adjustedMedian) / adjustedMedian) * 100;
  const absDiff = Math.abs(diff).toFixed(0);
  const isAbove = diff > 5;
  const isBelow = diff < -5;
  const isInline = !isAbove && !isBelow;

  const matchLabel = matchQuality === "exact"
    ? `${market.bedrooms}-bed ${market.property_type}`
    : matchQuality === "type"
    ? `${market.property_type} (all sizes)`
    : `${postcodeArea} area average`;

  return (
    <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${
      isAbove ? "bg-teal-50 border-teal-200"
      : isBelow ? "bg-amber-50 border-amber-200"
      : "bg-gray-50 border-gray-200"
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isAbove ? "bg-teal-100" : isBelow ? "bg-amber-100" : "bg-gray-100"
      }`}>
        <BarChart2 className={`w-4 h-4 ${isAbove ? "text-teal-600" : isBelow ? "text-amber-600" : "text-gray-500"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-semibold ${isAbove ? "text-teal-800" : isBelow ? "text-amber-800" : "text-gray-700"}`}>
            {isAbove
              ? `You're ${absDiff}% above market`
              : isBelow
              ? `You're ${absDiff}% below market`
              : "Your rate is in line with the market"}
          </p>
          {isAbove && <TrendingUp className="w-3.5 h-3.5 text-teal-600" />}
          {isBelow && <TrendingDown className="w-3.5 h-3.5 text-amber-600" />}
          {isInline && <Minus className="w-3.5 h-3.5 text-gray-400" />}
          {currentSeasonalPeak && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
              🔥 Peak — {currentSeasonalPeak.label}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {monthName} median ({matchLabel}):{" "}
          <span className="font-medium text-gray-700">£{adjustedMedian}/night</span>
          {monthMultiplier && adjustedMedian !== median && (
            <span className="text-gray-400"> (base £{median})</span>
          )}
          {" "}· Range: £{market.min_nightly_rate}–£{market.max_nightly_rate}
        </p>
        {matchQuality !== "exact" && (
          <p className="text-xs text-amber-600 mt-0.5">
            ⚠ Using {matchLabel} — run a scrape with exact bedroom count for better accuracy
          </p>
        )}
      </div>
    </div>
  );
}