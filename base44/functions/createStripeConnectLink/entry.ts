import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";
import Stripe from "npm:stripe@14";

Deno.serve(async (req) => {
  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      return Response.json({ error: "Stripe key not configured" }, { status: 500 });
    }
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const session_token = body.session_token || req.headers.get("x-session-token");

    if (!session_token) {
      return Response.json({ error: "Missing session token" }, { status: 401 });
    }

    // Validate session directly — no nested function invocations
    const sessions = await serviceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];

    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const email = session.email;

    if (!email) {
      return Response.json({ error: "Session has no email" }, { status: 401 });
    }

    const members = await serviceRole.entities.FoundingMember.filter({ email }).catch(() => []);
    const member = members?.[0];

    if (!member) {
      return Response.json({ error: "No founding member record found for this account" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || "https://hostkeepdigital.co.uk";
    const return_url = body.return_url || `${origin}/HostDashboard?stripe_connect_return=success`;
    const refresh_url = body.refresh_url || `${origin}/HostDashboard?stripe_connect_return=refresh`;

    let accountId = member.stripe_connect_account_id || null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "GB",
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: { mcc: "7011", url: origin },
      });

      accountId = account.id;

      await serviceRole.entities.FoundingMember.update(member.id, {
        stripe_connect_account_id: accountId,
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url,
      return_url,
      type: "account_onboarding",
    });

    return Response.json({ url: accountLink.url });
  } catch (error) {
    console.error("Stripe Connect error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});