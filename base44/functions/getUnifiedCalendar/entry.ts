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