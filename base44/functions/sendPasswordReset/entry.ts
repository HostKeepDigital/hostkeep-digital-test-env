import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { buildEmail } from '../src/lib/emailTemplate.js';

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