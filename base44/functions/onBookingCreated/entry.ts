/**
 * Automation handler: fires when a Booking record is created or updated.
 * Sends notifications to the relevant host and/or guest.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;
    const payload = await req.json();

    const { event, data } = payload;
    if (!data) return Response.json({ ok: true });

    const booking = data;
    const eventType = event?.type;

    const notify = async (user_id, type, title, body, link, email_to) => {
      await serviceRole.functions.invoke("sendNotification", {
        user_id, type, title, body, link, email_to,
      });
    };

    if (eventType === "create") {
      // Notify host of new booking request
      if (booking.host_id) {
        await notify(
          booking.host_id,
          "booking_request",
          "New Booking Request",
          `${booking.guest_name || "A guest"} has requested to book your property from ${booking.check_in} to ${booking.check_out}.`,
          "/HostBookings",
          null
        );
      }
    }

    if (eventType === "update") {
      const old = payload.old_data || {};
      const changed = payload.changed_fields || [];

      if (changed.includes("booking_status")) {
        const status = booking.booking_status;

        // Notify guest of booking confirmation
        if (status === "confirmed" && booking.guest_id) {
          await notify(
            booking.guest_id,
            "booking_confirmed",
            "Booking Confirmed! 🎉",
            `Your booking from ${booking.check_in} to ${booking.check_out} has been confirmed. Get ready for your stay!`,
            "/MyTrips",
            booking.guest_email
          );
        }

        // Notify host they confirmed a booking
        if (status === "confirmed" && booking.host_id) {
          await notify(
            booking.host_id,
            "booking_confirmed",
            "Booking Confirmed ✅",
            `You confirmed the booking for ${booking.guest_name || "a guest"} (${booking.check_in} to ${booking.check_out}). Total: £${booking.total_amount?.toFixed(2) || "0.00"}.`,
            "/HostBookings",
            null
          );
        }

        // Notify guest of decline
        if (status === "declined" && booking.guest_id) {
          await notify(
            booking.guest_id,
            "booking_declined",
            "Booking Request Declined",
            `Unfortunately your booking request for ${booking.check_in} to ${booking.check_out} was not accepted. You can search for other available properties.`,
            "/Search",
            booking.guest_email
          );
        }

        // Notify guest of cancellation
        if (status === "cancelled" && booking.guest_id) {
          await notify(
            booking.guest_id,
            "booking_cancelled",
            "Booking Cancelled",
            `Your booking from ${booking.check_in} to ${booking.check_out} has been cancelled.`,
            "/MyTrips",
            booking.guest_email
          );
        }

        // Notify host of guest cancellation
        if (status === "cancelled" && booking.host_id && old.booking_status !== "cancelled") {
          await notify(
            booking.host_id,
            "booking_cancelled",
            "Booking Cancelled by Guest",
            `${booking.guest_name || "A guest"} has cancelled their booking for ${booking.check_in} to ${booking.check_out}.`,
            "/HostBookings",
            null
          );
        }
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("onBookingCreated error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});