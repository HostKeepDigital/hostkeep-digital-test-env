import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { session_token } = body;
    if (!session_token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const base44 = createClientFromRequest(req);
    const sessions = await base44.asServiceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: "Invalid or expired session" }, { status: 401 });
    }
    const serviceRole = base44.asServiceRole;

    const { hostId } = body;

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