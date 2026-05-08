import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const session_token = body.session_token || req.headers.get("x-session-token");

    if (!session_token) {
      return Response.json({ status: "not_connected", error: "missing_session" });
    }

    // Validate session directly without invoking another function
    const sessions = await serviceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];

    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ status: "not_connected", error: "unauthenticated" });
    }

    const email = session.email;

    if (!email) {
      return Response.json({ status: "not_connected", error: "no_email" });
    }

    const members = await serviceRole.entities.FoundingMember.filter({ email }).catch(() => []);
    const member = members?.[0];

    const hasAccount = !!member?.stripe_connect_account_id;
    const stripeVerified = !!member?.stripe_verified;

    let status = "not_connected";
    if (stripeVerified) status = "verified";
    else if (hasAccount) status = "pending_verification";

    return Response.json({ success: true, status });
  } catch (err) {
    console.error("getStripeConnectStatus error:", err);
    return Response.json({ status: "not_connected", error: err.message }, { status: 500 });
  }
});