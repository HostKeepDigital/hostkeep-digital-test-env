import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const origin = req.headers.get('origin') || 'https://app.base44.com';

    // Reuse existing account or create new one
    let accountId = user.stripe_connect_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          mcc: '7011', // Hotels and Lodging
          url: origin,
        },
      });
      accountId = account.id;

      // Save account ID to user profile
      await base44.auth.updateMe({ stripe_connect_account_id: accountId, stripe_connect_status: 'pending' });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `https://hostkeepdigital.co.uk/Settings?tab=payments&stripe_return=refresh`,
      return_url: `https://hostkeepdigital.co.uk/Settings?tab=payments&stripe_return=success`,
      type: 'account_onboarding',
    });

    return Response.json({ url: accountLink.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});