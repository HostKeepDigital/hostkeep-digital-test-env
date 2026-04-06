import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const PLAN_DETAILS = {
  host_starter_monthly: { name: 'Host Starter', price: 29, max_properties: 1, role: 'host' },
  host_growth_monthly: { name: 'Host Growth', price: 59, max_properties: 5, role: 'host' },
  host_pro_monthly: { name: 'Host Pro', price: 99, max_properties: 999, role: 'host' },
  cleaner_solo_monthly: { name: 'Cleaner Solo', price: 9.99, max_properties: null, role: 'cleaner' },
  cleaner_pro_monthly: { name: 'Cleaner Pro', price: 19.99, max_properties: null, role: 'cleaner' },
  cleaner_team_monthly: { name: 'Cleaner Team', price: 39.99, max_properties: null, role: 'cleaner' },
  founding_host_solo: { name: 'Founding Host Solo', price: 19, max_properties: 1, role: 'host', is_founding: true },
  founding_host_multi: { name: 'Founding Host Multi', price: 49, max_properties: 5, role: 'host', is_founding: true },
  founding_host_portfolio: { name: 'Founding Host Portfolio', price: 89, max_properties: 999, role: 'host', is_founding: true },
  founding_cleaner_solo: { name: 'Founding Cleaner Solo', price: 9.99, max_properties: null, role: 'cleaner', is_founding: true },
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    return Response.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { user_id, plan } = session.metadata || {};

    if (!user_id || !plan || !PLAN_DETAILS[plan]) {
      return Response.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const planDetails = PLAN_DETAILS[plan];
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const startDateStr = now.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    try {
      const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id });
      const existingSub = subs[0];

      const subData = {
        plan,
        status: 'active',
        price_monthly: planDetails.price,
        max_properties: planDetails.max_properties,
        start_date: startDateStr,
        end_date: endDateStr,
        stripe_subscription_id: session.subscription,
        is_founding_member: planDetails.is_founding || false,
      };

      if (existingSub) {
        await base44.asServiceRole.entities.Subscription.update(existingSub.id, subData);
      } else {
        await base44.asServiceRole.entities.Subscription.create({ user_id, ...subData });
      }

      // Ensure the correct role exists
      const requiredRole = planDetails.role;
      const roles = await base44.asServiceRole.entities.UserRole.filter({ user_id });
      const hasRole = roles.some(r => r.role === requiredRole && r.approval_status === 'approved');
      if (!hasRole) {
        const existing = roles.find(r => r.role === requiredRole);
        if (existing) {
          await base44.asServiceRole.entities.UserRole.update(existing.id, { approval_status: 'approved' });
        } else {
          await base44.asServiceRole.entities.UserRole.create({ user_id, role: requiredRole, approval_status: 'approved' });
        }
      }

      return Response.json({ received: true });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const { user_id } = subscription.metadata || {};
    if (user_id) {
      try {
        const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id });
        if (subs[0]) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: 'cancelled' });
        }
      } catch (err) {
        // best effort
      }
    }
  }

  return Response.json({ received: true });
});