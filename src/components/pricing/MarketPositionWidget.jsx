import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Minus, BarChart2 } from "lucide-react";

export default function MarketPositionWidget({ nightlyRate, postcodeArea, propertyType }) {
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postcodeArea) { setLoading(false); return; }

    base44.entities.MarketPricing.list("-created_date", 20)
      .then(records => {
        // Find best match: same postcode_area, then fall back to any record
        const filtered = (records || []).filter(r => r.postcode_area === postcodeArea);
        const best = filtered.length > 0 ? filtered[0] : (records || [])[0];
        setMarket(best || null);
      })
      .finally(() => setLoading(false));
  }, [postcodeArea]);

  if (loading || !market || !nightlyRate) return null;

  const median = market.median_nightly_rate || market.avg_nightly_rate;
  if (!median) return null;

  const diff = ((nightlyRate - median) / median) * 100;
  const absDiff = Math.abs(diff).toFixed(0);

  const isAbove = diff > 5;
  const isBelow = diff < -5;
  const isInline = !isAbove && !isBelow;

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
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Market median for {market.town || market.county || postcodeArea}:{" "}
          <span className="font-medium text-gray-700">£{median}/night</span>
          {" "}· Range: £{market.min_nightly_rate}–£{market.max_nightly_rate}
        </p>
        {market.peak_months?.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            Peak months: {market.peak_months.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}