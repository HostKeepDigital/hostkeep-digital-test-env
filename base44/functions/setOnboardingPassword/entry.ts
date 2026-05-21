import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateToken() {
  return crypto.randomUUID();
}

async function findUserByEmail(serviceRole, email) {
  // 1. FoundingMember (beta users)
  const fm = await serviceRole.entities.FoundingMember.filter({ email });
  if (fm && fm.length > 0) {
    return {
      user: fm[0],
      role: fm[0].role || "host",
      founding_member_id: fm[0].id,
    };
  }

  // 2. User entity (post-beta or existing guest applying as host)
  const users = await serviceRole.entities.User.filter({ email });
  if (users && users.length > 0) {
    return {
      user: users[0],
      role: "guest",
      founding_member_id: null,
    };
  }

  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { email, password, forename, middle_name, surname } = await req.json();

    if (!email || !password) {
      return Response.json(
        { success: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const normalisedEmail = email.toLowerCase().trim();

    // Hash password
    const salt = Deno.env.get("HASH_SALT") || "";
    const password_hash = await hashPassword(password, salt);

    // Find user across all possible user types
    const userLookup = await findUserByEmail(serviceRole, normalisedEmail);

    if (!userLookup) {
      return Response.json(
        { success: false, error: "user_not_found" },
        { status: 404 }
      );
    }

    const { role, founding_member_id } = userLookup;

    // Store credentials — update if already exist, create if not
    const existingCreds = await serviceRole.entities.UserCredentials.filter({ email: normalisedEmail });
    if (existingCreds && existingCreds.length > 0) {
      await serviceRole.entities.UserCredentials.update(existingCreds[0].id, {
        password_hash,
        founding_member_id: founding_member_id || existingCreds[0].founding_member_id,
      });
    } else {
      await serviceRole.entities.UserCredentials.create({
        email: normalisedEmail,
        password_hash,
        founding_member_id,
      });
    }

    // Move FoundingMember from invited → password_protected, and stamp user_id
    if (founding_member_id) {
      const users = await serviceRole.entities.User.filter({ email: normalisedEmail });
      const foundUser = users?.[0];
      await serviceRole.entities.FoundingMember.update(founding_member_id, {
        approval_status: "password_protected",
        user_id: foundUser?.id || null,
      });
    }

    // Create session
    const session_token = generateToken();
    const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      await serviceRole.entities.UserSession.create({
       session_token,
       email: normalisedEmail,
       role,
       founding_member_id,
       user_id: userLookup.user?.id || null,
       expires_at,
});

    // Save UserProfile name parts if provided (founding host onboarding)
    if (forename && surname) {
      const existing = await serviceRole.entities.UserProfile.filter({ email: normalisedEmail });
      if (existing.length > 0) {
        await serviceRole.entities.UserProfile.update(existing[0].id, { forename, middle_name: middle_name || "", surname });
      } else {
        await serviceRole.entities.UserProfile.create({ email: normalisedEmail, forename, middle_name: middle_name || "", surname, phone: "", location: "" });
      }
    }

    return Response.json({
      success: true,
      session_token,
      email: normalisedEmail,
      role,
      founding_member_id,
      expires_at,
    });

  } catch (err) {
    console.error("setOnboardingPassword error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});