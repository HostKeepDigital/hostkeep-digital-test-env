import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@16.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PLAN_PRICES = {
  host_starter_monthly: 'price_1QmLoxHF00x1qYbM2FyD4lPe',
  host_growth_monthly: 'price_1QmLoyHF00x1qYbMJVATYNdv',
  host_pro_monthly: 'price_1QmLozHF00x1qYbMvDSqQzWh',
  cleaner_solo_monthly: 'price_1QmLp0HF00x1qYbMsCPvVGdj',
  cleaner_pro_monthly: 'price_1QmLp1HF00x1qYbMDYg8fF6j',
  cleaner_team_monthly: 'price_1QmLp2HF00x1qYbMRFuP9j9x',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { plan, user_id } = body;

    if (!user_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user via service role (app uses custom session auth, not built-in)
    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    const user = users?.[0];
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 401 });
    }

    if (!plan || !PLAN_PRICES[plan]) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get or create Stripe customer
    let customer_id = null;
    const subs = await base44.entities.Subscription.filter({ user_id });
    if (subs.length > 0 && subs[0].stripe_customer_id) {
      customer_id = subs[0].stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customer_id = customer.id;
      
      // Update or create subscription record
      if (subs.length > 0) {
        await base44.entities.Subscription.update(subs[0].id, {
          stripe_customer_id: customer_id,
        });
      } else {
        await base44.entities.Subscription.create({
          user_id: user.id,
          plan,
          provider: 'stripe',
          stripe_customer_id: customer_id,
          status: 'trial',
        });
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer_id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: PLAN_PRICES[plan],
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

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
});