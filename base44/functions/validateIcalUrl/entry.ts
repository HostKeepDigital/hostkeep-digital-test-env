import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { session_token } = body;
    if (!session_token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const base44 = createClientFromRequest(req);
    const sessions = await base44.asServiceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const { url } = body;

    if (!url) {
      return Response.json(
        { success: false, error: "missing_url" },
        { status: 400 }
      );
    }

    const res = await fetch(url);
    const text = await res.text();

    if (!res.ok || !text.includes("BEGIN:VCALENDAR")) {
      return Response.json(
        { success: false, error: "invalid_ical" },
        { status: 400 }
      );
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error("validateIcalUrl error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});