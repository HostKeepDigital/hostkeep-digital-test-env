import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";
import Stripe from "npm:stripe@14";

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;
    const body = await req.json();
    const { return_url, refresh_url, session_token } = body;

    const sessions = await serviceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await serviceRole.entities.User.filter({ id: session.user_id });
    const user = users?.[0];
    if (!user) return Response.json({ error: "User not found" }, { status: 404 });

    let accountId = user.stripe_connect_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express", country: "GB", email: user.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      });
      accountId = account.id;
      await serviceRole.entities.User.update(user.id, {
        stripe_connect_account_id: accountId,
        stripe_connect_status: "pending",
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refresh_url || "https://hostkeepdigital.co.uk/Subscription?stripe_connect_return=refresh",
      return_url: return_url || "https://hostkeepdigital.co.uk/Subscription?stripe_connect_return=success",
      type: "account_onboarding",
    });

    return Response.json({ url: accountLink.url });
  } catch (error) {
    console.error("createStripeConnectLink error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});