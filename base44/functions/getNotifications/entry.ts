import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json();
    const { session_token } = body || {};

    if (!session_token) {
      return Response.json({ success: false, error: "missing_session_token" }, { status: 401 });
    }

    const sessions = await sr.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];

    if (!session) {
      return Response.json({ success: false, error: "invalid_session" }, { status: 401 });
    }

    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return Response.json({ success: false, error: "session_expired" }, { status: 401 });
    }

    const { user_id } = session;

    const notifications = await sr.entities.Notification.filter(
      { user_id },
      "-created_date",
      20
    );

    return Response.json({ success: true, notifications: notifications || [] });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});