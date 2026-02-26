import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Advanced property search with structured postcode filtering
 * 
 * Supports:
 * - Exact postcode match (PL13 2JE)
 * - Postcode district match (PL13)
 * - County search
 * - Location ID search
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { 
      postcode, 
      postcode_district, 
      county, 
      location_id,
      limit = 50,
      skip = 0 
    } = await req.json();

    const filters = {};

    // Build query based on provided filters
    if (postcode) {
      // Normalize postcode for exact match
      const normalized = normalizePostcode(postcode);
      if (normalized) {
        filters.postcode = normalized;
      }
    }

    if (postcode_district) {
      filters.postcode_district = postcode_district.toUpperCase();
    }

    if (county) {
      filters.county = county;
    }

    if (location_id) {
      filters.location_id = location_id;
    }

    // Always filter to published properties
    filters.status = 'published';

    // Execute search
    const results = await base44.entities.Property.filter(
      filters,
      '-created_date',
      limit,
      skip
    );

    return Response.json({
      success: true,
      count: results ? results.length : 0,
      filters: {
        postcode: postcode || null,
        postcode_district: postcode_district || null,
        county: county || null,
        location_id: location_id || null
      },
      results: results || []
    });

  } catch (error) {
    return Response.json({
      error: 'Search failed',
      details: error.message
    }, { status: 500 });
  }
});

function normalizePostcode(postcode) {
  if (!postcode || typeof postcode !== 'string') return null;
  
  let normalized = postcode.trim().toUpperCase();
  normalized = normalized.replace(/\s/g, '');
  
  if (normalized.length === 6 || normalized.length === 7) {
    normalized = normalized.slice(0, -3) + ' ' + normalized.slice(-3);
  }
  
  const pattern = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/;
  return pattern.test(normalized) ? normalized : null;
}