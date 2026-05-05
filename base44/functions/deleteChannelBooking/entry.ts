import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { session_token, channelBookingId } = body;
    if (!session_token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const base44client = createClientFromRequest(req);
    const sessions = await base44client.asServiceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const base44 = base44client;
    const serviceRole = base44.asServiceRole;

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