import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";
import Stripe from "npm:stripe@14";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const body = await req.json();
    const { return_url: customReturnUrl, refresh_url: customRefreshUrl, session_token } = body;

    let user_id, email;

    // Try SDK auth first, fall back to session_token
    try {
      const me = await base44.auth.me();
      if (me?.id) {
        user_id = me.id;
        email = me.email;
      }
    } catch (_) {}

    // Fall back to session_token if SDK auth didn't work
    if (!user_id && session_token) {
      const userSessions = await serviceRole.entities.UserSession.filter({ session_token });
      const userSession = userSessions?.[0];
      if (userSession && new Date(userSession.expires_at) >= new Date()) {
        user_id = userSession.user_id;
        email = userSession.email;
      }
    }

    if (!user_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user record (needed for stripe_connect_account_id)
    const users = await serviceRole.entities.User.filter({ id: user_id });
    const user = users[0];

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const origin = req.headers.get('origin') || 'https://hostkeepdigital.co.uk';

    // Reuse existing account or create new one
    let accountId = user.stripe_connect_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "GB",
        email: email || user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          mcc: "7011",
          url: origin,
        },
      });

      accountId = account.id;

      await serviceRole.entities.User.update(user.id, {
        stripe_connect_account_id: accountId,
        stripe_connect_status: "pending",
      });
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: customRefreshUrl || `https://hostkeepdigital.co.uk/Settings?tab=payments&stripe_return=refresh`,
      return_url: customReturnUrl || `https://hostkeepdigital.co.uk/Settings?tab=payments&stripe_return=success`,
      type: "account_onboarding",
    });

    return Response.json({ url: accountLink.url });
  } catch (error) {
    console.error("Stripe Connect error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});