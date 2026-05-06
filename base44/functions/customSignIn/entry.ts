import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

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
    const isApp = is_app === true;

    // ── ADMIN BYPASS ──────────────────────────────────────────────────────
    // Admin account has no UserCredentials record. Auth is handled via
    // ADMIN_PASSWORD secret set in Base44 Secrets — never UserCredentials.
    const adminEmails = ["admin@hostkeepdigital.co.uk"];
    if (adminEmails.includes(normalisedEmail)) {
      const adminPwd = Deno.env.get("ADMIN_PASSWORD") || "";
      if (!adminPwd || password !== adminPwd) {
        await new Promise(r => setTimeout(r, 500));
        return Response.json(
          { success: false, error: "invalid_credentials" },
          { status: 200 }
        );
      }
      // Look up admin User record to get user_id for session
      let adminUserId = null;
      try {
        const adminUsers = await serviceRole.entities.User.filter({ email: normalisedEmail });
        adminUserId = adminUsers?.[0]?.id || null;
      } catch (_) {}
      const session_token = crypto.randomUUID();
      const expires_at = new Date(
        Date.now() + (isApp ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
      ).toISOString();
      await serviceRole.entities.UserSession.create({
        session_token,
        email: normalisedEmail,
        role: "admin",
        founding_member_id: null,
        user_id: adminUserId,
        expires_at,
      });
      return Response.json({
        success: true,
        session_token,
        email: normalisedEmail,
        role: "admin",
        founding_member_id: null,
        expires_at,
      });
    }

    // ── REGULAR USER AUTH ─────────────────────────────────────────────────
    const credentials = await serviceRole.entities.UserCredentials.filter({
      email: normalisedEmail,
    });
    const cred = credentials?.[0];

    if (!cred) {
      await new Promise(r => setTimeout(r, 500));
      return Response.json(
        { success: false, error: "invalid_credentials" },
        { status: 200 }
      );
    }

    // ── ACCOUNT LOCKOUT CHECK ─────────────────────────────────────────────
    if (cred.locked_until && new Date(cred.locked_until) > new Date()) {
      const unlockMinutes = Math.ceil(
        (new Date(cred.locked_until) - Date.now()) / 60000
      );
      await new Promise(r => setTimeout(r, 500));
      return Response.json(
        {
          success: false,
          error: "account_locked",
          message: `Too many failed attempts. Try again in ${unlockMinutes} minute${unlockMinutes === 1 ? "" : "s"}.`,
        },
        { status: 200 }
      );
    }

    const salt = Deno.env.get("HASH_SALT") || "";
    const incomingHash = await hashPassword(password, salt);

    if (incomingHash !== cred.password_hash) {
      const newAttempts = (cred.failed_attempts || 0) + 1;
      const shouldLock = newAttempts >= MAX_ATTEMPTS;
      try {
        await serviceRole.entities.UserCredentials.update(cred.id, {
          failed_attempts: newAttempts,
          locked_until: shouldLock
            ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
            : null,
        });
      } catch (_) {}
      await new Promise(r => setTimeout(r, 500));
      if (shouldLock) {
        return Response.json(
          {
            success: false,
            error: "account_locked",
            message: "Too many failed attempts. Your account has been locked for 15 minutes.",
          },
          { status: 200 }
        );
      }
      return Response.json(
        { success: false, error: "invalid_credentials" },
        { status: 200 }
      );
    }

    // ── PASSWORD CORRECT — reset lockout state ────────────────────────────
    try {
      await serviceRole.entities.UserCredentials.update(cred.id, {
        failed_attempts: 0,
        locked_until: null,
      });
    } catch (_) {}

    let role = null;
    let founding_member_id = null;
    let userId = null;

    const members = await serviceRole.entities.FoundingMember.filter({
      email: normalisedEmail,
    });
    if (members?.[0]) {
      founding_member_id = members[0].id;
    }

    if (cred.user_id) {
      userId = cred.user_id;
    }
    if (!userId && members?.[0]?.user_id) {
      userId = members[0].user_id;
    }

    try {
      if (userId) {
        const userRoles = await serviceRole.entities.UserRole.filter({
          user_id: userId,
        });
        const approved = userRoles.filter(
          (r) => (r.approval_status || "").toLowerCase() === "approved"
        );
        const priority = ["host", "cleaner"];
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
    } catch (_) {}

    if (!role && members?.[0]?.role) {
      role = members[0].role;
    }
    if (!role) {
      role = "guest";
    }

    // Block banned guests
    if (role === "guest") {
      const guestRecords = await serviceRole.entities.Guest.filter({ email: normalisedEmail });
      if (guestRecords?.[0]?.status === "blacklisted") {
        return Response.json(
          { success: false, error: "account_suspended", message: "Your account has been suspended. Please contact hello@hostkeepdigital.co.uk if you believe this is an error." },
          { status: 200 }
        );
      }
    }

    // Block unverified guests
    if (role === "guest") {
      if (cred.email_verified !== true) {
        return Response.json(
          { success: false, error: "email_not_verified", email: normalisedEmail },
          { status: 200 }
        );
      }
    }

    const session_token = crypto.randomUUID();
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
