import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const LOGO_URL = 'https://i.ibb.co/6cwz6PzN/Host-Keep-Digital-Navy-Background.png';
const FB_ICON = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/600px-Facebook_Logo_%282019%29.png';
const IG_ICON = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png';
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

async function sendResendEmail(to: string, subject: string, html: string) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'HostKeep <hello@hostkeepdigital.co.uk>',
      to: [to],
      subject,
      html,
    }),
  });
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { email, full_name } = await req.json();

  if (!email) {
    return Response.json({ error: 'Email is required' }, { status: 400 });
  }

  // Invalidate all previous codes for this email
  const existing = await base44.asServiceRole.entities.EmailVerificationCode.filter({ email: email.toLowerCase().trim() });
  for (const c of existing) {
    await base44.asServiceRole.entities.EmailVerificationCode.update(c.id, { used: true });
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await base44.asServiceRole.entities.EmailVerificationCode.create({
    email: email.toLowerCase().trim(),
    code,
    expires_at: expiresAt,
    used: false,
  });

  const firstName = (full_name || email).split(' ')[0];

  await sendResendEmail(
    email,
    'Your HostKeep verification code',
    `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
      <tr>
        <td style="background-color:#1E3A5F;padding:24px 40px;text-align:center;">
          <img src="${LOGO_URL}" alt="HostKeep Digital" width="200" style="display:block;margin:0 auto;max-width:200px;height:auto;" />
        </td>
      </tr>
      <tr>
        <td style="padding:40px 40px 32px 40px;">
          <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:bold;color:#111827;">Your verification code</h1>
          <div style="font-size:15px;line-height:1.7;color:#374151;">
            <p>Hi ${firstName},</p>
            <p>Use the code below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
            <div style="background:#f0fdf4;border:2px solid #0f766e;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
              <p style="margin:0 0 8px;color:#666;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Your verification code</p>
              <p style="margin:0;font-size:40px;font-weight:700;letter-spacing:12px;color:#1E3A5F;">${code}</p>
            </div>
            <p style="font-size:13px;color:#9ca3af;">If you did not request this code, please ignore this email.</p>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td>
      </tr>
      <tr>
        <td style="padding:28px 40px;text-align:center;">
          <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">© 2026 HostKeep Digital Ltd</p>
          <p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">
            <a href="mailto:hello@hostkeepdigital.co.uk" style="color:#0d9488;text-decoration:none;">hello@hostkeepdigital.co.uk</a>
          </p>
          <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;font-weight:bold;">Follow us</p>
          <p style="margin:0;">
            <a href="https://facebook.com/HostKeepDigital" style="text-decoration:none;margin-right:12px;display:inline-block;">
              <img src="${FB_ICON}" alt="Facebook" width="32" height="32" style="display:inline-block;border-radius:6px;" />
            </a>
            <a href="https://instagram.com/hostkeepdigital" style="text-decoration:none;display:inline-block;">
              <img src="${IG_ICON}" alt="Instagram" width="32" height="32" style="display:inline-block;border-radius:6px;" />
            </a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
  );

  return Response.json({ success: true });
});