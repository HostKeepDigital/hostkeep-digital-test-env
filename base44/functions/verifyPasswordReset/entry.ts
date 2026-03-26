import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function sendConfirmationEmail(to) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'HostKeep <hello@hostkeepdigital.co.uk>',
      to,
      subject: 'Your HostKeep password has been updated',
      html: '<html><body style="font-family:Arial,sans-serif;background:#f4f4f5;padding:40px 20px;"><table width="100%"><tr><td align="center"><table width="600" style="background:#fff;border-radius:12px;overflow:hidden;"><tr><td style="background:#0d9488;padding:32px 40px;text-align:center;"><span style="color:#fff;font-size:24px;font-weight:bold;">HostKeep</span></td></tr><tr><td style="padding:40px;"><h1 style="color:#111827;font-size:22px;">Your password has been updated</h1><p style="color:#374151;font-size:15px;line-height:1.7;">Your HostKeep password has been successfully changed. You can now sign in with your new password.<br><br>If you did not make this change, please contact us immediately at <a href="mailto:hello@hostkeepdigital.co.uk">hello@hostkeepdigital.co.uk</a></p><p style="text-align:center;"><a href="https://hostkeepdigital.co.uk/SignIn" style="display:inline-block;background:#0d9488;color:#fff;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;">Sign In</a></p></td></tr></table></td></tr></table></body></html>',
    }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { token, newPassword } = await req.json();

  if (!token || !newPassword) {
    return Response.json({ success: false, error: 'invalid_token' });
  }

  // Step 1 - Find the token record
  const records = await base44.asServiceRole.entities.PasswordResetToken.filter({ token, used: false });
  const record = records?.[0];

  if (!record) {
    return Response.json({ success: false, error: 'invalid_token' });
  }

  // Step 2 - Check expiry
  if (new Date() > new Date(record.expires_at)) {
    await base44.asServiceRole.entities.PasswordResetToken.delete(record.id);
    return Response.json({ success: false, error: 'expired_token' });
  }

  // Step 3 - Update the user's password (same pattern as createonboardingpassword)
  try {
    await base44.asServiceRole.entities.User.update(record.user_id, { password: newPassword });
  } catch (e) {
    console.error('Password update error:', e.message);
    return Response.json({ success: false, error: 'update_failed' });
  }

  // Step 4 - Delete the used token
  await base44.asServiceRole.entities.PasswordResetToken.delete(record.id);

  // Step 5 - Send confirmation email (non-fatal)
  try {
    await sendConfirmationEmail(record.email);
  } catch (_) {}

  return Response.json({ success: true });
});