/**
 * scrapeMarketPricing
 * Uses LLM + internet search to gather competitor STR pricing data
 * for a specific UK area, property type, and bedroom count.
 *
 * Payload: { postcode_area, town, county, property_type, bedrooms, guest_capacity }
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { postcode_area, town, county, property_type, bedrooms, guest_capacity } = await req.json();

    if (!postcode_area || !property_type) {
      return Response.json({ error: "postcode_area and property_type are required" }, { status: 400 });
    }

    const resolvedType = property_type === "all" ? "holiday let" : property_type;
    const location = [town, county, `(${postcode_area})`].filter(Boolean).join(", ");
    const bedroomStr = bedrooms ? `${bedrooms}-bedroom ` : "";
    const capacityStr = guest_capacity ? ` sleeping up to ${guest_capacity} guests` : "";

    const prompt = `
You are a UK short-term rental market analyst with access to live listing data.

Research CURRENT competitor nightly pricing for: ${bedroomStr}${resolvedType} holiday let${capacityStr} in ${location}, UK.

IMPORTANT — be highly specific:
- Focus ONLY on properties with ${bedrooms || "similar"} bedrooms (NOT general area averages)
- Property type: ${resolvedType}
- Location: ${location}
- Guest capacity: ${guest_capacity || "unspecified"}

Search Airbnb, Booking.com, VRBO, Sykes Cottages, Cottages.com, and Hoseasons for REAL listings matching this specification in 2025/2026.

For context on what drives price differences in this category:
- Size matters: 1-bed vs 2-bed vs 3-bed can vary by 40-80%
- Type matters: a lodge vs a cottage vs an apartment have different demand profiles
- Location micro-factors: sea view, village centre, rural etc.

Return a JSON object — all fields required:
{
  "avg_nightly_rate": <number — mean £/night for this specific bedroom count & type>,
  "min_nightly_rate": <number — budget/basic listings for this spec>,
  "max_nightly_rate": <number — premium/well-reviewed listings for this spec>,
  "median_nightly_rate": <number — typical mid-market rate for this spec>,
  "sample_size": <number — estimated listings analysed>,
  "avg_occupancy_rate": <number — estimated % annual occupancy for this spec, e.g. 68>,
  "peak_months": <array of month names with highest demand e.g. ["July","August","December"]>,
  "low_months": <array of month names with lowest demand e.g. ["January","February","November"]>,
  "weekend_premium_pct": <number — typical % Fri/Sat premium e.g. 22>,
  "monthly_rate_index": <object mapping month names to relative multiplier e.g. {"January": 0.7, "July": 1.4}>,
  "key_insights": <array of 4-6 short actionable strings specific to this property type and bedroom count>,
  "positioning_advice": <string — 2-3 sentence strategy narrative for a host with this specific property>,
  "data_sources": <array of platform names actually searched>
}

Be realistic and granular. A ${bedrooms || 2}-bed ${resolvedType} in ${location} will have DIFFERENT rates than a 4-bed house. Reflect this accurately.
If specific data is scarce, state it clearly in key_insights and extrapolate from comparable UK coastal/rural markets.
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
          monthly_rate_index:   { type: "object" },
          key_insights:         { type: "array", items: { type: "string" } },
          positioning_advice:   { type: "string" },
          data_sources:         { type: "array", items: { type: "string" } },
        },
      },
    });

    // Mark existing records for exact same spec as stale
    const filterQuery = {
      postcode_area,
      property_type: resolvedType,
      ...(town ? { town } : {}),
      ...(bedrooms ? { bedrooms } : {}),
    };
    const existing = await base44.asServiceRole.entities.MarketPricing.filter(filterQuery);
    for (const r of existing) {
      await base44.asServiceRole.entities.MarketPricing.update(r.id, { is_stale: true });
    }

    const saved = await base44.asServiceRole.entities.MarketPricing.create({
      postcode_area,
      town: town || null,
      county: county || null,
      property_type: resolvedType,
      bedrooms: bedrooms || null,
      guest_capacity: guest_capacity || null,
      avg_nightly_rate:    result.avg_nightly_rate,
      min_nightly_rate:    result.min_nightly_rate,
      max_nightly_rate:    result.max_nightly_rate,
      median_nightly_rate: result.median_nightly_rate,
      sample_size:         result.sample_size,
      avg_occupancy_rate:  result.avg_occupancy_rate,
      peak_months:         result.peak_months || [],
      low_months:          result.low_months  || [],
      weekend_premium_pct: result.weekend_premium_pct,
      monthly_rate_index:  result.monthly_rate_index || {},
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