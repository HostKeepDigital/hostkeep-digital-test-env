import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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

  // Send the verification email
  await base44.asServiceRole.integrations.Core.SendEmail({
    from_name: 'HostKeep Digital',
    to: email,
    subject: 'Your HostKeep Digital verification code',
    body: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1E3A5F;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:0.5px;">HostKeep Digital</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;color:#333333;font-size:15px;line-height:1.7;text-align:center;">
            <p style="margin:0 0 16px;text-align:left;">Hi ${firstName},</p>
            <p style="margin:0 0 24px;text-align:left;">Please use the verification code below to complete your HostKeep Digital founding member application. This code expires in <strong>10 minutes</strong>.</p>
            <div style="background:#f0fdf4;border:2px solid #0f766e;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;">
              <p style="margin:0 0 8px;color:#666;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Your verification code</p>
              <p style="margin:0;font-size:40px;font-weight:700;letter-spacing:12px;color:#1E3A5F;">${code}</p>
            </div>
            <p style="margin:0 0 4px;text-align:left;color:#999;font-size:13px;">If you did not request this code, please ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #eeeeee;padding:20px 40px;text-align:center;color:#999999;font-size:12px;line-height:1.8;">
            HostKeep Digital Ltd | This code expires in 10 minutes.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  });

  return Response.json({ success: true });
});