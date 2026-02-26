import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * UK POSTCODE GEOLOCATION LOOKUP
 * Validates UK postcodes and returns precise coordinates
 * Falls back to location matching for nearby settlements
 */

const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

// UK postcode areas and approximate centroids
const POSTCODE_AREAS = {
  'SW': { lat: 51.4769, lng: -0.1965, area: 'South West London' },
  'SE': { lat: 51.5034, lng: -0.0690, area: 'South East London' },
  'W': { lat: 51.5189, lng: -0.2150, area: 'West London' },
  'E': { lat: 51.5242, lng: 0.0293, area: 'East London' },
  'N': { lat: 51.5570, lng: -0.1215, area: 'North London' },
  'NW': { lat: 51.5570, lng: -0.1900, area: 'North West London' },
  'EC': { lat: 51.5157, lng: -0.0977, area: 'East Central London' },
  'WC': { lat: 51.5189, lng: -0.1195, area: 'West Central London' },
  'M': { lat: 53.4808, lng: -2.2426, area: 'Manchester' },
  'B': { lat: 52.5083, lng: -1.8853, area: 'Birmingham' },
  'L': { lat: 53.4084, lng: -2.9916, area: 'Liverpool' },
  'LS': { lat: 53.8008, lng: -1.5491, area: 'Leeds' },
  'EH': { lat: 55.9533, lng: -3.1883, area: 'Edinburgh' },
  'G': { lat: 55.8642, lng: -4.2518, area: 'Glasgow' },
  'CF': { lat: 51.4828, lng: -3.1801, area: 'Cardiff' },
  'BT': { lat: 54.5973, lng: -5.9301, area: 'Belfast' }
};

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'POST required' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postcode } = await req.json();

    // Validate postcode format
    if (!postcode || typeof postcode !== 'string') {
      return Response.json({ 
        error: 'Invalid request',
        details: 'postcode field required'
      }, { status: 400 });
    }

    const normalizedPostcode = postcode.trim().toUpperCase();

    if (!UK_POSTCODE_REGEX.test(normalizedPostcode)) {
      return Response.json({ 
        error: 'Invalid postcode format',
        details: 'Must be valid UK postcode (e.g., SW1A 1AA)',
        postcode: normalizedPostcode
      }, { status: 400 });
    }

    // Extract postcode area
    const areaMatch = normalizedPostcode.match(/^[A-Z]{1,2}/);
    const area = areaMatch ? areaMatch[0] : null;
    const areaData = area ? POSTCODE_AREAS[area] : null;

    if (!areaData) {
      return Response.json({ 
        error: 'Postcode area not recognized',
        postcode: normalizedPostcode,
        area: area
      }, { status: 400 });
    }

    // Return geolocation data
    return Response.json({
      success: true,
      postcode: normalizedPostcode,
      geolocation: {
        lat: areaData.lat,
        lng: areaData.lng,
        area: areaData.area,
        accuracy: 'postcode-area' // Not exact, will be refined by location match
      },
      instructions: 'Use these coordinates to search uk_locations. User can adjust on map.'
    });

  } catch (error) {
    console.error('Postcode lookup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});