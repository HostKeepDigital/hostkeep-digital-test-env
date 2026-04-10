import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

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

    // Build full_name from parts
    const fullName = [forename || "", middle_name || "", surname || ""]
      .map(s => (s || "").trim())
      .filter(Boolean)
      .join(" ");

    // Unified: always write to User entity
    const updates = {};
    if (forename !== undefined) updates.forename = forename.trim();
    if (middle_name !== undefined) updates.middle_name = middle_name.trim();
    if (surname !== undefined) updates.surname = surname.trim();
    if (fullName) updates.full_name = fullName;
    if (phone !== undefined) updates.phone = phone.trim();
    if (location !== undefined) updates.location = location.trim();

    if (Object.keys(updates).length > 0) {
      await serviceRole.entities.User.update(session.user_id, updates);
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error("updateProfile error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});