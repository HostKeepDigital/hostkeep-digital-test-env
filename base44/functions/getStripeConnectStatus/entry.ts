import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const accountId = user.stripe_connect_account_id;
    if (!accountId) {
      return Response.json({ status: 'not_connected', account_id: null });
    }

    const account = await stripe.accounts.retrieve(accountId);

    let status = 'pending';
    if (account.charges_enabled && account.payouts_enabled) {
      status = 'verified';
    } else if (account.details_submitted) {
      status = 'pending_verification';
    }

    // Update stored status
    await base44.auth.updateMe({ stripe_connect_status: status });

    return Response.json({ status, account_id: accountId, details_submitted: account.details_submitted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});