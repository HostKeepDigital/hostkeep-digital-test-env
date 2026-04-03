import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { hostId } = await req.json();

    if (!hostId) {
      return Response.json(
        { success: false, error: "missing_hostId" },
        { status: 400 }
      );
    }

    const properties = await serviceRole.entities.Property.filter({
      owner_id: hostId
    });

    const propertyIds = properties.map((p) => p.id);

    const listings = await serviceRole.entities.ChannelListing.filter({
      property_id: { $in: propertyIds }
    });

    const channels = await serviceRole.entities.Channel.list();
    const channelMap = Object.fromEntries(
      channels.map((c) => [c.id, c.name])
    );

    const grouped = properties.map((p) => ({
      property: p,
      listings: listings
        .filter((l) => l.property_id === p.id)
        .map((l) => ({
          ...l,
          channel_name: channelMap[l.channel_id] || "Unknown"
        }))
    }));

    return Response.json({
      success: true,
      overview: grouped
    });
  } catch (err) {
    console.error("getChannelOverview error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});