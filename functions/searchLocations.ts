import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    let query = '';
    
    if (req.method === 'POST') {
      const body = await req.json();
      query = body.q || '';
    } else {
      const url = new URL(req.url);
      query = url.searchParams.get('q') || '';
    }

    if (!query || query.length < 1) {
      return Response.json([]);
    }

    const normalized = query.toLowerCase();

    // Search locations by normalized_name (starts with or contains)
    const allLocations = await base44.entities.UKLocation.list();
    
    const results = allLocations
      .filter(loc => 
        loc.normalized_name.startsWith(normalized) || 
        loc.normalized_name.includes(normalized)
      )
      .sort((a, b) => {
        // Prioritize starts-with matches
        const aStarts = a.normalized_name.startsWith(normalized);
        const bStarts = b.normalized_name.startsWith(normalized);
        if (aStarts !== bStarts) return bStarts ? 1 : -1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 10)
      .map(loc => ({
        id: loc.id,
        name: loc.name,
        type: loc.type,
        country: loc.country,
        slug: loc.slug,
        lat: loc.lat,
        lng: loc.lng
      }));

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});