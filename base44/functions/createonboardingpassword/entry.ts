import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

function generateToken(length = 48) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { email } = await req.json();

    if (!email) {
      return Response.json({ success: false, error: "missing_fields" }, { status: 400 });
    }

    const normalisedEmail = email.toLowerCase().trim();

    // 1) Find founding member and validate status
    const members = await serviceRole.entities.FoundingMember.filter({ email: normalisedEmail });
    const member = members?.[0];

    if (!member) {
      return Response.json({ success: false, error: "not_found" }, { status: 400 });
    }

    const allowed = ["invited", "email_verified", "awaiting_password"];
    if (!allowed.includes(member.approval_status)) {
      return Response.json({ success: false, error: "wrong_state" }, { status: 400 });
    }

    // 2) Find existing user
    const existingUsers = await serviceRole.entities.User.filter({ email: normalisedEmail });
    const user = existingUsers?.[0];

    if (!user) {
      return Response.json({ success: false, error: "user_not_found" }, { status: 400 });
    }

    // 3) Generate a password reset token (same mechanism as sendPasswordReset)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Invalidate any existing reset tokens for this email
    const existing = await serviceRole.entities.PasswordResetToken.filter({ email: normalisedEmail });
    for (const t of existing) {
      await serviceRole.entities.PasswordResetToken.delete(t.id);
    }

    await serviceRole.entities.PasswordResetToken.create({
      email: normalisedEmail,
      token,
      expires_at: expiresAt,
    });

    // 4) Mark founding member as password_protected
    await serviceRole.entities.FoundingMember.update(member.id, {
      user_id: user.id,
      approval_status: "password_protected",
    });

    return Response.json({ success: true, resetToken: token });

  } catch (err) {
    console.error("createonboardingpassword error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});