import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "HostKeep <hello@hostkeepdigital.co.uk>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return res.json();
}

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateTempPassword() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    let member_id;
    if (req.method === "GET") {
      const url = new URL(req.url);
      member_id = url.searchParams.get("member_id");
    } else {
      const body = await req.json();
      member_id = body.member_id;
    }

    if (!member_id) {
      return Response.json({ error: "Missing member_id" }, { status: 400 });
    }

    // Fetch the FoundingMember record
    const member = await base44.asServiceRole.entities.FoundingMember.get(member_id);
    if (!member) {
      return Response.json({ error: "FoundingMember not found" }, { status: 404 });
    }

    const normalisedEmail = member.email.toLowerCase().trim();

    // Check if a User already exists for this email
    let user;
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalisedEmail });
    if (existingUsers?.[0]) {
      user = existingUsers[0];
    } else {
      // Create the User account immediately with a temporary random password
      const tempPassword = generateTempPassword();
      user = await base44.asServiceRole.entities.User.create({
        email: normalisedEmail,
        full_name: member.full_name || normalisedEmail,
        password: tempPassword,
      });
    }

    // Set FoundingMember to 'invited'
    await base44.asServiceRole.entities.FoundingMember.update(member_id, {
      approval_status: "invited",
    });

    // Generate a password reset token so they can set their own password
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Invalidate any existing tokens for this user
    const existingTokens = await base44.asServiceRole.entities.PasswordResetToken.filter({ user_id: user.id, used: false });
    for (const t of existingTokens) {
      await base44.asServiceRole.entities.PasswordResetToken.update(t.id, { used: true });
    }

    await base44.asServiceRole.entities.PasswordResetToken.create({
      user_id: user.id,
      email: normalisedEmail,
      token,
      expires_at: expiresAt,
      used: false,
    });

    const setPasswordUrl = `https://hostkeepdigital.co.uk/ResetPassword?token=${token}`;

    await sendEmail({
      to: normalisedEmail,
      subject: "You're approved — Set your HostKeep password",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif;">
          <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
            <div style="background:#1E3A5F;padding:24px 32px;">
              <h1 style="color:#ffffff;font-size:20px;margin:0;">HostKeep</h1>
            </div>
            <div style="padding:32px;">
              <h2 style="color:#111827;font-size:22px;margin:0 0 16px;">You're approved! 🎉</h2>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 12px;">
                Hi ${member.full_name || "there"},
              </p>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Your HostKeep application has been reviewed and approved. Your account has been created — click the button below to set your password and get started.
              </p>
              <a href="${setPasswordUrl}"
                 style="display:inline-block;background:#0d9488;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                Set Your Password
              </a>
              <p style="color:#6b7280;font-size:13px;margin-top:24px;">
                This link expires in 24 hours. If you didn't expect this email, you can ignore it.
              </p>
              <p style="color:#6b7280;font-size:13px;margin-top:8px;">
                Welcome to HostKeep — we're excited to have you onboard!
              </p>
            </div>
            <div style="background:#f3f4f6;padding:16px 32px;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                HostKeep · <a href="mailto:hello@hostkeepdigital.co.uk" style="color:#9ca3af;">hello@hostkeepdigital.co.uk</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return Response.json({ success: true, message: "Member approved, account created, and email sent." });
  } catch (err) {
    console.error("approveUser error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
});