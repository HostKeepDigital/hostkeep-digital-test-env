import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const session_token = body.session_token || req.headers.get("x-session-token");

    if (!session_token) {
      return Response.json({ status: "not_connected", error: "missing_session" });
    }

    // Validate session
    const sessionCheck = await serviceRole.functions.invoke("checkSession", { session_token });
    const session = sessionCheck?.data;

    if (!session?.authenticated) {
      return Response.json({ status: "not_connected", error: "unauthenticated" });
    }

    const user_id = session.user_id;
    if (!user_id) {
      return Response.json({ status: "not_connected", error: "no_user_id" });
    }

    const users = await serviceRole.entities.User.filter({ id: user_id });
    const user = users?.[0];

    if (!user) {
      return Response.json({ status: "not_connected", error: "user_not_found" });
    }

    const stripeStatus = user.stripe_connect_status;
    const hasAccount = !!user.stripe_connect_account_id;

    let status = "not_connected";
    if (stripeStatus === "verified") status = "verified";
    else if (stripeStatus === "pending" && hasAccount) status = "pending_verification";

    return Response.json({ success: true, status });
  } catch (err) {
    console.error("getStripeConnectStatus error:", err);
    return Response.json({ status: "not_connected", error: err.message }, { status: 500 });
  }
});