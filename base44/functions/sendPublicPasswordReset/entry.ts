/**
 * sendPublicPasswordReset — public endpoint (no auth required)
 * Accepts an email address and triggers the custom password reset flow.
 * Always returns success to prevent email enumeration.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendResetEmail(to, resetUrl) {
  if (!RESEND_API_KEY) return;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background-color:#1E3A5F;padding:32px 40px;text-align:center;">
            <img src="https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/HostKeep_Digital_Navy_Background.png" alt="HostKeep Digital" width="200" style="display:block;margin:0 auto;max-width:200px;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px 40px;">
            <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:bold;color:#111827;">Reset your password</h1>
            <p style="font-size:15px;line-height:1.7;color:#374151;margin:0 0 28px 0;">
              We received a request to reset the password for your HostKeep account.<br><br>
              Click the button below to choose a new password. This link will expire in <strong>1 hour</strong>.<br><br>
              If you did not request a password reset you can safely ignore this email — your password has not been changed.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
              <tr><td align="center">
                <a href="${resetUrl}" style="display:inline-block;background-color:#0d9488;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;">Reset My Password</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td></tr>
        <tr>
          <td style="padding:28px 40px;text-align:center;">
            <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">© 2026 HostKeep Digital Ltd</p>
            <p style="margin:0;font-size:13px;">
              <a href="mailto:hello@hostkeepdigital.co.uk" style="color:#0d9488;text-decoration:none;">hello@hostkeepdigital.co.uk</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "HostKeep <hello@hostkeepdigital.co.uk>",
      to,
      subject: "Reset your HostKeep password",
      html,
    }),
  });
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    // Always return success — never reveal whether an email exists
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return Response.json({ success: false, error: "email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    // Check UserCredentials (custom auth system)
    const creds = await serviceRole.entities.UserCredentials.filter({ email: normalizedEmail });
    if (!creds || creds.length === 0) {
      // Email not in custom auth — return success silently (enumeration prevention)
      return Response.json({ success: true });
    }

    // Delete any existing reset tokens for this email
    try {
      const existingTokens = await serviceRole.entities.PasswordResetToken.filter({ email: normalizedEmail });
      for (const t of existingTokens) {
        await serviceRole.entities.PasswordResetToken.delete(t.id);
      }
    } catch (_) {}

    // Generate a new token — 1 hour expiry
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await serviceRole.entities.PasswordResetToken.create({
      user_id: normalizedEmail,
      email: normalizedEmail,
      token,
      expires_at: expiresAt,
      used: false,
    });

    const resetUrl = `https://hostkeepdigital.co.uk/ResetPassword?token=${token}`;
    await sendResetEmail(normalizedEmail, resetUrl);

  } catch (e) {
    console.error("sendPublicPasswordReset error:", e.message);
    // Swallow — always return success
  }

  return Response.json({ success: true });
});
