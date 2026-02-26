import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Haversine distance calculation (km)
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Ranking logic
const calculateScore = (property, params, location) => {
  let score = 0;

  // Exact location match
  if (params.location_id && property.location_id === params.location_id) {
    score += 50;
  }

  // Radius match
  if (params.lat && params.lng && params.radius_km) {
    const distance = haversineDistance(params.lat, params.lng, property.lat, property.lng);
    if (distance <= params.radius_km) {
      score += 40;
    }
  }

  // Property type match
  if (params.property_type && params.property_type.includes(property.property_type)) {
    score += 20;
  }

  // Guest capacity close to request
  if (params.guests && property.max_guests >= params.guests) {
    const extra = property.max_guests - params.guests;
    score += Math.max(10 - extra, 0);
  }

  // Price within range
  if (params.min_price && params.max_price && 
      property.price_per_night >= params.min_price && 
      property.price_per_night <= params.max_price) {
    score += 5;
  }

  return score;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);

    // Parse query parameters
    const params = {
      location_id: url.searchParams.get('location_id'),
      lat: parseFloat(url.searchParams.get('lat')),
      lng: parseFloat(url.searchParams.get('lng')),
      radius_km: parseFloat(url.searchParams.get('radius_km')) || 50,
      guests: parseInt(url.searchParams.get('guests')) || null,
      bedrooms: parseInt(url.searchParams.get('bedrooms')) || null,
      min_price: parseFloat(url.searchParams.get('min_price')) || null,
      max_price: parseFloat(url.searchParams.get('max_price')) || null,
      property_type: url.searchParams.getAll('property_type[]'),
      amenities: url.searchParams.getAll('amenities[]'),
      sort: url.searchParams.get('sort') || 'newest',
      page: parseInt(url.searchParams.get('page')) || 1
    };

    // Base query filter
    const filter = { is_active: true };

    if (params.location_id) {
      filter.location_id = params.location_id;
    }

    if (params.guests) {
      filter.max_guests = { $gte: params.guests };
    }

    if (params.bedrooms) {
      filter.bedrooms = { $gte: params.bedrooms };
    }

    if (params.min_price || params.max_price) {
      filter.price_per_night = {};
      if (params.min_price) filter.price_per_night.$gte = params.min_price;
      if (params.max_price) filter.price_per_night.$lte = params.max_price;
    }

    if (params.property_type && params.property_type.length > 0) {
      filter.property_type = { $in: params.property_type };
    }

    // Fetch properties
    let properties = await base44.entities.Property.filter(filter);

    // Geospatial radius filtering
    if (params.lat && params.lng && params.radius_km) {
      properties = properties.filter(p => {
        if (!p.lat || !p.lng) return false;
        const distance = haversineDistance(params.lat, params.lng, p.lat, p.lng);
        return distance <= params.radius_km;
      });
    }

    // Amenity filtering
    if (params.amenities && params.amenities.length > 0) {
      for (const propertyId of properties.map(p => p.id)) {
        const pivots = await base44.entities.PropertyAmenityPivot.filter({
          property_id: propertyId
        });
        const propertyAmenities = pivots.map(p => p.amenity_id);
        const hasAll = params.amenities.every(a => propertyAmenities.includes(a));
        
        if (!hasAll) {
          properties = properties.filter(p => p.id !== propertyId);
        }
      }
    }

    // Ranking and sorting
    const location = params.location_id 
      ? (await base44.entities.UKLocation.filter({ id: params.location_id }))[0]
      : null;

    properties = properties.map(p => ({
      ...p,
      score: calculateScore(p, params, location)
    }));

    // Sort
    if (params.sort === 'newest') {
      properties.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (params.sort === 'price_asc') {
      properties.sort((a, b) => a.price_per_night - b.price_per_night);
    } else if (params.sort === 'price_desc') {
      properties.sort((a, b) => b.price_per_night - a.price_per_night);
    } else if (params.sort === 'score') {
      properties.sort((a, b) => b.score - a.score);
    }

    // Pagination
    const perPage = 12;
    const offset = (params.page - 1) * perPage;
    const total = properties.length;
    const paginated = properties.slice(offset, offset + perPage);

    return Response.json({
      data: paginated,
      pagination: {
        page: params.page,
        per_page: perPage,
        total,
        pages: Math.ceil(total / perPage)
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});