import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

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

    // Load User record once for all profile fields
    let signup_postcode = null;
    let forename = null;
    let middle_name = null;
    let surname = null;
    let is_founding_member = false;
    try {
      if (session.user_id) {
        const userRecord = await serviceRole.entities.User.get(session.user_id);
        if (userRecord?.signup_postcode) signup_postcode = userRecord.signup_postcode;
        if (userRecord?.forename) forename = userRecord.forename;
        if (userRecord?.middle_name) middle_name = userRecord.middle_name;
        if (userRecord?.surname) surname = userRecord.surname;
        is_founding_member = userRecord?.is_founding_member || false;
      }
    } catch (_) {}

    // Session is valid — return full session info
    return Response.json({
      authenticated: true,
      email: session.email,
      role: session.role,
      founding_member_id: session.founding_member_id || null,
      user_id: session.user_id || null,
      signup_postcode,
      forename,
      middle_name,
      surname,
      is_founding_member,
    });
  } catch (err) {
    console.error("checkSession error:", err);
    return Response.json(
      { authenticated: false, error: "server_error" },
      { status: 500 },
    );
  }
});