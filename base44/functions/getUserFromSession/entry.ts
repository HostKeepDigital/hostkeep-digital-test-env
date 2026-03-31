import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { session_token } = await req.json();

    if (!session_token) {
      return Response.json(
        { success: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    // Look up session
    const sessions = await serviceRole.entities.UserSession.filter({
      session_token,
    });
    const session = sessions?.[0];

    if (!session) {
      return Response.json(
        { success: false, error: "invalid_session" },
        { status: 401 }
      );
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      return Response.json(
        { success: false, error: "session_expired" },
        { status: 401 }
      );
    }

    const normalisedEmail = session.email.toLowerCase().trim();

    // Start with session values
    let role = session.role || null;
    let founding_member_id = session.founding_member_id || null;
    let user = null;

    // ────────────────────────────────────────────────────────────────
    // 1. FoundingMember lookup (always preferred for profile fields)
    // ────────────────────────────────────────────────────────────────
    const members = await serviceRole.entities.FoundingMember.filter({
      email: normalisedEmail,
    });

    if (members?.[0]) {
      user = members[0];

      // Only override role if session.role is empty or guest
      if (!role || role === "guest") {
        role = members[0].role;
      }

      founding_member_id = founding_member_id || members[0].id;
    }

    // ────────────────────────────────────────────────────────────────
    // 2. Legacy Host entity
    // ────────────────────────────────────────────────────────────────
    if (!user) {
      const hosts = await serviceRole.entities.Host.filter({
        email: normalisedEmail,
      });

      if (hosts?.[0]) {
        user = hosts[0];

        if (!role || role === "guest") {
          role = "host";
        }
      }
    }

    // ────────────────────────────────────────────────────────────────
    // 3. Legacy Cleaner entity
    // ────────────────────────────────────────────────────────────────
    if (!user) {
      const cleaners = await serviceRole.entities.Cleaner.filter({
        email: normalisedEmail,
      });

      if (cleaners?.[0]) {
        user = cleaners[0];

        if (!role || role === "guest") {
          role = "cleaner";
        }
      }
    }

    // ────────────────────────────────────────────────────────────────
    // 4. Legacy Guest entity
    // ────────────────────────────────────────────────────────────────
    if (!user) {
      const guests = await serviceRole.entities.Guest.filter({
        email: normalisedEmail,
      });

      if (guests?.[0]) {
        user = guests[0];

        if (!role) {
          role = "guest";
        }
      }
    }

    // ────────────────────────────────────────────────────────────────
    // 5. Load FoundingMember profile for merged fields
    // ────────────────────────────────────────────────────────────────
    let fmProfile = null;

    if (founding_member_id) {
      fmProfile = await serviceRole.entities.FoundingMember.get(
        founding_member_id
      );
    }

    // ────────────────────────────────────────────────────────────────
    // 6. Final response
    // ────────────────────────────────────────────────────────────────
    return Response.json({
      success: true,
      email: normalisedEmail,
      role,
      founding_member_id,
      expires_at: session.expires_at,

      user: {
        ...user,
        full_name: fmProfile?.full_name || user?.full_name || "",
        phone: fmProfile?.phone || "",
        location: fmProfile?.location || "",
      },
    });
  } catch (err) {
    console.error("getUserFromSession error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});