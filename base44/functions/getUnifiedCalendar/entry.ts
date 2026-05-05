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

    const { propertyId } = body;

    if (!propertyId) {
      return Response.json(
        { success: false, error: "missing_propertyId" },
        { status: 400 }
      );
    }

    const internal = await serviceRole.entities.Booking.filter({
      property_id: propertyId,
      booking_status: { $in: ["confirmed", "blocked"] }
    });

    const external = await serviceRole.entities.ChannelBooking.filter({
      property_id: propertyId,
      status: "confirmed"
    });

    const conflicts = await serviceRole.entities.ChannelBooking.filter({
      property_id: propertyId,
      conflict: true
    });

    return Response.json({
      success: true,
      internal,
      external,
      conflicts
    });
  } catch (err) {
    console.error("getUnifiedCalendar error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});