/**
 * scrapeMarketPricing
 * Uses LLM + internet search to gather competitor STR pricing data
 * for a given UK area and property type.
 *
 * Payload: { postcode_area, town, county, property_type, bedrooms }
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { postcode_area, town, county, property_type, bedrooms } = await req.json();

    if (!postcode_area || !property_type) {
      return Response.json({ error: "postcode_area and property_type are required" }, { status: 400 });
    }

    const location = [town, county, `(${postcode_area})`].filter(Boolean).join(", ");
    const bedroomStr = bedrooms ? `${bedrooms}-bedroom ` : "";

    const prompt = `
You are a UK short-term rental market analyst. Research current competitor pricing for ${bedroomStr}${property_type} holiday lets in ${location}, UK.

Search Airbnb, Booking.com, VRBO, and other UK STR platforms for real listings in this area.

Return a JSON object with EXACTLY this structure — all fields required:
{
  "avg_nightly_rate": <number — average £ per night>,
  "min_nightly_rate": <number — cheapest listings>,
  "max_nightly_rate": <number — premium listings>,
  "median_nightly_rate": <number>,
  "sample_size": <number — estimated listings found/analysed>,
  "avg_occupancy_rate": <number — estimated % e.g. 72>,
  "peak_months": <array of month name strings e.g. ["July","August","December"]>,
  "low_months": <array of month name strings e.g. ["January","February","November"]>,
  "weekend_premium_pct": <number — typical % premium for Fri/Sat check-ins e.g. 18>,
  "key_insights": <array of 4-6 short actionable strings for a host>,
  "positioning_advice": <string — 2-3 sentence narrative on pricing strategy for this market>,
  "data_sources": <array of source platform names used>
}

Be realistic and accurate for the UK market. Use current 2025/2026 pricing data.
If specific data is scarce, use reasonable estimates based on comparable UK coastal/rural markets and state this in key_insights.
`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          avg_nightly_rate:     { type: "number" },
          min_nightly_rate:     { type: "number" },
          max_nightly_rate:     { type: "number" },
          median_nightly_rate:  { type: "number" },
          sample_size:          { type: "number" },
          avg_occupancy_rate:   { type: "number" },
          peak_months:          { type: "array", items: { type: "string" } },
          low_months:           { type: "array", items: { type: "string" } },
          weekend_premium_pct:  { type: "number" },
          key_insights:         { type: "array", items: { type: "string" } },
          positioning_advice:   { type: "string" },
          data_sources:         { type: "array", items: { type: "string" } },
        },
      },
    });

    // Delete any existing record for same area+type+bedrooms to avoid stale duplicates
    const existing = await base44.asServiceRole.entities.MarketPricing.filter({
      postcode_area,
      property_type,
      ...(bedrooms ? { bedrooms } : {}),
    });
    for (const r of existing) {
      await base44.asServiceRole.entities.MarketPricing.update(r.id, { is_stale: true });
    }

    // Save new snapshot
    const saved = await base44.asServiceRole.entities.MarketPricing.create({
      postcode_area,
      town: town || null,
      county: county || null,
      property_type,
      bedrooms: bedrooms || null,
      avg_nightly_rate:    result.avg_nightly_rate,
      min_nightly_rate:    result.min_nightly_rate,
      max_nightly_rate:    result.max_nightly_rate,
      median_nightly_rate: result.median_nightly_rate,
      sample_size:         result.sample_size,
      avg_occupancy_rate:  result.avg_occupancy_rate,
      peak_months:         result.peak_months || [],
      low_months:          result.low_months  || [],
      weekend_premium_pct: result.weekend_premium_pct,
      key_insights:        result.key_insights || [],
      positioning_advice:  result.positioning_advice || "",
      data_sources:        result.data_sources || [],
      scraped_at:          new Date().toISOString(),
      is_stale:            false,
    });

    return Response.json({ ok: true, data: saved });
  } catch (err) {
    console.error("scrapeMarketPricing error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});