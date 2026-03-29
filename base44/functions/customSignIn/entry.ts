import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

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

    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ success: false, error: "missing_fields" }, { status: 400 });
    }

    const normalisedEmail = email.toLowerCase().trim();

    // Look up stored credentials
    const credentials = await serviceRole.entities.UserCredentials.filter({ email: normalisedEmail });
    const cred = credentials?.[0];

    if (!cred) {
      return Response.json({ success: false, error: "invalid_credentials" }, { status: 401 });
    }

    // Hash incoming password and compare
    const salt = Deno.env.get("HASH_SALT") || "";
    const incomingHash = await hashPassword(password, salt);

    if (incomingHash !== cred.password_hash) {
      return Response.json({ success: false, error: "invalid_credentials" }, { status: 401 });
    }

    // Determine role and founding_member_id
    let role = null;
    let founding_member_id = null;

    const members = await serviceRole.entities.FoundingMember.filter({ email: normalisedEmail });
    if (members?.[0]) {
      role = members[0].role;
      founding_member_id = members[0].id;
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

    // Create session
    const session_token = crypto.randomUUID();
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
    console.error("customSignIn error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});