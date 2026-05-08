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

    const user_id = session.user_id;

    if (!user_id) {
      return Response.json({ status: "not_connected", error: "no_user_id" });
    }

    const roles = await serviceRole.entities.UserRole.filter({ user_id, role: "host" }).catch(() => []);
    const hostRole = roles?.[0];

    const hasAccount = !!hostRole?.stripe_connect_account_id;
    const stripeVerified = hostRole?.stripe_connect_status === "verified";

    let status = "not_connected";
    if (stripeVerified) status = "verified";
    else if (hasAccount) status = "pending_verification";

    return Response.json({ success: true, status });
  } catch (err) {
    console.error("getStripeConnectStatus error:", err);
    return Response.json({ status: "not_connected", error: err.message }, { status: 500 });
  }
});