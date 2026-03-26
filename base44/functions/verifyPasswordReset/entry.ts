import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { token, newPassword } = await req.json();

  if (!token || !newPassword) {
    return Response.json({
      success: false,
      error: 'invalid_token'
    });
  }

  // Step 1 — Find token record
  const records = await base44.asServiceRole.entities.PasswordResetToken.filter({
    token,
    used: false
  });

  const record = records?.[0];

  if (!record) {
    return Response.json({
      success: false,
      error: 'invalid_token'
    });
  }

  // Step 2 — Check expiry
  if (new Date() > new Date(record.expires_at)) {
    return Response.json({
      success: false,
      error: 'expired_token'
    });
  }

  // Step 3 — Find user
  const users = await base44.asServiceRole.entities.User.filter({
    id: record.user_id
  });

  const user = users?.[0];

  if (!user) {
    return Response.json({
      success: false,
      error: 'invalid_token'
    });
  }

  // Step 4 — Update password (correct syntax)
  await base44.asServiceRole.entities.User.update({
    id: user.id,
    password: newPassword
  });

  // Step 5 — Mark token as used (correct syntax)
  await base44.asServiceRole.entities.PasswordResetToken.update({
    id: record.id,
    used: true
  });

  // Step 6 — Send confirmation email
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'HostKeep',
      to: user.email,
      subject: 'Your HostKeep password has been updated',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background-color:#0d9488;padding:32px 40px;text-align:center;">
            <span style="color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:-0.5px;">HostKeep</span><br>
            <span style="color:#99f6e4;font-size:13px;">hostkeepdigital.co.uk</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px 40px;">
            <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:bold;color:#111827;">Your password has been updated</h1>
            <p style="font-size:15px;line-height:1.7;color:#374151;margin:0 0 28px 0;">
              Your HostKeep password has been successfully changed.<br><br>
              You can now sign in with your new password.<br><br>
              If you did not make this change, please contact us immediately at hello@hostkeepdigital.co.uk
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
              <tr><td align="center">
                <a href="https://hostkeepdigital.co.uk/SignIn" style="display:inline-block;background-color:#0d9488;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;">Sign In</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px;">
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;">
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px;text-align:center;">
            <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">© 2026 HostKeep Digital Ltd</p>
            <p style="margin:0 0 16px 0;font-size:13px;">
              <a href="mailto:hello@hostkeepdigital.co.uk" style="color:#0d9488;text-decoration:none;">hello@hostkeepdigital.co.uk</a>
            </p>
            <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;font-weight:bold;">Follow us</p>
            <p style="margin:0;font-size:13px;">
              <a href="https://facebook.com/HostKeepDigital" style="color:#0d9488;text-decoration:none;margin-right:16px;">Facebook</a>
              <a href="https://instagram.com/hostkeepdigital" style="color:#0d9488;text-decoration:none;">Instagram</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
    });
  } catch (_) {
    // Non-fatal — password still updated
  }

  return Response.json({ success: true });
});