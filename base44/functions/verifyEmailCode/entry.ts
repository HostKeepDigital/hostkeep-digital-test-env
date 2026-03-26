import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const LOGO_URL = 'https://i.ibb.co/6cwz6PzN/Host-Keep-Digital-Navy-Background.png';
const FB_ICON = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/600px-Facebook_Logo_%282019%29.png';
const IG_ICON = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png';

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
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
      <tr>
        <td style="background-color:#1E3A5F;padding:32px 40px;text-align:center;">
          <img src="${LOGO_URL}" alt="HostKeep Digital" width="200" style="display:block;margin:0 auto;max-width:200px;height:auto;" />
        </td>
      </tr>
      <tr>
        <td style="padding:40px 40px 32px 40px;">
          <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:bold;color:#111827;">${heading}</h1>
          <div style="font-size:15px;line-height:1.7;color:#374151;">${body}</div>
          ${buttonBlock}
        </td>
      </tr>
      <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td></tr>
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
</html>`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { email, code } = await req.json();

  if (!email || !code) {
    return Response.json({ valid: false });
  }

  const records = await base44.asServiceRole.entities.EmailVerificationCode.filter({ email });

  if (!records || records.length === 0) {
    return Response.json({ valid: false });
  }

  const record = records[0];

  if (record.code !== code) {
    return Response.json({ valid: false });
  }

  if (new Date(record.expires_at) < new Date()) {
    return Response.json({ valid: false });
  }

  // Delete the used code
  await base44.asServiceRole.entities.EmailVerificationCode.delete(record.id);

  // Send branded thank-you email
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HostKeep <hello@hostkeepdigital.co.uk>",
        to: [email],
        subject: "You're on the list — HostKeep",
        html: buildEmail({
          heading: "You're on the list!",
          body: `
            <p>Thank you for verifying your email and registering your interest as a Founding Member of HostKeep.</p>
            <p>We're reviewing applications and will be in touch within 24 hours to let you know if you've made it into the beta.</p>
            <p>You don't need to do anything right now — we'll contact you at this email address.</p>
          `,
        }),
      }),
    });
  } catch (err) {
    console.error("Thank-you email failed:", err);
  }

  return Response.json({ valid: true });
});