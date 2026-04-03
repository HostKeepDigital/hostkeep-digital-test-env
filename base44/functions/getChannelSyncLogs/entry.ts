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

    const logs = await serviceRole.entities.CalendarSyncJob.filter(
      { channel_listing_id: channelListingId },
      "-run_at",
      50
    );

    return Response.json({
      success: true,
      logs
    });

  } catch (err) {
    console.error("getChannelSyncLogs error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});