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

  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const { next_plan, session_token } = await req.json();

    if (!session_token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userSessions = await sr.entities.UserSession.filter({ session_token });
    const userSession = userSessions?.[0];
    if (!userSession || new Date(userSession.expires_at) < new Date()) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!next_plan || !VALID_NEXT_PLANS.has(next_plan)) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const user_id = userSession.user_id;

    const foundingRecords = await sr.entities.FoundingMember.filter({ email: userSession.email });
    const foundingMember = foundingRecords?.[0];
    if (!foundingMember) {
      return Response.json({ error: 'Not a founding member' }, { status: 403 });
    }

    const betaPlanKey = foundingMember.role === 'host' ? 'beta_host_access' : 'beta_cleaner_access';

    // Look up the £0 beta price in Stripe
    const prices = await stripe.prices.list({ lookup_keys: [betaPlanKey], expand: ['data.product'] });
    if (!prices.data.length) {
      return Response.json({
        error: `No Stripe price found for "${betaPlanKey}". Please create a £0 recurring price with this lookup key in Stripe.`
      }, { status: 400 });
    }
    const betaPrice = prices.data[0];

    // Get or create existing subscription record
    const existingSubs = await sr.entities.Subscription.filter({ user_id });
    const subscription = existingSubs?.[0] || null;
    let stripeCustomerId = subscription?.stripe_customer_id || null;
    let stripeSubscriptionId = subscription?.stripe_subscription_id || null;

    // Get or create Stripe customer
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userSession.email,
        name: foundingMember.full_name || userSession.email,
        metadata: {
          user_id: user_id || '',
          founding_member: 'true',
          next_plan,
        },
      });
      stripeCustomerId = customer.id;
    } else {
      await stripe.customers.update(stripeCustomerId, {
        metadata: {
          user_id: user_id || '',
          founding_member: 'true',
          next_plan,
        },
      });
    }

    const now = new Date().toISOString().split('T')[0];

    // Create or update the Stripe subscription at £0
    if (!stripeSubscriptionId) {
      const stripeSub = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: betaPrice.id }],
        metadata: {
          user_id: user_id || '',
          founding_member: 'true',
          next_plan,
          beta_plan: betaPlanKey,
        },
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card'],
        },
        expand: ['latest_invoice.payment_intent'],
      });
      stripeSubscriptionId = stripeSub.id;

      // Check if card collection is needed
      const invoice = stripeSub.latest_invoice;
      const paymentIntent = invoice && typeof invoice === 'object' ? invoice.payment_intent : null;
      const piStatus = paymentIntent && typeof paymentIntent === 'object' ? paymentIntent.status : null;
      const clientSecret = paymentIntent && typeof paymentIntent === 'object' ? paymentIntent.client_secret : null;

      if (piStatus === 'requires_payment_method' || piStatus === 'requires_confirmation') {
        if (subscription) {
          await sr.entities.Subscription.update(subscription.id, {
            plan: betaPlanKey, status: 'pending', is_founding_member: true, price_monthly: 0,
            stripe_customer_id: stripeCustomerId, stripe_subscription_id: stripeSubscriptionId,
            next_subscription: next_plan, start_date: subscription.start_date || now,
          });
        } else {
          await sr.entities.Subscription.create({
            user_id, plan: betaPlanKey, provider: 'stripe', stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId, status: 'pending', is_founding_member: true,
            price_monthly: 0, next_subscription: next_plan, start_date: now,
          });
        }
        return Response.json({
          success: true,
          requires_payment_method: true,
          client_secret: clientSecret,
          stripe_customer_id: stripeCustomerId,
        });
      }
    } else {
      await stripe.subscriptions.update(stripeSubscriptionId, {
        metadata: { next_plan, founding_member: 'true' },
      });
    }

    // Save subscription record as active
    if (subscription) {
      await sr.entities.Subscription.update(subscription.id, {
        plan: betaPlanKey, status: 'active', is_founding_member: true, price_monthly: 0,
        stripe_customer_id: stripeCustomerId, stripe_subscription_id: stripeSubscriptionId,
        next_subscription: next_plan, start_date: subscription.start_date || now,
      });
    } else {
      await sr.entities.Subscription.create({
        user_id, plan: betaPlanKey, provider: 'stripe', stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId, status: 'active', is_founding_member: true,
        price_monthly: 0, next_subscription: next_plan, start_date: now,
      });
    }

    // Set subscription gate on FoundingMember
    try {
      await sr.entities.FoundingMember.update(foundingMember.id, { subscription_active: true });
      await sr.functions.invoke('checkApprovalGates', { user_id });
    } catch (_) {}

    // Apply referral reward if referred
    try {
      const refs = await sr.entities.Referral.filter({ referee_email: foundingMember.email?.toLowerCase() });
      const pendingRef = refs.find(r => r.status === 'pending');
      if (pendingRef) {
        await sr.functions.invoke('applyReferralReward', {
          referee_user_id: user_id,
          referee_email: foundingMember.email,
          referee_name: foundingMember.full_name,
        });
      }
    } catch (_) {}

    return Response.json({
      success: true,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
    });

  } catch (err) {
    console.error('setupFoundingSubscription error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});