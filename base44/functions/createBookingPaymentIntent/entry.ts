import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { booking_id } = await req.json();
  if (!booking_id) {
    return Response.json({ error: 'booking_id is required' }, { status: 400 });
  }

  // Load the booking
  const bookings = await base44.asServiceRole.entities.Booking.filter({ id: booking_id });
  const booking = bookings?.[0];
  if (!booking) {
    return Response.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Load the host user to get their Stripe Connect account
  const hosts = await base44.asServiceRole.entities.User.filter({ id: booking.host_id });
  const host = hosts?.[0];
  if (!host?.stripe_connect_account_id) {
    return Response.json({ error: 'Host has not connected their bank account' }, { status: 400 });
  }

  // Create rental PaymentIntent — routed through host's Express connected account
  const rentalIntent = await stripe.paymentIntents.create({
    amount: Math.round(booking.total_amount * 100),
    currency: 'gbp',
    transfer_data: {
      destination: host.stripe_connect_account_id,
    },
    metadata: {
      booking_id,
      type: 'rental',
    },
  });

  let depositIntent = null;

  // Create deposit PaymentIntent if applicable — also routed to host
  if (booking.security_deposit > 0) {
    depositIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.security_deposit * 100),
      currency: 'gbp',
      capture_method: 'manual',
      transfer_data: {
        destination: host.stripe_connect_account_id,
      },
      metadata: {
        booking_id,
        type: 'security_deposit',
      },
    });
  }

  // Update booking record
  const updateData = {
    stripe_rental_intent_id: rentalIntent.id,
    rental_payment_status: 'unpaid',
    deposit_status: depositIntent ? 'held' : 'none',
  };
  if (depositIntent) {
    updateData.stripe_deposit_intent_id = depositIntent.id;
  }

  await base44.asServiceRole.entities.Booking.update(booking_id, updateData);

  return Response.json({
    rental_client_secret: rentalIntent.client_secret,
    deposit_client_secret: depositIntent?.client_secret || null,
  });
});