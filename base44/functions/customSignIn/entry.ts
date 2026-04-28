import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const body = await req.json();
    const { email, password, is_app } = body || {};

    if (!email || !password) {
      return Response.json(
        { success: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const normalisedEmail = email.toLowerCase().trim();

    const credentials = await serviceRole.entities.UserCredentials.filter({
      email: normalisedEmail,
    });
    const cred = credentials?.[0];

    if (!cred) {
      return Response.json(
        { success: false, error: "invalid_credentials" },
        { status: 401 }
      );
    }

    const salt = Deno.env.get("HASH_SALT") || "";
    const incomingHash = await hashPassword(password, salt);

    if (incomingHash !== cred.password_hash) {
      return Response.json(
        { success: false, error: "invalid_credentials" },
        { status: 401 }
      );
    }

    let role = null;
    let founding_member_id = null;
    let userId = null;

    // Look up the actual User entity record by email
    try {
      const userRecords = await serviceRole.entities.User.filter({ email: normalisedEmail });
      if (userRecords?.[0]) {
        userId = userRecords[0].id;
      }
    } catch (_) {}

    // Check FoundingMember
    const members = await serviceRole.entities.FoundingMember.filter({
      email: normalisedEmail,
    });
    if (members?.[0]) {
      founding_member_id = members[0].id;
    }

    // Resolve role via UserRole (approved)
    try {
      let b44UserId = cred.id;
      
      if (b44UserId) {
        const userRoles = await serviceRole.entities.UserRole.filter({
          user_id: b44UserId,
        });

        const approved = userRoles.filter(
          (r) => (r.approval_status || "").toLowerCase() === "approved"
        );

        const priority = ["admin", "host", "cleaner"];
        for (const p of priority) {
          if (approved.some((r) => r.role === p)) {
            role = p;
            break;
          }
        }

        if (!role && approved.some((r) => r.role === "guest")) {
          role = "guest";
        }
      }
    } catch (_) {
      // Role lookup failed, will use fallback below
    }

    // ADMIN OVERRIDE
    const adminEmails = ["admin@hostkeepdigital.co.uk"];
    if (adminEmails.includes(normalisedEmail)) {
      role = "admin";
    }

    // FALLBACK TO FOUNDING MEMBER ROLE
    if (!role && !adminEmails.includes(normalisedEmail) && members?.[0]?.role) {
      role = members[0].role;
    }

    // Final fallback
    if (!role) {
      role = "guest";
    }

    // Block unverified guest accounts from signing in
    if (role === "guest" && !adminEmails.includes(normalisedEmail)) {
      if (cred.email_verified !== true) {
        return Response.json(
          { success: false, error: "email_not_verified", email: normalisedEmail },
          { status: 200 }
        );
      }
    }

    const session_token = crypto.randomUUID();

    const isApp = is_app === true;
    let expiresAt;

    if (role === "founding_member") {
      expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    } else if (isApp) {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const expires_at = expiresAt.toISOString();

    await serviceRole.entities.UserSession.create({
      session_token,
      email: normalisedEmail,
      role,
      founding_member_id,
      user_id: userId || null,
      expires_at,
    });

    return Response.json({
      success: true,
      session_token,
      email: normalisedEmail,
      role,
      founding_member_id,
      expires_at,
    });
  } catch (err) {
    console.error("customSignIn error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});