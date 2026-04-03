import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { channelBookingId } = await req.json();

    if (!channelBookingId) {
      return Response.json(
        { success: false, error: "missing_channelBookingId" },
        { status: 400 }
      );
    }

    await serviceRole.entities.ChannelBooking.delete(channelBookingId);

    return Response.json({
      success: true
    });
  } catch (err) {
    console.error("deleteChannelBooking error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});