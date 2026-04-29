import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { session_token, forename, middle_name, surname, phone, location } = await req.json();

    if (!session_token) {
      return Response.json({ success: false, error: "missing_session_token" }, { status: 401 });
    }

    const sessions = await serviceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];

    if (!session) {
      return Response.json({ success: false, error: "invalid_session" }, { status: 401 });
    }

    if (new Date(session.expires_at) < new Date()) {
      return Response.json({ success: false, error: "session_expired" }, { status: 401 });
    }

    if (!session.user_id) {
      return Response.json({ success: false, error: "no_user_id" }, { status: 400 });
    }

    // Unified: always write to User entity
    const updates = {};
    if (forename != null) updates.forename = String(forename).trim();
    if (middle_name != null) updates.middle_name = String(middle_name).trim();
    if (surname != null) updates.surname = String(surname).trim();
    if (forename != null || surname != null) {
      updates.full_name = [forename, middle_name, surname].filter(Boolean).map(s => String(s).trim()).join(" ");
    }
    if (phone != null) updates.phone = String(phone).trim();
    if (location != null) updates.location = String(location).trim();

    if (Object.keys(updates).length > 0) {
      await serviceRole.entities.User.update(session.user_id, updates);
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error("updateProfile error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});