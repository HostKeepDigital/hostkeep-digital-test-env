import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const user_id = body.user_id;

    if (!user_id) {
      return Response.json({
        connected: false,
        error: "missing_user_id",
      });
    }

    const credentials = await serviceRole.entities.UserCredentials.filter({
      id: user_id,
    });

    const user = credentials?.[0];

    if (!user) {
      return Response.json({
        connected: false,
        error: "user_not_found",
      });
    }

    const isConnected = !!user.stripe_account_id;

    return Response.json({
      success: true,
      connected: isConnected,
      stripe_account_id: isConnected ? user.stripe_account_id : null,
    });
  } catch (err) {
    console.error("getStripeConnectStatus error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
});