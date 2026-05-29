import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { session_token, email } = body;
    if (!session_token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const base44client = createClientFromRequest(req);
    const sessions = await base44client.asServiceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const base44 = base44client;
    const sr = base44.asServiceRole;

    // Cross-user access guard: only admins may fetch another user's profile
    const { target_user_id } = body;
    if (target_user_id && session.role !== "admin") {
      return Response.json({ success: false, error: "forbidden" }, { status: 403 });
    }

    // Derive identity from the session — never require the caller to pass their own email.
    // Admin may target another user by email; everyone else resolves to their own session email.
    let lookupEmail = session.email;
    if (target_user_id && session.role === "admin") {
      const targetUsers = await sr.entities.User.filter({ id: target_user_id });
      lookupEmail = targetUsers?.[0]?.email || null;
    } else if (email && session.role === "admin") {
      lookupEmail = email;
    }
    if (!lookupEmail) return Response.json({ success: true, profile: {} });
    const norm = lookupEmail.toLowerCase().trim();
const records = await sr.entities.UserProfile.filter({ email: norm });
let u = records?.[0] || null;

// Fallback to User entity if no UserProfile exists yet
if (!u) {
  const userRecords = await sr.entities.User.filter({ email: norm });
  const userRecord = userRecords?.[0];
  if (userRecord) {
    u = {
      forename: userRecord.forename || "",
      middle_name: userRecord.middle_name || "",
      surname: userRecord.surname || "",
      phone: userRecord.phone || "",
      location: userRecord.location || "",
      notification_preferences: userRecord.notification_preferences || null,
    };
  }
}

if (!u) return Response.json({ success: true, profile: { email: norm } });
return Response.json({ success: true, profile: { email: norm, forename: u.forename || "", middle_name: u.middle_name || "", surname: u.surname || "", phone: u.phone || "", location: u.location || "", notification_preferences: u.notification_preferences || null } });} catch (e) {
    console.error("getUserProfile error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});