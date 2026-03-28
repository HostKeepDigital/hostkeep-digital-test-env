import { createClientFromRequest } from "npm:@base44/sdk";

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req).asServiceRole;

  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ success: false, error: "missing_fields" }, { status: 400 });
    }

    const normalisedEmail = email.toLowerCase().trim();

    // Validate founding member exists and is in the right state
    let member = null;
    try {
      const members = await base44.entities.FoundingMember.filter({ email: normalisedEmail });
      member = members?.[0];
    } catch (err) {
      return Response.json({ success: false, error: "not_found" }, { status: 400 });
    }

    if (!member) {
      return Response.json({ success: false, error: "not_found" }, { status: 400 });
    }

    const allowed = ["invited", "email_verified", "awaiting_password"];
    if (!allowed.includes(member.approval_status)) {
      return Response.json({ success: false, error: "wrong_state" }, { status: 400 });
    }

    // User already exists — created by approveUser
    const existingUsers = await base44.entities.User.filter({ email: normalisedEmail });
    const user = existingUsers?.[0];

    if (!user) {
      return Response.json({ success: false, error: "user_not_found" }, { status: 400 });
    }

    // Clear any existing reset tokens for this email
    const existingTokens = await base44.entities.PasswordResetToken.filter({ email: normalisedEmail });
    for (const t of existingTokens) {
      await base44.entities.PasswordResetToken.delete(t.id);
    }

    // Generate a password reset token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await base44.entities.PasswordResetToken.create({
      user_id: user.id,
      email: normalisedEmail,
      token,
      expires_at: expiresAt,
      used: false,
    });

    // Update founding member status
    await base44.entities.FoundingMember.update(member.id, {
      approval_status: "password_protected",
    });

    return Response.json({ success: true, resetToken: token });

  } catch (err) {
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});