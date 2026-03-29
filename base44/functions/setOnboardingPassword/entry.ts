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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ success: false, error: "missing_fields" }, { status: 400 });
    }

    const normalisedEmail = email.toLowerCase().trim();

    // Hash the password
    const salt = Deno.env.get("HASH_SALT") || "";
    const password_hash = await hashPassword(password, salt);

    // Look up the FoundingMember to get founding_member_id and role
    const members = await serviceRole.entities.FoundingMember.filter({ email: normalisedEmail });
    const member = members?.[0];

    const founding_member_id = member?.id || null;
    const role = member?.role || null;

    // Insert into UserCredentials
    const now = new Date().toISOString();
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
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});