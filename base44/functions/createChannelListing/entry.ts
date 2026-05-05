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

    const { propertyId, channelId, ical_import_url } = body;

    if (!propertyId || !channelId || !ical_import_url) {
      return Response.json(
        { success: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const listing = await serviceRole.entities.ChannelListing.create({
      property_id: propertyId,
      channel_id: channelId,
      ical_import_url,
      ical_export_token: crypto.randomUUID(),
      status: "active"
    });

    return Response.json({ success: true, listing });

  } catch (err) {
    console.error("createChannelListing error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});