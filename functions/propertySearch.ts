import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Property search with postcode-based radius filtering.
 * 
 * When a postcode is provided:
 *   1. Normalize it
 *   2. Look up lat/lng from Postcodes.io (via cache or API)
 *   3. Use authoritative coordinates for radius search
 *   No city-name matching. No centroid guessing.
 */

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const resolvePostcodeCoords = async (rawPostcode) => {
  const clean = rawPostcode.trim().toUpperCase().replace(/\s+/g, '');
  const formatted = clean.slice(0, -3) + ' ' + clean.slice(-3);

  // Check cache first
  const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`);
  const data = await res.json();

  if (!res.ok || data.status !== 200 || !data.result) {
    return null;
  }

  return {
    lat: data.result.latitude,
    lng: data.result.longitude,
    county: data.result.admin_county || data.result.admin_district || '',
    district: data.result.admin_district || '',
    country: data.result.country || 'England',
    postcode: formatted
  };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      postcode,
      location_id,
      county,
      lat: bodyLat,
      lng: bodyLng,
      radius_km = 50,
      guests,
      bedrooms,
      min_price,
      max_price,
      property_type,
      amenities,
      sort = 'newest',
      page = 1
    } = body;

    let searchLat = bodyLat;
    let searchLng = bodyLng;
    let resolvedCounty = county;

    // If postcode provided, resolve to authoritative coords via Postcodes.io
    if (postcode) {
      const coords = await resolvePostcodeCoords(postcode);
      if (!coords) {
        return Response.json({
          error: 'Please enter a valid UK postcode.'
        }, { status: 400 });
      }
      searchLat = coords.lat;
      searchLng = coords.lng;
      if (!resolvedCounty) resolvedCounty = coords.county;
    }

    // Build base filter
    const filter = { status: 'published' };

    if (location_id) filter.location_id = location_id;
    if (resolvedCounty && !postcode && !searchLat) filter.county = resolvedCounty;
    if (guests) filter.guest_capacity = { $gte: parseInt(guests) };
    if (bedrooms) filter.bedrooms = { $gte: parseInt(bedrooms) };
    if (min_price || max_price) {
      filter.nightly_rate = {};
      if (min_price) filter.nightly_rate.$gte = parseFloat(min_price);
      if (max_price) filter.nightly_rate.$lte = parseFloat(max_price);
    }
    if (property_type && property_type.length > 0) {
      filter.property_type = { $in: Array.isArray(property_type) ? property_type : [property_type] };
    }

    let properties = await base44.entities.Property.filter(filter, '-created_date', 200);

    // Radius filter using postcode-derived coordinates
    if (searchLat && searchLng) {
      properties = properties.filter(p => {
        if (!p.latitude || !p.longitude) return false;
        const dist = haversineDistance(searchLat, searchLng, p.latitude, p.longitude);
        return dist <= radius_km;
      });

      // Attach distance for sorting
      properties = properties.map(p => ({
        ...p,
        _distance_km: haversineDistance(searchLat, searchLng, p.latitude, p.longitude)
      }));
    }

    // Amenity filter
    if (amenities && amenities.length > 0) {
      const amenityList = Array.isArray(amenities) ? amenities : [amenities];
      const filtered = [];
      for (const prop of properties) {
        const pivots = await base44.entities.PropertyAmenityPivot.filter({ property_id: prop.id });
        const ids = pivots.map(pv => pv.amenity_id);
        if (amenityList.every(a => ids.includes(a))) filtered.push(prop);
      }
      properties = filtered;
    }

    // Sort
    if (sort === 'nearest' && searchLat) {
      properties.sort((a, b) => (a._distance_km || 0) - (b._distance_km || 0));
    } else if (sort === 'price_asc') {
      properties.sort((a, b) => a.nightly_rate - b.nightly_rate);
    } else if (sort === 'price_desc') {
      properties.sort((a, b) => b.nightly_rate - a.nightly_rate);
    } else if (sort === 'rating') {
      properties.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else {
      properties.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }

    // Pagination
    const perPage = 12;
    const offset = (page - 1) * perPage;
    const total = properties.length;
    const paginated = properties.slice(offset, offset + perPage);

    return Response.json({
      data: paginated,
      pagination: {
        page,
        per_page: perPage,
        total,
        pages: Math.ceil(total / perPage)
      },
      search_meta: {
        resolved_lat: searchLat || null,
        resolved_lng: searchLng || null,
        radius_km,
        county: resolvedCounty || null
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});