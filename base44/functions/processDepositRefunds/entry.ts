import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";
import Stripe from "npm:stripe@14";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-06-20",
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    // Fetch all bookings with deposit held and booking completed
    const bookings = await sr.entities.Booking.filter({
      deposit_status: "held",
      booking_status: "completed",
    });

    const now = new Date();
    const results = { processed: 0, skipped: 0, errors: 0 };

    for (const booking of bookings) {
      try {
        // Skip disputed deposits
        if (booking.deposit_frozen) {
          results.skipped++;
          continue;
        }

        // Skip missing Stripe deposit intent
        if (!booking.stripe_deposit_intent_id) {
          results.skipped++;
          continue;
        }

        // Check if check_out + 48 hours has passed
        if (!booking.check_out) {
          results.skipped++;
          continue;
        }
        const checkoutPlus48 = new Date(booking.check_out);
        checkoutPlus48.setHours(checkoutPlus48.getHours() + 48);
        if (now < checkoutPlus48) {
          results.skipped++;
          continue;
        }

        // Retrieve PaymentIntent to get latest_charge
        const paymentIntent = await stripe.paymentIntents.retrieve(
          booking.stripe_deposit_intent_id
        );
        const latestChargeId = paymentIntent.latest_charge;

        if (!latestChargeId) {
          console.error(`[processDepositRefunds] No latest_charge for booking ${booking.id}`);
          results.errors++;
          continue;
        }

        // Create refund
        await stripe.refunds.create({
          charge: latestChargeId,
          metadata: {
            booking_id: booking.id,
            type: "security_deposit",
          },
        });

        // Update booking — webhook will set 'refunded' once charge.refunded fires
        await sr.entities.Booking.update(booking.id, {
          deposit_status: "refunding",
        });

        console.log(`[processDepositRefunds] Refund initiated for booking ${booking.id}`);
        results.processed++;
      } catch (err) {
        console.error(`[processDepositRefunds] Error processing booking ${booking.id}:`, err.message);
        results.errors++;
      }
    }

    return Response.json({
      success: true,
      ...results,
      total: bookings.length,
    });
  } catch (err) {
    console.error("[processDepositRefunds] Fatal error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});