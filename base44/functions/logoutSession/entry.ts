import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { session_token } = await req.json();

    if (!session_token) {
      return Response.json({ success: false, error: "missing_fields" }, { status: 400 });
    }

    const sessions = await serviceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];

    if (!session) {
      return Response.json({ success: false, error: "invalid_session" }, { status: 401 });
    }

    await serviceRole.entities.UserSession.delete(session.id);

    return Response.json({ success: true });

  } catch (err) {
    console.error("logoutSession error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});