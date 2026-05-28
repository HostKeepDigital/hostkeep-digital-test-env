import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const now = new Date();

    const confirmedBookings = await sr.entities.Booking.filter({ booking_status: "confirmed" });

    // Fallback only: advance once 24h past the scheduled check-in (14:00) has elapsed
    // and the guest still hasn't self-checked-in. (14:00 matches createBookingPaymentIntent.)
    const eligible = confirmedBookings.filter(b => {
      if (!b.check_in) return false;
      const checkInAt14 = new Date(b.check_in);
      checkInAt14.setHours(14, 0, 0, 0);
      const graceDeadline = new Date(checkInAt14.getTime() + 86400000);
      return graceDeadline <= now;
    });

    const results = [];

    for (const booking of eligible) {
      try {
        await sr.entities.Booking.update(booking.id, {
          booking_status: "checked_in",
          checked_in_at: now.toISOString(),
          rental_release_due_at: now.toISOString(),
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