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

  // 2. Host
  const hosts = await serviceRole.entities.Host.filter({ email });
  if (hosts && hosts.length > 0) {
    return {
      user: hosts[0],
      role: "host",
      founding_member_id: null,
    };
  }

  // 3. Cleaner
  const cleaners = await serviceRole.entities.Cleaner.filter({ email });
  if (cleaners && cleaners.length > 0) {
    return {
      user: cleaners[0],
      role: "cleaner",
      founding_member_id: null,
    };
  }

  // 4. Guest
  const guests = await serviceRole.entities.Guest.filter({ email });
  if (guests && guests.length > 0) {
    return {
      user: guests[0],
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

    const { email, password } = await req.json();

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

    // Store credentials
    await serviceRole.entities.UserCredentials.create({
      email: normalisedEmail,
      password_hash,
      founding_member_id,
    });

    // Create session
    const session_token = generateToken();
    const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await serviceRole.entities.UserSession.create({
      session_token,
      email: normalisedEmail,
      role,
      founding_member_id,
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
    console.error("setOnboardingPassword error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});