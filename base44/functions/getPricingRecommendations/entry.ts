import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId, currentSettings } = await req.json();

    if (!propertyId) {
      return Response.json({ error: 'Property ID required' }, { status: 400 });
    }

    let property;
    try {
      property = await base44.asServiceRole.entities.Property.get(propertyId);
    } catch (err) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }
    if (!property || property.owner_id !== user.id) {
      return Response.json({ error: 'Not authorized to access this property' }, { status: 403 });
    }

    const baseRate = currentSettings?.base_rate || property.nightly_rate;
    if (!baseRate || !property.property_type || !property.postcode_area) {
      return Response.json({
        error: 'Insufficient property information. Please complete: property type, location, and base nightly rate.',
        status: 'insufficient_data'
      }, { status: 400 });
    }

    // Fetch recent bookings
    let bookings = [];
    try {
      const allBookings = await base44.asServiceRole.entities.Booking.filter(
        { property_id: propertyId },
        '-completed_at',
        50
      );
      bookings = allBookings.filter(b => ['completed', 'checked_in', 'confirmed'].includes(b.booking_status));
    } catch (err) {
      console.log('Error fetching bookings:', err);
    }

    // Find best matching market data — prioritise same bedrooms + type + area
    let areaMarket = null;
    try {
      const allMarket = await base44.asServiceRole.entities.MarketPricing.list('-scraped_at', 50);
      const active = (allMarket || []).filter(m => !m.is_stale);

      // Priority: exact match (area + type + bedrooms), then area + type, then area only
      const exactMatch = active.find(m =>
        m.postcode_area === property.postcode_area &&
        m.property_type === property.property_type &&
        m.bedrooms === property.bedrooms
      );
      const typeMatch = active.find(m =>
        m.postcode_area === property.postcode_area &&
        m.property_type === property.property_type
      );
      const areaMatch = active.find(m => m.postcode_area === property.postcode_area);

      areaMarket = exactMatch || typeMatch || areaMatch || null;
    } catch (err) {
      console.log('Market data unavailable:', err);
    }

    const marketMedian = areaMarket?.median_nightly_rate || areaMarket?.avg_nightly_rate || baseRate;
    const marketMin = areaMarket?.min_nightly_rate || baseRate * 0.65;
    const marketMax = areaMarket?.max_nightly_rate || baseRate * 1.5;
    const weekendPremium = areaMarket?.weekend_premium_pct || 20;
    const occupancy = areaMarket?.avg_occupancy_rate || 65;

    const analysisContext = {
      property: {
        type: property.property_type,
        location: `${property.town || ''}, ${property.county || ''} (${property.postcode_area})`,
        capacity: property.guest_capacity,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        amenities: (property.amenities || []).slice(0, 10),
        currentRate: baseRate,
      },
      bookings: {
        total: bookings.length,
        recent: bookings.slice(0, 10).map(b => ({
          date: b.check_in,
          nights: b.nights,
          rate: b.nightly_rate,
          status: b.booking_status
        }))
      },
      market: {
        matchQuality: areaMarket?.bedrooms === property.bedrooms ? 'exact bedroom match' :
                      areaMarket?.property_type === property.property_type ? 'same property type' :
                      areaMarket ? 'area average only' : 'no market data',
        medianRate: marketMedian,
        minRate: marketMin,
        maxRate: marketMax,
        weekendPremium,
        occupancyRate: occupancy,
        peakMonths: areaMarket?.peak_months || [],
        lowMonths: areaMarket?.low_months || [],
        monthlyIndex: areaMarket?.monthly_rate_index || {},
        keyInsights: areaMarket?.key_insights || [],
        dataSources: areaMarket?.data_sources || [],
      }
    };

    const recommendations = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a UK vacation rental pricing expert. Provide highly specific recommendations for this property.

Property:
- Type: ${analysisContext.property.type}
- Location: ${analysisContext.property.location}
- Bedrooms: ${analysisContext.property.bedrooms}, Bathrooms: ${analysisContext.property.bathrooms}
- Guest capacity: ${analysisContext.property.capacity}
- Notable amenities: ${analysisContext.property.amenities.join(', ') || 'none listed'}
- Current base rate: £${analysisContext.property.currentRate}/night

Market Data (${analysisContext.market.matchQuality}):
- Market median: £${analysisContext.market.medianRate}/night
- Market range: £${analysisContext.market.minRate}–£${analysisContext.market.maxRate}/night
- Typical weekend premium: ${analysisContext.market.weekendPremium}%
- Estimated area occupancy: ${analysisContext.market.occupancyRate}%
- Peak months: ${analysisContext.market.peakMonths.join(', ') || 'July, August'}
- Low months: ${analysisContext.market.lowMonths.join(', ') || 'January, February'}

Booking history (${analysisContext.bookings.total} confirmed):
${analysisContext.bookings.recent.slice(0, 5).map(b => `- ${b.date}: ${b.nights} nights @ £${b.rate}/night`).join('\n') || 'No booking history yet'}

Provide specific £ rates tailored to THIS property's bedroom count and type. A ${analysisContext.property.bedrooms}-bed ${analysisContext.property.type} should NOT have the same rates as a different size property.

Respond with JSON:
{
  "baseRateRecommendation": { "rate": number, "explanation": string },
  "peakSeasonRate": { "rate": number, "dates": string },
  "shoulderSeasonRate": { "rate": number, "dates": string },
  "offPeakRate": { "rate": number, "dates": string },
  "weekendPremium": { "percentage": number, "explanation": string },
  "surgeOpportunities": [{ "dateRange": string, "rate": number, "reason": string }],
  "occupancyForecast": { "estimated_pct": number, "notes": string },
  "competitivePosition": string
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          baseRateRecommendation: {
            type: 'object',
            properties: {
              rate: { type: 'number' },
              explanation: { type: 'string' }
            }
          },
          peakSeasonRate: {
            type: 'object',
            properties: {
              rate: { type: 'number' },
              dates: { type: 'string' }
            }
          },
          shoulderSeasonRate: {
            type: 'object',
            properties: {
              rate: { type: 'number' },
              dates: { type: 'string' }
            }
          },
          offPeakRate: {
            type: 'object',
            properties: {
              rate: { type: 'number' },
              dates: { type: 'string' }
            }
          },
          weekendPremium: {
            type: 'object',
            properties: {
              percentage: { type: 'number' },
              explanation: { type: 'string' }
            }
          },
          surgeOpportunities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dateRange: { type: 'string' },
                rate: { type: 'number' },
                reason: { type: 'string' }
              }
            }
          },
          occupancyForecast: {
            type: 'object',
            properties: {
              estimated_pct: { type: 'number' },
              notes: { type: 'string' }
            }
          },
          competitivePosition: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      propertyContext: analysisContext,
      recommendations
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});