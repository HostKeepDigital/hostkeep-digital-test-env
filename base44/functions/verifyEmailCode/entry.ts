import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const LOGO_URL = 'https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/HostKeep_Digital_Navy_Background.png';
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
  const { email, code, type } = await req.json();

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

  // Mark email as verified in UserCredentials if they exist
  try {
    const credentials = await base44.asServiceRole.entities.UserCredentials.filter({ email });
    if (credentials && credentials.length > 0) {
      await base44.asServiceRole.entities.UserCredentials.update(credentials[0].id, { email_verified: true });
    }
  } catch (err) {
    console.error("Failed to update email_verified on UserCredentials:", err);
  }

  // Advance FoundingMember from interest → pending and set email_verified: true
  // This must happen in the backend — not the frontend
  try {
    const members = await base44.asServiceRole.entities.FoundingMember.filter({ email: email.toLowerCase().trim() });
    if (members && members.length > 0) {
      const member = members[0];
      if (member.approval_status === "interest") {
        await base44.asServiceRole.entities.FoundingMember.update(member.id, {
          approval_status: "pending",
          email_verified: true,
        });
      } else {
        // Already past interest — just mark email verified
        await base44.asServiceRole.entities.FoundingMember.update(member.id, {
          email_verified: true,
        });
      }
    }
  } catch (err) {
    console.error("Failed to update FoundingMember after verification:", err);
  }

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
        subject: type === "guest" ? "Welcome to HostKeep!" : "You're on the list — HostKeep",
        html: buildEmail({
          heading: type === "guest" ? "Email verified!" : "You're on the list!",
          body: type === "guest" ? `
            <p>Your email address has been verified and your HostKeep account is ready.</p>
            <p>You can now sign in and start browsing our hand-picked Cornwall properties.</p>
          ` : `
            <p>Thank you for verifying your email and registering your interest as a Founding Member of HostKeep.</p>
            <p>We're reviewing applications and will be in touch within 24 hours to let you know if you've made it into the beta.</p>
            <p>You don't need to do anything right now — we'll contact you at this email address.</p>
          `,
          buttonText: type === "guest" ? "Browse Properties" : null,
          buttonUrl: type === "guest" ? "https://hostkeep-digital-test-env.base44.app" : null,
        }),
      }),
    });
  } catch (err) {
    console.error("Thank-you email failed:", err);
  }

  return Response.json({ valid: true });
});