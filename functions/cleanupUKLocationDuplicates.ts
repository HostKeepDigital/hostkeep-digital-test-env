import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * UK LOCATION DUPLICATE CLEANUP
 * Removes duplicate locations by slug, keeping only one instance of each
 * Identifies and removes cities that were seeded multiple times
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all locations
    const allLocations = await base44.entities.UKLocation.list();

    // Group by slug to find duplicates
    const slugMap = {};
    const duplicateIds = [];

    allLocations.forEach(loc => {
      if (!slugMap[loc.slug]) {
        slugMap[loc.slug] = [];
      }
      slugMap[loc.slug].push(loc);
    });

    // Identify duplicate IDs to delete (keep first, delete rest)
    Object.entries(slugMap).forEach(([slug, locations]) => {
      if (locations.length > 1) {
        // Keep the first one, mark others for deletion
        locations.slice(1).forEach(loc => {
          duplicateIds.push({
            id: loc.id,
            name: loc.name,
            type: loc.type,
            slug: slug
          });
        });
      }
    });

    // Delete duplicates one by one
    let deletedCount = 0;
    for (const duplicate of duplicateIds) {
      try {
        // Use filter to delete by id
        await base44.entities.UKLocation.delete(duplicate.id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete ${duplicate.name} (${duplicate.id}):`, error.message);
      }
    }

    // Verify cleanup
    const finalLocations = await base44.entities.UKLocation.list();
    const finalSlugs = {};
    let duplicatesRemaining = 0;

    finalLocations.forEach(loc => {
      if (!finalSlugs[loc.slug]) {
        finalSlugs[loc.slug] = 0;
      }
      finalSlugs[loc.slug]++;
      if (finalSlugs[loc.slug] > 1) {
        duplicatesRemaining++;
      }
    });

    const typeCount = {};
    const countryCount = {};
    finalLocations.forEach(loc => {
      typeCount[loc.type] = (typeCount[loc.type] || 0) + 1;
      countryCount[loc.country] = (countryCount[loc.country] || 0) + 1;
    });

    return Response.json({
      success: true,
      message: 'UK Location duplicate cleanup complete',
      cleanup: {
        duplicates_found: duplicateIds.length,
        deleted: deletedCount,
        remaining: duplicateIds.length - deletedCount,
        duplicate_examples: duplicateIds.slice(0, 5)
      },
      final_validation: {
        total_locations: finalLocations.length,
        unique_slugs: Object.keys(finalSlugs).length,
        duplicates_remaining: duplicatesRemaining,
        by_type: typeCount,
        by_country: countryCount
      },
      data_quality: {
        all_duplicates_removed: duplicatesRemaining === 0,
        ready_for_production: duplicatesRemaining === 0
      }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});