import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14';
import { differenceInHours, differenceInDays } from 'npm:date-fns@3.6.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const results = {
    job1_charged: 0,
    job1_failed: 0,
    job2_cancelled: 0,
    job3_released: 0,
    job4_returned: 0,
    errors: [],
  };

  // JOB 1: Charge balance payment at 56 days before check-in
  try {
    const pendingBalances = await base44.asServiceRole.entities.Booking.filter({
      balance_payment_status: 'pending',
    });

    for (const booking of pendingBalances) {
      try {
        const now = new Date();
        const balanceDueDate = new Date(booking.balance_due_date);

        if (now > balanceDueDate) {
          // Skip if nothing to charge
          if (!booking.remaining_balance || booking.remaining_balance <= 0) {
            continue;
          }
          // Attempt charge
          try {
            await stripe.paymentIntents.create({
              amount: Math.round(booking.remaining_balance * 100),
              currency: 'gbp',
              customer: booking.stripe_customer_id,
              payment_method_types: ['card'],
              confirm: true,
              off_session: true,
              metadata: { booking_id: booking.id, type: 'balance_payment' },
            });

            // Success
            await base44.asServiceRole.entities.Booking.update(booking.id, {
              balance_payment_status: 'paid',
              amount_paid: booking.total_amount,
              payment_status: 'paid',
            });

            await base44.functions.invoke('sendEmail', {
              to: booking.guest_email,
              subject: 'Balance Payment Collected',
              body: `Your remaining balance of £${booking.remaining_balance.toFixed(2)} has been successfully collected. Your booking is confirmed.`,
            });

            const hostCreds = await base44.asServiceRole.entities.UserCredentials.filter({ user_id: booking.host_id });
            const hostEmail = hostCreds?.[0]?.email;
            await base44.functions.invoke('sendEmail', {
              to: hostEmail,
              subject: 'Full Payment Received',
              body: `Full payment has been received from ${booking.guest_name}. Their booking is confirmed.`,
            });

            results.job1_charged++;
          } catch (chargeErr) {
            // Charge failed
            const now = new Date();
            await base44.asServiceRole.entities.Booking.update(booking.id, {
              balance_payment_status: 'failed',
              balance_failed_at: now.toISOString(),
            });

            await base44.functions.invoke('sendEmail', {
              to: booking.guest_email,
              subject: 'Payment Collection Failed',
              body: `We were unable to collect your remaining balance of £${booking.remaining_balance.toFixed(2)}. You have 7 days to make payment or your booking will be automatically cancelled.`,
            });

            const hostCreds = await base44.asServiceRole.entities.UserCredentials.filter({ user_id: booking.host_id });
            const hostEmail = hostCreds?.[0]?.email;
            await base44.functions.invoke('sendEmail', {
              to: hostEmail,
              subject: 'Guest Payment Failed',
              body: `We were unable to collect the full balance payment from ${booking.guest_name}. They have been given 7 days to make payment.`,
            });

            results.job1_failed++;
          }
        }
      } catch (err) {
        results.errors.push(`Job 1 - Booking ${booking.id}: ${err.message}`);
      }
    }
  } catch (err) {
    results.errors.push(`Job 1 error: ${err.message}`);
  }

  // JOB 2: Auto-cancel after 7 day grace period
  try {
    const failedBalances = await base44.asServiceRole.entities.Booking.filter({
      balance_payment_status: 'failed',
    });

    for (const booking of failedBalances) {
      try {
        const now = new Date();
        const failedAt = new Date(booking.balance_failed_at);
        const daysSinceFailed = differenceInDays(now, failedAt);

        if (daysSinceFailed > 7) {
          const hostCreds = await base44.asServiceRole.entities.UserCredentials.filter({ user_id: booking.host_id });
          const hostEmail = hostCreds?.[0]?.email;
          const hostRoles = await base44.asServiceRole.entities.UserRole.filter({ user_id: booking.host_id, role: 'host' });
          const hostStripeAccountId = hostRoles?.[0]?.stripe_connect_account_id;
          const isSuperStrict = booking.cancellation_policy_snapshot?.type === 'super_strict';

          // Write cancellation state first — before any Stripe calls
          await base44.asServiceRole.entities.Booking.update(booking.id, {
            booking_status: 'cancelled',
            balance_payment_status: 'overdue',
            payment_status: 'refunded',
          });

          results.job2_cancelled++;

          // Bell notification to host — always fires after cancellation
          try {
            await base44.functions.invoke('sendNotification', {
              user_id: booking.host_id,
              type: 'booking_cancelled',
              title: 'Booking Cancelled — Non-Payment',
              body: `${booking.guest_name}'s booking (${booking.booking_reference || booking.id}) has been automatically cancelled due to non-payment. Check-in: ${booking.check_in}.`,
              link: `/HostBookings?booking=${booking.id}`,
            });
          } catch (_) {}

          // Stripe and email best-effort after state is written
          try {
            if (isSuperStrict) {
              await stripe.refunds.create({
                payment_intent: booking.stripe_deposit_intent_id,
                amount: Math.round((booking.deposit_amount * 0.5) * 100),
              });

              await stripe.transfers.create({
                amount: Math.round((booking.deposit_amount * 0.5) * 100),
                currency: 'gbp',
                destination: hostStripeAccountId,
              });

              const guestRefund = (booking.deposit_amount * 0.5).toFixed(2);
              const hostAmount = (booking.deposit_amount * 0.5).toFixed(2);

              await base44.functions.invoke('sendEmail', {
                to: booking.guest_email,
                subject: 'Booking Cancelled - Non-Payment',
                body: `Your booking has been cancelled due to non-payment. As per the Super Strict cancellation policy, 50% of your deposit (£${hostAmount}) has been retained by the host. The remaining 50% (£${guestRefund}) has been returned to you.`,
              });

              await base44.functions.invoke('sendEmail', {
                to: hostEmail,
                subject: 'Booking Cancelled - Non-Payment',
                body: `${booking.guest_name}'s booking (${booking.booking_reference || booking.id}) has been automatically cancelled due to non-payment. £${hostAmount} (50% of the deposit) has been transferred to your account.`,
              });
            } else {
              await stripe.refunds.create({
                payment_intent: booking.stripe_deposit_intent_id,
                amount: Math.round(booking.deposit_amount * 100),
              });

              await base44.functions.invoke('sendEmail', {
                to: booking.guest_email,
                subject: 'Booking Cancelled - Non-Payment',
                body: `Your booking has been cancelled due to non-payment. Your deposit of £${booking.deposit_amount.toFixed(2)} has been returned to you in full.`,
              });

              await base44.functions.invoke('sendEmail', {
                to: hostEmail,
                subject: 'Booking Cancelled - Non-Payment',
                body: `${booking.guest_name}'s booking (${booking.booking_reference || booking.id}) has been automatically cancelled due to non-payment. The guest's deposit has been returned to them in full.`,
              });
            }

            if (booking.stripe_deposit_intent_id) {
              try {
                await stripe.paymentIntents.cancel(booking.stripe_deposit_intent_id);
              } catch (_) {}
            }
          } catch (stripeErr) {
            results.errors.push(`Job 2 - Stripe/email for booking ${booking.id}: ${stripeErr.message}`);
          }
        }
      } catch (err) {
        results.errors.push(`Job 2 - Booking ${booking.id}: ${err.message}`);
      }
    }
  } catch (err) {
    results.errors.push(`Job 2 error: ${err.message}`);
  }

  // JOB 3: Release rental payment 24hrs after check-in
  try {
    const heldRentals = await base44.asServiceRole.entities.Booking.filter({
      rental_payment_status: 'held',
      rental_frozen: false,
    });

    for (const booking of heldRentals) {
      try {
        const now = new Date();
        const releaseDueAt = new Date(booking.rental_release_due_at);

        if (now > releaseDueAt) {
          const hostCreds = await base44.asServiceRole.entities.UserCredentials.filter({ user_id: booking.host_id });
          const hostEmail = hostCreds?.[0]?.email;
          const hostRoles = await base44.asServiceRole.entities.UserRole.filter({ user_id: booking.host_id, role: 'host' });
          const hostStripeAccountId = hostRoles?.[0]?.stripe_connect_account_id;

          await stripe.transfers.create({
            amount: Math.round(booking.total_amount * 100),
            currency: 'gbp',
            destination: hostStripeAccountId,
            metadata: { booking_id: booking.id },
          });

          await base44.asServiceRole.entities.Booking.update(booking.id, {
            rental_payment_status: 'transferred',
            payout_triggered_at: now.toISOString(),
          });

          await base44.functions.invoke('sendEmail', {
            to: hostEmail,
            subject: 'Rental Payment Released',
            body: `Your rental payment of £${booking.total_amount.toFixed(2)} has been released to your account.`,
          });

          await base44.functions.invoke('sendEmail', {
            to: booking.guest_email,
            subject: 'Payment Released to Host',
            body: `Your rental payment has been released to your host.`,
          });

          results.job3_released++;
        }
      } catch (err) {
        results.errors.push(`Job 3 - Booking ${booking.id}: ${err.message}`);
      }
    }
  } catch (err) {
    results.errors.push(`Job 3 error: ${err.message}`);
  }

  // JOB 4: Return security deposit 48hrs after checkout
  try {
    const heldDeposits = await base44.asServiceRole.entities.Booking.filter({
      deposit_status: 'held',
      deposit_frozen: false,
      booking_status: 'completed',
    });

    for (const booking of heldDeposits) {
      try {
        const now = new Date();
        const checkOutDate = new Date(booking.check_out);
        const hoursSinceCheckOut = differenceInHours(now, checkOutDate);

        if (hoursSinceCheckOut > 48) {
          // Cancel deposit PaymentIntent
          if (booking.stripe_deposit_intent_id) {
            try {
              await stripe.paymentIntents.cancel(booking.stripe_deposit_intent_id);
            } catch (_) {
              // Ignore if already cancelled
            }
          }

          await base44.asServiceRole.entities.Booking.update(booking.id, {
            deposit_status: 'returned',
            deposit_resolved_at: now.toISOString(),
          });

          await base44.functions.invoke('sendEmail', {
            to: booking.guest_email,
            subject: 'Security Deposit Returned',
            body: `Your security deposit of £${booking.security_deposit.toFixed(2)} has been returned. Funds will appear in your account within 5-10 business days.`,
          });

          const hostCreds = await base44.asServiceRole.entities.UserCredentials.filter({ user_id: booking.host_id });
          const hostEmail = hostCreds?.[0]?.email;
          await base44.functions.invoke('sendEmail', {
            to: hostEmail,
            subject: 'Deposit Returned to Guest',
            body: `The security deposit for ${booking.guest_name}'s stay has been returned to the guest.`,
          });

          results.job4_returned++;
        }
      } catch (err) {
        results.errors.push(`Job 4 - Booking ${booking.id}: ${err.message}`);
      }
    }
  } catch (err) {
    results.errors.push(`Job 4 error: ${err.message}`);
  }

  console.log('Payout processing complete:', results);
  return Response.json(results);
});