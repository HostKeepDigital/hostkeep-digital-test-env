import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@16.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const { referee_user_id, referee_email, referee_name } = await req.json();

    // Find the referral record for this referee
    const refs = await sr.entities.Referral.filter({ referee_email: referee_email?.toLowerCase().trim() });
    const referral = refs.find(r => r.status === "pending" && r.ref_code);
    if (!referral) return Response.json({ success: false, error: "no pending referral found" });

    // Update referral record
    await sr.entities.Referral.update(referral.id, {
      referee_user_id,
      referee_name: referee_name || referee_email,
      status: "subscription_activated",
    });

    // Apply 1 month free credit to the referring host's Stripe subscription
    const referrerSubs = await sr.entities.Subscription.filter({ user_id: referral.referrer_user_id });
    const referrerSub = referrerSubs.find(s => s.status === "active" && s.stripe_subscription_id);

    if (referrerSub?.stripe_subscription_id) {
      // Add a one-month invoice credit to the referrer's Stripe customer
      const referrerSubObj = await stripe.subscriptions.retrieve(referrerSub.stripe_subscription_id);
      const monthlyAmount = referrerSub.price_monthly ? Math.round(referrerSub.price_monthly * 100) : 0;

      if (monthlyAmount > 0) {
        await stripe.customerBalanceTransactions.create(referrerSubObj.customer, {
          amount: -monthlyAmount,
          currency: "gbp",
          description: `Referral reward — ${referee_name || referee_email} signed up using your link`,
        });
      }

      await sr.entities.Referral.update(referral.id, {
        status: "reward_applied",
        reward_applied_at: new Date().toISOString().split("T")[0],
      });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error("applyReferralReward error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});