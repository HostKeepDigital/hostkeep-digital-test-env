import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const query = url.searchParams.get('q')?.trim() || '';

    // Validate minimum 3 characters
    if (query.length < 3) {
      return Response.json({ error: 'Query must be at least 3 characters' }, { status: 400 });
    }

    // Search locations with normalized_name starts-with matching
    const normalized = query.toLowerCase();
    const results = await base44.entities.UKLocation.filter({});

    // Client-side filtering for starts-with match
    const filtered = results
      .filter(loc => loc.normalized_name.startsWith(normalized))
      .slice(0, 10)
      .map(loc => ({
        id: loc.id,
        name: loc.name,
        type: loc.type,
        country: loc.country,
        slug: loc.slug
      }));

    return Response.json(filtered);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});