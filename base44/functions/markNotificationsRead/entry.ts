import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json();
    const { session_token, notification_id, all } = body || {};

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

    if (all) {
      const unread = await sr.entities.Notification.filter({ user_id, read: false });
      await Promise.all((unread || []).map((n) => sr.entities.Notification.update(n.id, { read: true })));
    } else if (notification_id) {
      const records = await sr.entities.Notification.filter({ id: notification_id, user_id });
      const notif = records?.[0];
      if (notif) {
        await sr.entities.Notification.update(notif.id, { read: true });
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});