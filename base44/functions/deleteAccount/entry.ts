import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;
    const body = await req.json();
    const { session_token, admin_delete_email } = body;

    let email = null;
    let founding_member_id = null;
    let user_id = null;

    if (admin_delete_email) {
      // Admin path — delete by email directly
      email = admin_delete_email.toLowerCase().trim();
    } else {
      // Self-delete path — validate session first
      if (!session_token) {
        return Response.json({ success: false, error: "missing_session_token" }, { status: 401 });
      }
      const sessions = await serviceRole.entities.UserSession.filter({ session_token });
      const session = sessions?.[0];
      if (!session) {
        return Response.json({ success: false, error: "invalid_session" }, { status: 401 });
      }
      email = session.email;
      founding_member_id = session.founding_member_id;
      user_id = session.user_id;
    }

    // 1. Delete all UserSession records for this email
    const allSessions = await serviceRole.entities.UserSession.filter({ email });
    for (const s of allSessions) {
      await serviceRole.entities.UserSession.delete(s.id);
    }

    // 2. Delete UserCredentials
    const creds = await serviceRole.entities.UserCredentials.filter({ email });
    for (const c of creds) {
      await serviceRole.entities.UserCredentials.delete(c.id);
    }

    // 3. Delete FoundingMember
    const members = await serviceRole.entities.FoundingMember.filter({ email });
    for (const m of members) {
      await serviceRole.entities.FoundingMember.delete(m.id);
    }

    // 4. Delete Property records owned by this user
    if (user_id) {
      const properties = await serviceRole.entities.Property.filter({ owner_id: user_id });
      for (const p of properties) {
        await serviceRole.entities.Property.delete(p.id);
      }
    }

    // 5. Delete UserRole records if we have a user_id
    if (user_id) {
      const roles = await serviceRole.entities.UserRole.filter({ user_id });
      for (const r of roles) {
        await serviceRole.entities.UserRole.delete(r.id);
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("deleteAccount error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});