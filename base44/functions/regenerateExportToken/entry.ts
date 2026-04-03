import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { channelListingId } = await req.json();

    if (!channelListingId) {
      return Response.json(
        { success: false, error: "missing_channelListingId" },
        { status: 400 }
      );
    }

    const listing = await serviceRole.entities.ChannelListing.get(
      channelListingId
    );

    if (!listing) {
      return Response.json(
        { success: false, error: "listing_not_found" },
        { status: 404 }
      );
    }

    const newToken = crypto.randomUUID();

    const updated = await serviceRole.entities.ChannelListing.update(
      channelListingId,
      { ical_export_token: newToken }
    );

    return Response.json({
      success: true,
      listing: updated
    });
  } catch (err) {
    console.error("regenerateExportToken error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});