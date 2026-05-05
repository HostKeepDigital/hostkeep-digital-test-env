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

    const { channelListingId } = body;

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