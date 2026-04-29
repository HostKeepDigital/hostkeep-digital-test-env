import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const { email, forename, middle_name, surname, phone, location } = await req.json();
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