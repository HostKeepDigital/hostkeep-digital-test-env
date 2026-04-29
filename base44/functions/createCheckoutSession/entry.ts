import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@16.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const VALID_PLANS = new Set([
  'host_starter_monthly', 'host_growth_monthly', 'host_pro_monthly',
  'cleaner_solo_monthly', 'cleaner_pro_monthly', 'cleaner_team_monthly',
  'founding_host_solo', 'founding_host_multi', 'founding_host_portfolio',
  'founding_cleaner_solo',
]);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { plan, user_id, session_token } = body;

    // Validate session token (custom auth system)
    if (!session_token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userSessions = await base44.asServiceRole.entities.UserSession.filter({ session_token });
    const userSession = userSessions?.[0];
    if (!userSession || new Date(userSession.expires_at) < new Date()) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!plan || !VALID_PLANS.has(plan)) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Look up the price from Stripe using the lookup key (set on each price in Stripe dashboard)
    const prices = await stripe.prices.list({ lookup_keys: [plan], expand: ['data.product'] });
    if (!prices.data.length) {
      return Response.json({ error: `No Stripe price found for plan "${plan}". Please set a lookup key matching "${plan}" on the price in your Stripe dashboard.` }, { status: 400 });
    }
    const stripePrice = prices.data[0];

    // Get existing subscriptions for this user
    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id });

    // Get or create Stripe customer
    let customer_id;
    if (subs.length > 0 && subs[0].stripe_customer_id) {
      customer_id = subs[0].stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: userSession.email,
        metadata: { user_id },
      });
      customer_id = customer.id;

      // Store customer ID on existing record if present, but never create a pending record
      if (subs.length > 0) {
        await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
          stripe_customer_id: customer_id,
        });
      }
    }

    // Create checkout session using the Stripe price
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer_id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/Subscription?success=true`,
      cancel_url: `${req.headers.get('origin')}/Subscription?cancelled=true`,
      metadata: {
        user_id,
        plan,
      },
    });

    return Response.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
});