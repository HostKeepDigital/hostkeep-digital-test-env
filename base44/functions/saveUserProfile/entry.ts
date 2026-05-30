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

    // Identity comes from the session — NEVER from the request body.
    // target_user_id / body email are deliberately ignored so a caller cannot write to another user's profile.
    const norm = (session.email || "").toLowerCase().trim();
    if (!norm) return Response.json({ success: false, error: "no_session_email" }, { status: 400 });

    // Merge/patch: only fields actually present in the payload are changed; omitted fields are preserved.
    const patch = {};
    if (forename !== undefined) patch.forename = forename;
    if (middle_name !== undefined) patch.middle_name = middle_name;
    if (surname !== undefined) patch.surname = surname;
    if (phone !== undefined) patch.phone = phone;
    if (location !== undefined) patch.location = location;

    const existing = await sr.entities.UserProfile.filter({ email: norm });
    if (existing.length > 0) {
      await sr.entities.UserProfile.update(existing[0].id, patch);
    } else {
      await sr.entities.UserProfile.create({ email: norm, forename: "", middle_name: "", surname: "", phone: "", location: "", ...patch });
    }
    return Response.json({ success: true });
  } catch (e) {
    console.error("saveUserProfile error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});