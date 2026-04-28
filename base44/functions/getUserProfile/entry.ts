import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;
    const { email, user_id } = await req.json();

    let u = null;

    if (user_id) {
      try { u = await serviceRole.entities.User.get(user_id); } catch (_) {}
    }

    if (!u && email) {
      const records = await serviceRole.entities.User.filter({ email: email.toLowerCase().trim() });
      u = records?.[0] || null;
    }

    if (!u) return Response.json({ success: true, profile: null });

    return Response.json({
      success: true,
      profile: {
        forename: u.forename || "",
        middle_name: u.middle_name || "",
        surname: u.surname || "",
        phone: u.phone || "",
        location: u.location || "",
        notification_preferences: u.notification_preferences || null,
      }
    });
  } catch (e) {
    console.error("getUserProfile error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});