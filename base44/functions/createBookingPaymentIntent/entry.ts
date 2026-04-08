import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@17.0.0';
import { addDays, addHours, startOfDay, differenceInDays } from 'npm:date-fns@3.6.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { booking_id } = body;

    if (!booking_id) {
      return Response.json({ error: 'booking_id is required' }, { status: 400 });
    }

    // Load booking and verify guest
    const booking = await base44.entities.Booking.get(booking_id);
    if (!booking || booking.guest_id !== user.id) {
      return Response.json({ error: 'Booking not found or unauthorized' }, { status: 404 });
    }

    // Load host user and check Stripe Connect
    const host = await base44.asServiceRole.entities.User.get(booking.host_id);
    if (!host?.stripe_connect_account_id) {
      return Response.json(
        { error: 'Host has not connected their bank account' },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe Customer
    let customerId = booking.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: booking.guest_email,
        name: booking.guest_name,
      });
      customerId = customer.id;
    }

    // Calculate payment amounts and dates
    const today = new Date();
    const checkInDate = new Date(booking.check_in);
    const daysUntilCheckIn = differenceInDays(checkInDate, today);

    let chargeAmount;
    let balancePaymentStatus;
    let balanceDueDate = null;

    if (daysUntilCheckIn > 56) {
      chargeAmount = booking.deposit_amount;
      balancePaymentStatus = 'pending';
      // Balance due 56 days before check-in at midnight
      balanceDueDate = startOfDay(addDays(checkInDate, -56)).toISOString();
    } else {
      chargeAmount = booking.total_amount;
      balancePaymentStatus = 'not_applicable';
    }

    // Create rental PaymentIntent
    const rentalIntent = await stripe.paymentIntents.create({
      amount: Math.round(chargeAmount * 100),
      currency: 'gbp',
      customer: customerId,
      setup_future_usage: 'off_session',
      metadata: { booking_id, type: 'rental' },
    });

    // Create deposit PaymentIntent if applicable
    let depositIntentId = null;
    if (booking.security_deposit > 0) {
      const depositIntent = await stripe.paymentIntents.create({
        amount: Math.round(booking.security_deposit * 100),
        currency: 'gbp',
        customer: customerId,
        capture_method: 'manual',
        metadata: { booking_id, type: 'security_deposit' },
      });
      depositIntentId = depositIntent.id;
    }

    // Calculate rental_release_due_at (check-in at 14:00 + 24 hours)
    const checkInAt14 = new Date(checkInDate);
    checkInAt14.setHours(14, 0, 0, 0);
    const rentalReleaseDueAt = addHours(checkInAt14, 24).toISOString();

    // Update booking with payment data
    await base44.entities.Booking.update(booking_id, {
      stripe_customer_id: customerId,
      stripe_rental_intent_id: rentalIntent.id,
      stripe_deposit_intent_id: depositIntentId,
      rental_payment_status: 'unpaid',
      deposit_status: booking.security_deposit > 0 ? 'held' : 'none',
      balance_due_date: balanceDueDate,
      balance_payment_status: balancePaymentStatus,
      rental_release_due_at: rentalReleaseDueAt,
    });

    return Response.json({
      rental_client_secret: rentalIntent.client_secret,
      deposit_client_secret: depositIntentId ? (await stripe.paymentIntents.retrieve(depositIntentId)).client_secret : null,
    });
  } catch (error) {
    console.error('createBookingPaymentIntent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});