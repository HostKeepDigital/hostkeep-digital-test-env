import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@16.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PLAN_PRICES = {
  host_starter_monthly:  { name: 'HostKeep Host Starter',  amount: 2900 },
  host_growth_monthly:   { name: 'HostKeep Host Growth',   amount: 5900 },
  host_pro_monthly:      { name: 'HostKeep Host Pro',      amount: 9900 },
  cleaner_solo_monthly:  { name: 'HostKeep Cleaner Solo',  amount: 999  },
  cleaner_pro_monthly:   { name: 'HostKeep Cleaner Pro',   amount: 1999 },
  cleaner_team_monthly:  { name: 'HostKeep Cleaner Team',  amount: 3999 },
};

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

    if (!plan || !PLAN_PRICES[plan]) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get or create Stripe customer
    let customer_id = null;
    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id });
    if (subs.length > 0 && subs[0].stripe_customer_id) {
      customer_id = subs[0].stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: userSession.email,
        metadata: { user_id },
      });
      customer_id = customer.id;
      
      // Update or create subscription record
      if (subs.length > 0) {
        await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
          stripe_customer_id: customer_id,
        });
      } else {
        await base44.asServiceRole.entities.Subscription.create({
          user_id,
          plan,
          provider: 'stripe',
          stripe_customer_id: customer_id,
          status: 'trial',
        });
      }
    }

    // Create checkout session
    const planInfo = PLAN_PRICES[plan];
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer_id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: { name: planInfo.name },
            unit_amount: planInfo.amount,
            recurring: { interval: 'month' },
          },
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