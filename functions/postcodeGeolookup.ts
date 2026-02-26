import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PostCode Geolookup - Returns approximate coordinates for UK postcodes
 * Uses hardcoded postcode area centroids
 */

// UK Postcode Area Centroids (approximate center of each postcode area)
const POSTCODE_AREAS = {
  'SW': { lat: 51.4769, lng: -0.1965, area: 'South West London' },
  'SE': { lat: 51.4892, lng: -0.0801, area: 'South East London' },
  'W': { lat: 51.5148, lng: -0.2017, area: 'West London' },
  'E': { lat: 51.5248, lng: -0.0332, area: 'East London' },
  'N': { lat: 51.5614, lng: -0.1446, area: 'North London' },
  'NW': { lat: 51.5428, lng: -0.1933, area: 'North West London' },
  'EC': { lat: 51.5176, lng: -0.0995, area: 'East Central London' },
  'WC': { lat: 51.5145, lng: -0.1203, area: 'West Central London' },
  'M': { lat: 53.4839, lng: -2.2426, area: 'Manchester' },
  'B': { lat: 52.5086, lng: -1.8853, area: 'Birmingham' },
  'L': { lat: 53.4084, lng: -2.9916, area: 'Liverpool' },
  'LS': { lat: 53.8008, lng: -1.5491, area: 'Leeds' },
  'EH': { lat: 55.9533, lng: -3.1883, area: 'Edinburgh' },
  'G': { lat: 55.8642, lng: -4.2518, area: 'Glasgow' },
  'CF': { lat: 51.4817, lng: -3.1719, area: 'Cardiff' },
  'BT': { lat: 54.5973, lng: -5.9301, area: 'Belfast' },
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { postcode } = body;

    if (!postcode || typeof postcode !== 'string') {
      return Response.json({
        error: 'Postcode required',
        status: 400
      }, { status: 400 });
    }

    // Normalize and validate postcode format
    const normalized = postcode.trim().toUpperCase();
    const POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/;

    if (!POSTCODE_REGEX.test(normalized)) {
      return Response.json({
        error: 'Invalid UK postcode format',
        details: 'Must be valid UK postcode (e.g., SW1A 1AA)',
        postcode: normalized,
        status: 400
      }, { status: 400 });
    }

    // Extract postcode area (first 1-2 letters, sometimes followed by number)
    const areaMatch = normalized.match(/^([A-Z]{1,2})([0-9])?/);
    if (!areaMatch) {
      return Response.json({
        error: 'Could not parse postcode area',
        postcode: normalized,
        status: 400
      }, { status: 400 });
    }

    let areaCode = areaMatch[1];
    
    // Check if it's a London postcode (special handling)
    const londonMatch = normalized.match(/^([A-Z]{1,2})([0-9]{1,2})/);
    if (londonMatch && ['E', 'N', 'NW', 'SE', 'SW', 'W', 'WC', 'EC'].includes(londonMatch[1])) {
      areaCode = londonMatch[1];
    }

    const locationData = POSTCODE_AREAS[areaCode];

    if (!locationData) {
      return Response.json({
        error: 'Postcode area not recognized',
        details: `Area code '${areaCode}' from postcode '${normalized}' not found in database`,
        postcode: normalized,
        status: 400
      }, { status: 400 });
    }

    return Response.json({
      success: true,
      postcode: normalized,
      geolocation: {
        lat: locationData.lat,
        lng: locationData.lng,
        area: locationData.area,
        accuracy: 'postcode-area'
      },
      instructions: 'Use these coordinates to search uk_locations. User can adjust on map.'
    });

  } catch (error) {
    console.error('Postcode lookup error:', error);
    return Response.json({
      error: 'Postcode lookup failed',
      details: error.message,
      status: 500
    }, { status: 500 });
  }
});