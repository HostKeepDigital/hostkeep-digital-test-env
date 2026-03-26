import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function sendBrandedEmail({ to, resetUrl }) {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
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

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'HostKeep <hello@hostkeepdigital.co.uk>',
      to,
      subject: 'Reset your HostKeep password',
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { email } = await req.json();

  if (!email) {
    return Response.json({ success: true });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Use Base44's platform reset - generates a real auth token
  let platformToken;
  try {
    const result = await base44.auth.resetPasswordRequest(normalizedEmail);
    console.log('Platform reset result:', JSON.stringify(result));
    platformToken = result?.token || result?.reset_token || result?.resetToken;
  } catch (e) {
    console.error('Reset request error:', e.message);
    return Response.json({ success: true });
  }

  console.log('Platform token received:', platformToken ? 'yes' : 'no');

  if (platformToken) {
    const resetUrl = `https://hostkeepdigital.co.uk/ResetPassword?token=${platformToken}`;
    try {
      await sendBrandedEmail({ to: normalizedEmail, resetUrl });
    } catch (e) {
      console.error('Email send error:', e.message);
    }
  }

  return Response.json({ success: true });
});