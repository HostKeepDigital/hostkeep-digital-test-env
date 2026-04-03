import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { propertyId } = await req.json();

    if (!propertyId) {
      return Response.json(
        { success: false, error: "missing_propertyId" },
        { status: 400 }
      );
    }

    // Fetch listings
    const listings = await serviceRole.entities.ChannelListing.filter({
      property_id: propertyId
    });

    // Attach channel names
    const channels = await serviceRole.entities.Channel.filter({});
    const channelMap = Object.fromEntries(channels.map(c => [c.id, c.name]));

    const enriched = listings.map(l => ({
      ...l,
      channel_name: channelMap[l.channel_id] || "Unknown"
    }));

    return Response.json({
      success: true,
      listings: enriched
    });

  } catch (err) {
    console.error("getChannelListings error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});