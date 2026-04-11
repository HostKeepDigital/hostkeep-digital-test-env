import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@16.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const VALID_NEXT_PLANS = new Set([
  'founding_host_solo', 'founding_host_multi', 'founding_host_portfolio',
  'founding_cleaner_solo',
]);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const { next_plan, session_token } = await req.json();

  // Validate session
  if (!session_token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userSessions = await base44.asServiceRole.entities.UserSession.filter({ session_token });
  const userSession = userSessions?.[0];
  if (!userSession || new Date(userSession.expires_at) < new Date()) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!next_plan || !VALID_NEXT_PLANS.has(next_plan)) {
    return Response.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const user_id = userSession.user_id;

  // Confirm they're a founding member
  const foundingRecords = await base44.asServiceRole.entities.FoundingMember.filter({ email: userSession.email });
  const foundingMember = foundingRecords?.[0];
  if (!foundingMember) {
    return Response.json({ error: 'Not a founding member' }, { status: 403 });
  }

  const betaPlan = foundingMember.role === 'host' ? 'beta_host_access' : 'beta_cleaner_access';

  // Get or create Stripe customer
  const existingSubs = await base44.asServiceRole.entities.Subscription.filter({ user_id });
  let subscription = existingSubs?.[0] || null;
  let stripeCustomerId = subscription?.stripe_customer_id || null;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: userSession.email,
      name: foundingMember.full_name,
      metadata: { user_id, founding_member: 'true', next_plan },
    });
    stripeCustomerId = customer.id;
  } else {
    // Update metadata on existing customer with chosen plan
    await stripe.customers.update(stripeCustomerId, {
      metadata: { user_id, founding_member: 'true', next_plan },
    });
  }

  const now = new Date().toISOString().split('T')[0];

  if (subscription) {
    // Update existing record
    await base44.asServiceRole.entities.Subscription.update(subscription.id, {
      plan: betaPlan,
      status: 'active',
      is_founding_member: true,
      price_monthly: 0,
      stripe_customer_id: stripeCustomerId,
      next_subscription: next_plan,
      start_date: subscription.start_date || now,
    });
  } else {
    // Create new beta subscription record
    await base44.asServiceRole.entities.Subscription.create({
      user_id,
      plan: betaPlan,
      provider: 'stripe',
      stripe_customer_id: stripeCustomerId,
      status: 'active',
      is_founding_member: true,
      price_monthly: 0,
      next_subscription: next_plan,
      start_date: now,
    });
  }

  return Response.json({ success: true, stripe_customer_id: stripeCustomerId });
});