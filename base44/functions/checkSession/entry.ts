import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const session_token =
      body.session_token || req.headers.get("x-session-token");

    if (!session_token) {
      return Response.json({
        authenticated: false,
        error: "no_session_token",
      });
    }

    const sessions = await serviceRole.entities.UserSession.filter({
      session_token,
    });
    const session = sessions?.[0];

    if (!session) {
      return Response.json({
        authenticated: false,
        error: "invalid_session",
      });
    }

    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (expiresAt < now) {
      return Response.json({
        authenticated: false,
        error: "session_expired",
      });
    }

    // ⭐ NEW: derive signup_postcode from FoundingMember
    let signup_postcode = null;

    try {
      const normalisedEmail = session.email.toLowerCase().trim();

      const members = await serviceRole.entities.FoundingMember.filter({
        email: normalisedEmail,
      });

      if (members?.[0]?.postcode) {
        signup_postcode = (members[0].postcode || "")
          .trim()
          .toUpperCase();
      }
    } catch (_) {
      // silent fail — postcode is optional
    }

    // ⭐ Fetch full_name from User entity (covers all signup paths)
    let full_name = null;
    try {
      if (session.user_id) {
        const userRecord = await serviceRole.entities.User.get(session.user_id);
        if (userRecord?.full_name) full_name = userRecord.full_name;
      }
      // Fallback to FoundingMember for legacy users without a User record
      if (!full_name && session.founding_member_id) {
        const members = await serviceRole.entities.FoundingMember.filter({ id: session.founding_member_id });
        if (members?.[0]?.full_name) full_name = members[0].full_name;
      }
    } catch (_) {}

    // ⭐ Session is valid — return full session info
    return Response.json({
      authenticated: true,
      email: session.email,
      role: session.role,
      founding_member_id: session.founding_member_id || null,
      user_id: session.user_id || null,
      signup_postcode,
      full_name,
    });
  } catch (err) {
    console.error("checkSession error:", err);
    return Response.json(
      { authenticated: false, error: "server_error" },
      { status: 500 },
    );
  }
});