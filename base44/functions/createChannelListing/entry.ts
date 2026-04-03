import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { propertyId, channelId, ical_import_url } = await req.json();

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