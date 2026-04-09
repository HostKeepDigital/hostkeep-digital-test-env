import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { session_token, full_name, phone, location } = await req.json();

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

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (location !== undefined) updates.location = location.trim();

    if (Object.keys(updates).length === 0) {
      return Response.json({ success: true });
    }

    // If founding member — update FoundingMember entity
    if (session.founding_member_id) {
      await serviceRole.entities.FoundingMember.update(session.founding_member_id, updates);
      return Response.json({ success: true });
    }

    // Otherwise update User entity — only fields that exist on User
    if (session.user_id) {
      const userUpdates = {};
      if (phone !== undefined) userUpdates.phone = phone.trim();
      if (location !== undefined) userUpdates.location = location.trim();

      if (Object.keys(userUpdates).length > 0) {
        await serviceRole.entities.User.update(session.user_id, userUpdates);
      }

      // full_name goes to UserCredentials via email match
      if (full_name !== undefined) {
        const normalisedEmail = session.email.toLowerCase().trim();
        const creds = await serviceRole.entities.UserCredentials.filter({ email: normalisedEmail });
        if (creds?.[0]) {
          await serviceRole.entities.UserCredentials.update(creds[0].id, { full_name: full_name.trim() });
        }
      }

      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: "user_not_found" }, { status: 404 });

  } catch (err) {
    console.error("updateProfile error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});