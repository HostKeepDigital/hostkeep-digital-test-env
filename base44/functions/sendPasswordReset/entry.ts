import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function buildEmail({ heading, body, buttonText, buttonUrl }) {
  const buttonBlock = buttonText && buttonUrl ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
        <tr>
          <td align="center">
            <a href="${buttonUrl}" style="display:inline-block;background-color:#0d9488;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;">
              ${buttonText}
            </a>
          </td>
        </tr>
      </table>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HostKeep</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#0d9488;padding:32px 40px;text-align:center;">
              <span style="color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:-0.5px;">HostKeep</span>
              <br>
              <span style="color:#99f6e4;font-size:13px;">hostkeepdigital.co.uk</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px 40px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:bold;color:#111827;">${heading}</h1>
              <div style="font-size:15px;line-height:1.7;color:#374151;">${body}</div>
              ${buttonBlock}
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
              <p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">
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
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    // Step 1 — Generate reset token via Base44
    try {
      await base44.auth.sendPasswordResetEmail(email);
    } catch (_) {
      // Silently ignore — don't reveal if account exists
    }

    // Step 2 — Send branded email
    await base44.integrations.Core.SendEmail({
      from_name: 'HostKeep',
      to: email,
      subject: 'Reset your HostKeep password',
      html: buildEmail({
        heading: 'Reset your password',
        body: 'We received a request to reset the password for your HostKeep account.<br><br>Click the button below to choose a new password. This link will expire after 1 hour.<br><br>If you did not request a password reset, you can safely ignore this email — your password has not been changed.',
        buttonText: 'Reset My Password',
        buttonUrl: 'https://hostkeepdigital.co.uk/ResetPassword',
      }),
    });

    // Step 3 — Return success
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});