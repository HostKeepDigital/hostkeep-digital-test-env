import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;
    const { email, user_id } = await req.json();

    if (!email && !user_id) {
      return Response.json({ success: false, error: "email or user_id required" }, { status: 400 });
    }

    let u = null;

    // Always filter by email — more reliable than .get() for custom User entity
    if (email) {
      const records = await serviceRole.entities.User.filter({ email: email.toLowerCase().trim() });
      u = records?.[0] || null;
    }

    // Fallback: try filter by id field if email lookup failed
    if (!u && user_id) {
      try {
        const records = await serviceRole.entities.User.filter({ id: user_id });
        u = records?.[0] || null;
      } catch (_) {}
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