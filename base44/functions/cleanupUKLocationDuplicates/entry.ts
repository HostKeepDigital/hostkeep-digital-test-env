import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    // Extract session token
    const body = await req.json().catch(() => ({}));
    const session_token =
      body.session_token || req.headers.get("x-session-token");

    if (!session_token) {
      return Response.json(
        { error: "Missing session token", authenticated: false },
        { status: 401 },
      );
    }

    // Validate session using your new auth model
    const sessionCheck = await serviceRole.functions.invoke(
      "checkSession",
      { session_token },
    );

    const session = sessionCheck?.data;

    if (!session?.authenticated) {
      return Response.json(
        { error: "Invalid or expired session", authenticated: false },
        { status: 401 },
      );
    }

    if (session.role !== "admin") {
      return Response.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Fetch all locations
    const allLocations = await serviceRole.entities.UKLocation.list();

    // Group by slug
    const slugMap = {};
    const duplicateIds = [];

    allLocations.forEach((loc) => {
      if (!slugMap[loc.slug]) slugMap[loc.slug] = [];
      slugMap[loc.slug].push(loc);
    });

    // Identify duplicates
    Object.entries(slugMap).forEach(([slug, locations]) => {
      if (locations.length > 1) {
        locations.slice(1).forEach((loc) => {
          duplicateIds.push({
            id: loc.id,
            name: loc.name,
            type: loc.type,
            slug,
          });
        });
      }
    });

    // Delete duplicates
    let deletedCount = 0;
    for (const duplicate of duplicateIds) {
      try {
        await serviceRole.entities.UKLocation.delete(duplicate.id);
        deletedCount++;
      } catch (error) {
        console.error(
          `Failed to delete ${duplicate.name} (${duplicate.id}):`,
          error.message,
        );
      }
    }

    // Verify cleanup
    const finalLocations = await serviceRole.entities.UKLocation.list();
    const finalSlugs = {};
    let duplicatesRemaining = 0;

    finalLocations.forEach((loc) => {
      finalSlugs[loc.slug] = (finalSlugs[loc.slug] || 0) + 1;
      if (finalSlugs[loc.slug] > 1) duplicatesRemaining++;
    });

    const typeCount = {};
    const countryCount = {};

    finalLocations.forEach((loc) => {
      typeCount[loc.type] = (typeCount[loc.type] || 0) + 1;
      countryCount[loc.country] = (countryCount[loc.country] || 0) + 1;
    });

    return Response.json({
      success: true,
      message: "UK Location duplicate cleanup complete",
      cleanup: {
        duplicates_found: duplicateIds.length,
        deleted: deletedCount,
        remaining: duplicateIds.length - deletedCount,
        duplicate_examples: duplicateIds.slice(0, 5),
      },
      final_validation: {
        total_locations: finalLocations.length,
        unique_slugs: Object.keys(finalSlugs).length,
        duplicates_remaining,
        by_type: typeCount,
        by_country: countryCount,
      },
      data_quality: {
        all_duplicates_removed: duplicatesRemaining === 0,
        ready_for_production: duplicatesRemaining === 0,
      },
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});