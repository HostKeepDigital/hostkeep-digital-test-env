import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json();
    const { session_token, phone, phone_verified, property_address } = body || {};

    if (!session_token) {
      return Response.json({ success: false, error: "unauthorized" }, { status: 401 });
    }

    // Validate session
    const sessions = await sr.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ success: false, error: "unauthorized" }, { status: 401 });
    }

    const user_id = session.user_id;

    if (!phone || phone_verified !== true) {
      return Response.json({ success: false, error: "missing_fields" }, { status: 400 });
    }

    // Step 1 — Create or update host UserRole
    const existingRoles = await sr.entities.UserRole.filter({ user_id, role: "host" });
    if (existingRoles?.length > 0) {
      await sr.entities.UserRole.update(existingRoles[0].id, { approval_status: "pending" });
    } else {
      await sr.entities.UserRole.create({ user_id, role: "host", approval_status: "pending" });
    }

    // Step 2 — Update FoundingMember
    const foundingMembers = await sr.entities.FoundingMember.filter({ user_id });
    if (foundingMembers?.length > 0) {
      await sr.entities.FoundingMember.update(foundingMembers[0].id, {
        approval_status: "awaiting_document_verification",
      });
    }

    // Step 3 — Update User
    const credentials = await sr.entities.UserCredentials.filter({ user_id });
    if (credentials?.length > 0) {
      const email = credentials[0].email;
      const users = await sr.entities.User.filter({ email });
      if (users?.length > 0) {
        await sr.entities.User.update(users[0].id, {
          phone,
          phone_verified: true,
          account_status: "pending_review",
        });
      }
    }

    // Step 4 — Notify admin
    const adminRoles = await sr.entities.UserSession.filter({ role: "admin" });
    if (adminRoles?.length > 0) {
      const adminUserId = adminRoles[0].user_id;
      const appId = Deno.env.get("BASE44_APP_ID");
      const serviceKey = Deno.env.get("LOCK_ACCESS_TOKEN");

      await fetch(`/api/apps/${appId}/functions/sendNotification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_key: serviceKey,
          user_id: adminUserId,
          type: "general",
          title: "New host verification submitted",
          body: "A host has completed verification and is awaiting document review.",
          link: "/AdminPanel",
        }),
      });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});