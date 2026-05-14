import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json();
    const { booking_id, check_in_time, notes } = body || {};

    if (!booking_id) {
      return Response.json({ success: false, error: "missing_booking_id" }, { status: 400 });
    }

    const bookings = await sr.entities.Booking.filter({ id: booking_id });
    const booking = bookings?.[0];

    if (!booking) {
      return Response.json({ success: false, error: "booking_not_found" }, { status: 404 });
    }

    const checkInDate = check_in_time ? new Date(check_in_time) : new Date();
    const rental_release_due_at = new Date(checkInDate.getTime() + 86400000).toISOString();

    await sr.entities.Booking.update(booking.id, {
      booking_status: "checked_in",
      rental_release_due_at,
      checked_in_at: checkInDate.toISOString(),
      ...(notes ? { check_in_notes: notes } : {}),
    });

    return Response.json({ success: true, booking_id: booking.id, rental_release_due_at });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});