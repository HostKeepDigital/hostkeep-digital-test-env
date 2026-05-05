/**
 * Automation handler: fires when a Booking record is created or updated.
 * Sends notifications to the relevant host and/or guest.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const LOCK = Deno.env.get("LOCK_ACCESS_TOKEN");
    if (LOCK && body?.lock_token !== LOCK) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;
    const payload = body;

    const { event, data } = payload;
    if (!data) return Response.json({ ok: true });

    const booking = data;
    const eventType = event?.type;

    // Look up host email so they receive email notifications too
    let hostEmail = null;
    if (booking.host_id) {
      try {
        const hostUser = await serviceRole.entities.User.get(booking.host_id);
        hostEmail = hostUser?.email || null;
      } catch (_) {}
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
          hostEmail
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
            hostEmail
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
        // Notify guest to pay deposit
        if (status === "awaiting_payment" && booking.guest_id) {
          await notify(booking.guest_id, "payment_due", "Complete Your Booking — Deposit Required",
            `Your booking for ${booking.check_in} to ${booking.check_out} is reserved. Please pay your deposit to confirm.`,
            "/MyTrips", booking.guest_email);
        }

        // Notify both parties on check-in
        if (status === "checked_in") {
          if (booking.guest_id) {
            await notify(booking.guest_id, "booking_checked_in", "Welcome! Enjoy Your Stay 🏡",
              `Your stay from ${booking.check_in} to ${booking.check_out} has started. Have a wonderful time!`,
              "/MyTrips", booking.guest_email);
          }
        }

        // Notify both parties on completion
        if (status === "completed") {
          if (booking.guest_id) {
            await notify(booking.guest_id, "booking_completed", "Stay Complete — Leave a Review",
              `Your stay has ended. We hope you had a great time! Leave a review to help future guests.`,
              "/MyTrips", booking.guest_email);
          }
          if (booking.host_id) {
            await notify(booking.host_id, "booking_completed", "Stay Completed — Payout Processing",
              `${booking.guest_name || "Your guest"}'s stay is complete. Your payout will be processed within 24 hours.`,
              "/HostBookings", hostEmail);
          }
        }
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("onBookingCreated error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});