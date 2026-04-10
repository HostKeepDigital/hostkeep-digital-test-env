import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { session_token } = await req.json();

    if (!session_token) {
      return Response.json({ success: false, error: "missing_fields" }, { status: 400 });
    }

    const sessions = await serviceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];

    if (!session) {
      return Response.json({ success: false, error: "invalid_session" }, { status: 401 });
    }

    if (new Date(session.expires_at) < new Date()) {
      return Response.json({ success: false, error: "session_expired" }, { status: 401 });
    }

    const normalisedEmail = session.email.toLowerCase().trim();

    // Always load from User entity — the single source of truth for profile data
    let userRecord = null;
    if (session.user_id) {
      userRecord = await serviceRole.entities.User.get(session.user_id);
    }

    // Postcode is now stored on User entity
    const signup_postcode = userRecord?.signup_postcode || null;

    return Response.json({
      success: true,
      email: normalisedEmail,
      role: session.role,
      founding_member_id: session.founding_member_id || null,
      user_id: session.user_id || null,
      expires_at: session.expires_at,
      user: {
        full_name: userRecord?.full_name || "",
        forename: userRecord?.forename || "",
        middle_name: userRecord?.middle_name || "",
        surname: userRecord?.surname || "",
        phone: userRecord?.phone || "",
        location: userRecord?.location || "",
        is_founding_member: userRecord?.is_founding_member || false,
        signup_postcode,
      },
    });

  } catch (err) {
    console.error("getUserFromSession error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});