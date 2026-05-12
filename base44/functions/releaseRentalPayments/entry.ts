import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const LOCK_ACCESS_TOKEN = Deno.env.get("LOCK_ACCESS_TOKEN");
const APP_URL = "https://hostkeepdigital.co.uk";

Deno.serve(async (req) => {
  try {
    const sr = createClientFromRequest(req).asServiceRole;
    const now = new Date();

    const bookings = await sr.entities.Booking.filter({
      rental_payment_status: "held",
      rental_frozen: false,
    });

    const dueBookings = bookings.filter((b) =>
      b.rental_release_due_at &&
      new Date(b.rental_release_due_at) <= now &&
      (b.booking_status === "checked_in" || b.booking_status === "completed")
    );

    const results = [];

    for (const booking of dueBookings) {
      try {
        const hostRoles = await sr.entities.UserRole.filter({
          user_id: booking.host_id,
          role: "host",
        });
        const hostRole = hostRoles[0];

        if (!hostRole?.stripe_connect_account_id || hostRole.stripe_connect_status !== "verified") {
          results.push({ booking_id: booking.id, status: "skipped", reason: "host stripe not verified" });
          continue;
        }

        const transferAmount = Math.round(
          ((booking.subtotal || 0) + (booking.cleaning_fee || 0)) * 100
        );

        if (transferAmount <= 0) {
          results.push({ booking_id: booking.id, status: "skipped", reason: "zero transfer amount" });
          continue;
        }

        const stripeRes = await fetch("https://api.stripe.com/v1/transfers", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            amount: transferAmount.toString(),
            currency: "gbp",
            destination: hostRole.stripe_connect_account_id,
            transfer_group: booking.id,
            "metadata[booking_id]": booking.id,
            "metadata[host_id]": booking.host_id,
          }),
        });

        const transfer = await stripeRes.json();

        if (!stripeRes.ok || transfer.error) {
          await fetch(`${APP_URL}/functions/sendNotification`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              service_key: LOCK_ACCESS_TOKEN,
              user_id: booking.host_id,
              type: "payment_received",
              title: "Payout delayed",
              body: "There was an issue processing your rental payout. Our team has been notified and will resolve this shortly.",
              link: "/HostBookings",
            }),
          });
          results.push({ booking_id: booking.id, status: "failed", reason: transfer.error?.message });
          continue;
        }

        await sr.entities.Booking.update(booking.id, {
          rental_payment_status: "transferred",
          payout_triggered_at: now.toISOString(),
        });

        const payoutAmount = ((booking.subtotal || 0) + (booking.cleaning_fee || 0)).toFixed(2);
        await fetch(`${APP_URL}/functions/sendNotification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_key: LOCK_ACCESS_TOKEN,
            user_id: booking.host_id,
            type: "payment_received",
            title: "Rental payment sent",
            body: `Your rental payment of £${payoutAmount} has been transferred to your Stripe account. It should arrive within 2 business days.`,
            link: "/HostBookings",
          }),
        });

        results.push({ booking_id: booking.id, status: "transferred", transfer_id: transfer.id });

      } catch (bookingErr) {
        results.push({ booking_id: booking.id, status: "error", reason: bookingErr.message });
      }
    }

    return Response.json({
      processed: dueBookings.length,
      results,
      ran_at: now.toISOString(),
    });

  } catch (err) {
    console.error("releaseRentalPayments error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});