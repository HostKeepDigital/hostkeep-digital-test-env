import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const LOGO_URL = 'https://drive.google.com/uc?export=view&id=1yazuu-6sWc7hEOpyTncZpt-P9Cd-UOt1';
const FB_ICON = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/600px-Facebook_Logo_%282019%29.png';
const IG_ICON = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png';

function buildHtmlEmail(heading, bodyHtml) {
  return `<!DOCTYPE html>
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
          <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:bold;color:#111827;">${heading}</h1>
          <div style="font-size:15px;line-height:1.7;color:#374151;">${bodyHtml}</div>
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
</html>`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { full_name, email, postcode, role } = await req.json();

  if (!full_name || !email || !postcode || !role) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const outOfArea = !['TR','PL','EX'].some(p =>
    postcode.trim().toUpperCase().replace(/\s+/g,'').startsWith(p)
  );

  // Check for duplicate email
  const existing = await base44.asServiceRole.entities.FoundingMember.filter({
    email: email.toLowerCase().trim()
  });
  if (existing && existing.length > 0) {
    return Response.json({ error: 'duplicate_email' });
  }

  // Create FoundingMember record
  await base44.asServiceRole.entities.FoundingMember.create({
    full_name: full_name.trim(),
    email: email.toLowerCase().trim(),
    postcode: postcode.toUpperCase().trim(),
    role,
    approval_status: outOfArea ? 'out_of_area' : 'pending',
    signup_timestamp: new Date().toISOString(),
  });

  const roleLabel = role === 'host' ? 'Host' : 'Cleaner';

if (!outOfArea) {
  // Applicant confirmation email
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_email: "hello@hostkeepdigital.co.uk",
      from_name: "HostKeep",
      to: email.toLowerCase().trim(),
      subject: "You're on the list — HostKeep",
      body: buildHtmlEmail(
        "You're on the list!",
        `<p>Hi ${full_name.trim()},</p>
         <p>Thank you for applying to become a Founding ${roleLabel} on HostKeep. We're reviewing your application and will be in touch within 24 hours to let you know if you've made it into the beta.</p>
         <p>You don't need to do anything right now.</p>`
      ),
    });
  } catch (err) {
    console.error("USER EMAIL FAILED:", err);
}


    // Admin notification email
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'HostKeep',
        to: 'admin@hostkeepdigital.co.uk',
        subject: `New Founding Member Application — ${full_name.trim()} (${roleLabel})`,
        body: buildHtmlEmail(
        'New Founding Member Application',
          `<p>A new founding member application has been submitted.</p>
           <p><strong>Name:</strong> ${full_name.trim()}<br>
           <strong>Email:</strong> ${email}<br>
           <strong>Postcode:</strong> ${postcode}<br>
           <strong>Role:</strong> ${roleLabel}</p>
           <p><a href="https://hostkeepdigital.co.uk/AdminPanel" style="display:inline-block;background-color:#1E3A5F;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;">Review in Admin Panel</a></p>`
        ),
      });
    } catch (_) {}
  }

  return Response.json({ success: true, out_of_area: outOfArea });
});