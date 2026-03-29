import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { session_token } = await req.json();

    if (!session_token) {
      return Response.json({ success: false, error: "missing_fields" }, { status: 400 });
    }

    // Look up session
    const sessions = await serviceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];

    if (!session) {
      return Response.json({ success: false, error: "invalid_session" }, { status: 401 });
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      return Response.json({ success: false, error: "session_expired" }, { status: 401 });
    }

    const normalisedEmail = session.email.toLowerCase().trim();
    let role = session.role || null;
    let founding_member_id = session.founding_member_id || null;

    // Look up user type to confirm and enrich data
    const members = await serviceRole.entities.FoundingMember.filter({ email: normalisedEmail });
    if (members?.[0]) {
      role = role || members[0].role;
      founding_member_id = founding_member_id || members[0].id;
    }

    if (!role) {
      const hosts = await serviceRole.entities.Host.filter({ email: normalisedEmail });
      if (hosts?.[0]) role = "host";
    }

    if (!role) {
      const cleaners = await serviceRole.entities.Cleaner.filter({ email: normalisedEmail });
      if (cleaners?.[0]) role = "cleaner";
    }

    if (!role) {
      const guests = await serviceRole.entities.Guest.filter({ email: normalisedEmail });
      if (guests?.[0]) role = "guest";
    }

    return Response.json({
      valid: true,
      email: normalisedEmail,
      role,
      founding_member_id,
      expires_at: session.expires_at,
    });

  } catch (err) {
    console.error("validateSession error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});