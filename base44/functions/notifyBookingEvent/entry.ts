import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { session_token, booking_id, event_type, old_status } = body;

    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    if (!session_token) return Response.json({ error: "Unauthorized" }, { status: 200 });
    const sessions = await serviceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: "Unauthorized" }, { status: 200 });
    }

    if (!booking_id || !event_type) {
      return Response.json({ error: "missing_fields" }, { status: 200 });
    }

    const bookings = await serviceRole.entities.Booking.filter({ id: booking_id });
    const booking = bookings?.[0];
    if (!booking) return Response.json({ error: "booking_not_found" }, { status: 200 });

    const LOCK = Deno.env.get("LOCK_ACCESS_TOKEN");

    let hostEmail = null;
    if (booking.host_id) {
      try {
        const hostCreds = await serviceRole.entities.UserCredentials.filter({ user_id: booking.host_id });
        hostEmail = hostCreds?.[0]?.email || null;
      } catch (_) {}
    }

    const notify = async (user_id, type, title, notifBody, link, email_to) => {
      try {
        await serviceRole.functions.invoke("sendNotification", {
          service_key: LOCK,
          user_id, type, title,
          body: notifBody,
          link,
          email_to: email_to || null,
        });
      } catch (e) {
        console.error(`notify failed [${type}]:`, e?.message);
      }
    };

    if (event_type === "requested" && booking.host_id) {
      await notify(booking.host_id, "booking_request", "New Booking Request",
        `${booking.guest_name || "A guest"} has requested to book your property from ${booking.check_in} to ${booking.check_out}.`,
        `/HostBookings?booking=${booking.id}`, hostEmail);
    }

    if (event_type === "awaiting_payment" && booking.guest_id) {
      await notify(booking.guest_id, "payment_due", "Complete Your Booking — Deposit Required",
        `Your booking for ${booking.check_in} to ${booking.check_out} is reserved. Please pay your deposit to confirm.`,
        `/MyTrips?booking=${booking.id}`, booking.guest_email);
    }

    if (event_type === "confirmed") {
      if (booking.guest_id) {
        await notify(booking.guest_id, "booking_confirmed", "Booking Confirmed! 🎉",
          `Your booking from ${booking.check_in} to ${booking.check_out} has been confirmed. Get ready for your stay!`,
          `/MyTrips?booking=${booking.id}`, booking.guest_email);
      }
      if (booking.host_id) {
        await notify(booking.host_id, "booking_confirmed", "Booking Confirmed ✅",
          `You confirmed the booking for ${booking.guest_name || "a guest"} (${booking.check_in} to ${booking.check_out}).`,
          `/HostBookings?booking=${booking.id}`, hostEmail);
      }
    }

    if (event_type === "declined" && booking.guest_id) {
      await notify(booking.guest_id, "booking_declined", "Booking Request Declined",
        `Unfortunately your booking request for ${booking.check_in} to ${booking.check_out} was not accepted.`,
        `/Search`, booking.guest_email);
    }

    if (event_type === "cancelled") {
      if (booking.guest_id) {
        await notify(booking.guest_id, "booking_cancelled", "Booking Cancelled",
          `Your booking from ${booking.check_in} to ${booking.check_out} has been cancelled.`,
          `/MyTrips?booking=${booking.id}`, booking.guest_email);
      }
      if (booking.host_id && old_status !== "cancelled") {
        await notify(booking.host_id, "booking_cancelled", "Booking Cancelled by Guest",
          `${booking.guest_name || "A guest"} has cancelled their booking for ${booking.check_in} to ${booking.check_out}.`,
          `/HostBookings?booking=${booking.id}`, hostEmail);
      }
    }

    if (event_type === "checked_in" && booking.guest_id) {
      await notify(booking.guest_id, "booking_checked_in", "Welcome! Enjoy Your Stay 🏡",
        `Your stay from ${booking.check_in} to ${booking.check_out} has started. Have a wonderful time!`,
        `/MyTrips?booking=${booking.id}`, booking.guest_email);
    }

    if (event_type === "completed") {
      if (booking.guest_id) {
        await notify(booking.guest_id, "booking_completed", "Stay Complete — Leave a Review",
          `Your stay has ended. We hope you had a great time! Leave a review to help future guests.`,
          `/MyTrips?booking=${booking.id}`, booking.guest_email);
      }
      if (booking.host_id) {
        await notify(booking.host_id, "booking_completed", "Stay Completed — Payout Processing",
          `${booking.guest_name || "Your guest"}'s stay is complete. Your payout will be processed within 24 hours.`,
          `/HostBookings?booking=${booking.id}`, hostEmail);
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("notifyBookingEvent error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});