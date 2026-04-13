import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";
import Stripe from "npm:stripe@14";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const body = await req.json();
    const { session_token, return_url, refresh_url } = body;

    if (!session_token) {
      return Response.json({ error: "session_token is required" }, { status: 400 });
    }

    // Authenticate via session token
    const sessions = await serviceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];

    if (!session) {
      return Response.json({ error: "Invalid session token" }, { status: 401 });
    }

    if (new Date(session.expires_at) < new Date()) {
      return Response.json({ error: "Session has expired" }, { status: 401 });
    }

    const user_id = session.user_id;

    // Load user record
    const users = await serviceRole.entities.User.filter({ id: user_id });
    const user = users?.[0];

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Reuse or create Stripe Express account
    let accountId = user.stripe_connect_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "GB",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          mcc: "7011",
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
      return_url: return_url || "https://hostkeepdigital.co.uk/Settings?tab=payments&stripe_return=success",
      refresh_url: refresh_url || "https://hostkeepdigital.co.uk/Settings?tab=payments&stripe_return=refresh",
      type: "account_onboarding",
    });

    return Response.json({ url: accountLink.url });
  } catch (error) {
    console.error("createStripeConnectLink error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});