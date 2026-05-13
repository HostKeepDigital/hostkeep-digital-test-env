import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json();
    const { action } = body || {};

    if (!action) {
      return Response.json({ error: "missing_action" }, { status: 400 });
    }

    if (action === "create") {
      const { booking } = body;
      if (!booking) {
        return Response.json({ error: "missing_booking_fields" }, { status: 400 });
      }
      const created = await sr.entities.Booking.create(booking);
      return Response.json({ id: created.id });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return Response.json({ error: "missing_id" }, { status: 400 });
      }
      await sr.entities.Booking.delete(id);
      return Response.json({ deleted: true });
    }

    return Response.json({ error: "unrecognised_action" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});