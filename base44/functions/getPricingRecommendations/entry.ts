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

    // Fetch property details
    const property = await base44.asServiceRole.entities.Property.get(propertyId);
    if (!property || property.owner_id !== user.id) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }

    // Fetch recent bookings to analyze trends
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

    // Fetch market pricing data for the area
    let areaMarket = null;
    try {
      const marketData = await base44.asServiceRole.entities.MarketPricing.list();
      areaMarket = marketData?.find(m => m.postcode_area === property.postcode_area);
    } catch (err) {
      console.log('Market data unavailable:', err);
    }

    // Build analysis context for AI
    const analysisContext = {
      property: {
        type: property.property_type,
        location: `${property.town}, ${property.postcode_area}`,
        capacity: property.guest_capacity,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        currentRate: currentSettings?.base_rate || property.nightly_rate
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
        medianRate: areaMarket?.median_price || currentSettings?.base_rate || property.nightly_rate || 100,
        percentile: areaMarket?.percentile || 50,
        priceRange: {
          min: areaMarket?.price_min || (currentSettings?.base_rate || property.nightly_rate || 100) * 0.7,
          max: areaMarket?.price_max || (currentSettings?.base_rate || property.nightly_rate || 100) * 1.3
        }
      }
    };

    // Call AI to analyze and provide recommendations
    const recommendations = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a vacation rental pricing expert. Analyze this property data and provide dynamic pricing recommendations.

Property Details:
- Type: ${analysisContext.property.type}
- Location: ${analysisContext.property.location}
- Capacity: ${analysisContext.property.capacity} guests
- Bedrooms: ${analysisContext.property.bedrooms}, Bathrooms: ${analysisContext.property.bathrooms}
- Current Base Rate: £${analysisContext.property.currentRate}/night

Booking History (recent ${Math.min(analysisContext.bookings.recent.length, 5)} bookings):
${analysisContext.bookings.recent.slice(0, 5).map(b => `- ${b.date}: ${b.nights} nights @ £${b.rate}/night`).join('\n') || 'No recent bookings available'}

Market Data for ${analysisContext.property.location}:
- Median Rate: £${analysisContext.market.medianRate}/night
- Price Range: £${analysisContext.market.priceRange.min} - £${analysisContext.market.priceRange.max}

Please provide:
1. Base Rate Recommendation: Suggest optimal base rate with explanation
2. Peak Season Rates: Recommend rates for peak periods with dates (Q2, Q3)
3. Shoulder Season Rates: Recommend rates for moderate demand periods (Q1, Q4)
4. Surge Pricing Opportunities: Identify specific dates/events beyond school holidays where higher rates are justified
5. Weekday/Weekend Adjustments: Suggest % premium for weekends

Format response as JSON with keys: baseRateRecommendation, peakSeasonRate, peakSeasonDates, shoulderSeasonRate, shoulderSeasonDates, surgeOpportunities (array with {dateRange, rate, reason}), weekendPremium

Keep explanations brief and data-driven.`,
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
          weekendPremium: {
            type: 'object',
            properties: {
              percentage: { type: 'number' },
              explanation: { type: 'string' }
            }
          }
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