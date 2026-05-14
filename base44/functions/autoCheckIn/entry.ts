import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const now = new Date();
    const rental_release_due_at = new Date(now.getTime() + 86400000).toISOString();

    const confirmedBookings = await sr.entities.Booking.filter({ booking_status: "confirmed" });

    const eligible = confirmedBookings.filter(b => new Date(b.check_in) <= now);

    const results = [];

    for (const booking of eligible) {
      try {
        await sr.entities.Booking.update(booking.id, {
          booking_status: "checked_in",
          rental_release_due_at,
        });
        results.push({ booking_id: booking.id, status: "advanced" });
      } catch (err) {
        results.push({ booking_id: booking.id, status: "error", reason: err.message });
      }
    }

    const processed = results.filter(r => r.status === "advanced").length;

    return Response.json({ processed, results, ran_at: now.toISOString() });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});