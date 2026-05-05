import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { session_token, email, forename, middle_name, surname, phone, location } = body;
    if (!session_token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const base44client = createClientFromRequest(req);
    const sessions = await base44client.asServiceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const base44 = base44client;
    const sr = base44.asServiceRole;
    if (!email || !forename || !surname) return Response.json({ success: false, error: "missing fields" }, { status: 400 });
    const norm = email.toLowerCase().trim();
    const existing = await sr.entities.UserProfile.filter({ email: norm });
    if (existing.length > 0) {
      await sr.entities.UserProfile.update(existing[0].id, { forename, middle_name: middle_name || "", surname, phone: phone || "", location: location || "" });
    } else {
      await sr.entities.UserProfile.create({ email: norm, forename, middle_name: middle_name || "", surname, phone: phone || "", location: location || "" });
    }
    return Response.json({ success: true });
  } catch (e) {
    console.error("saveUserProfile error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});