import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const { email } = await req.json();
    if (!email) return Response.json({ success: false, error: "email required" }, { status: 400 });
    const norm = email.toLowerCase().trim();
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

if (!u) return Response.json({ success: true, profile: null });
return Response.json({ success: true, profile: { forename: u.forename || "", middle_name: u.middle_name || "", surname: u.surname || "", phone: u.phone || "", location: u.location || "", notification_preferences: u.notification_preferences || null } });} catch (e) {
    console.error("getUserProfile error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});