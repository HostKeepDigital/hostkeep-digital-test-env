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

    const conflicts = await serviceRole.entities.ChannelBooking.filter({
      property_id: { $in: propertyIds },
      conflict: true
    });

    return Response.json({
      success: true,
      conflicts
    });
  } catch (err) {
    console.error("getConflicts error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});