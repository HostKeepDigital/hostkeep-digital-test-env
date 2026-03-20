import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PLAN_LOOKUP_KEYS = {
  host_solo: 'host_solo',
  host_pro: 'host_pro',
  host_agency: 'host_agency',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan } = await req.json();
    if (!PLAN_LOOKUP_KEYS[plan]) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get price by lookup key
    const prices = await stripe.prices.list({ lookup_keys: [PLAN_LOOKUP_KEYS[plan]], expand: ['data.product'] });
    if (!prices.data.length) {
      return Response.json({ error: 'Price not found for plan' }, { status: 404 });
    }
    const price = prices.data[0];

    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${origin}/Subscription?success=true&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/Subscription?cancelled=true`,
      metadata: {
        user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
        },
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});