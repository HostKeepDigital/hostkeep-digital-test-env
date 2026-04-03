import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return Response.json(
        { success: false, error: "missing_id" },
        { status: 400 }
      );
    }

    const listing = await serviceRole.entities.ChannelListing.get(id);

    if (!listing) {
      return Response.json(
        { success: false, error: "listing_not_found" },
        { status: 404 }
      );
    }

    const updated = await serviceRole.entities.ChannelListing.update(id, updates);

    return Response.json({
      success: true,
      listing: updated
    });

  } catch (err) {
    console.error("updateChannelListing error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});