import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";
import Stripe from "npm:stripe@14";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    // Extract session token
    const body = await req.json().catch(() => ({}));
    const session_token =
      body.session_token || req.headers.get("x-session-token");

    if (!session_token) {
      return Response.json(
        { error: "Missing session token", authenticated: false },
        { status: 401 },
      );
    }

    // Validate session using your new auth model
    const sessionCheck = await serviceRole.functions.invoke(
      "checkSession",
      { session_token },
    );

    const session = sessionCheck?.data;

    if (!session?.authenticated) {
      return Response.json(
        { error: "Invalid or expired session", authenticated: false },
        { status: 401 },
      );
    }

    // Extract user_id + email from your new session model
    const user_id = session.user_id;
    const email = session.email;

    if (!user_id) {
      return Response.json(
        { error: "Session missing user_id" },
        { status: 400 },
      );
    }

    // Fetch user record (needed for stripe_connect_account_id)
    const users = await serviceRole.entities.User.filter({ id: user_id });
    const user = users[0];

    if (!user) {
      return Response.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    const origin = req.headers.get("origin") || "https://hostkeepdigital.co.uk";
    const customReturnUrl = body.return_url;
    const customRefreshUrl = body.refresh_url;

    // Reuse existing account or create new one
    let accountId = user.stripe_connect_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "GB",
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          mcc: "7011", // Hotels and Lodging
          url: origin,
        },
      });

      accountId = account.id;

      // Save account ID to user profile
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