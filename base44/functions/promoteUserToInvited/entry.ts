import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// ------------------------------------------------------
// Helper: Send onboarding email via Resend
// ------------------------------------------------------
async function sendInvitationEmail(to, inviteUrl, fullName) {
  if (!RESEND_API_KEY) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HostKeep <hello@hostkeepdigital.co.uk>",
        to,
        subject: "You're invited — Complete your HostKeep onboarding",
        html: `
          <!DOCTYPE html>
          <html>
          <body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif;">
            <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
              <div style="background:#1E3A5F;padding:24px 32px;">
                <h1 style="color:#ffffff;font-size:20px;margin:0;">HostKeep</h1>
              </div>
              <div style="padding:32px;">
                <h2 style="color:#111827;font-size:22px;margin:0 0 16px;">Welcome to HostKeep 🎉</h2>
                <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 12px;">
                  Hi ${fullName || "there"},
                </p>
                <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  You've been approved and invited to complete your onboarding.
                  Click the button below to set your password and get started.
                </p>
                <a href="${inviteUrl}"
                   style="display:inline-block;background:#0d9488;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                  Complete Onboarding
                </a>
                <p style="color:#6b7280;font-size:13px;margin-top:24px;">
                  This link expires in 24 hours. If you didn't expect this email, you can ignore it.
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
      }),
    });
  } catch (_) {
    // Non-fatal — onboarding still continues
  }
}

// ------------------------------------------------------
// Helper: Generate secure token
// ------------------------------------------------------
function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ------------------------------------------------------
// MAIN FUNCTION — Approve user + send onboarding invite
// ------------------------------------------------------
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const { member_id } = await req.json();

    if (!member_id) {
      return Response.json(
        { success: false, error: "missing_member_id" },
        { status: 400 }
      );
    }

    // 1) Load FoundingMember
    const member = await base44.asServiceRole.entities.FoundingMember.get(member_id);
    if (!member) {
      return Response.json(
        { success: false, error: "member_not_found" },
        { status: 404 }
      );
    }

    const email = member.email.toLowerCase().trim();

    // 2) Ensure User exists (create if needed)
    let user;
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers?.[0]) {
      user = existingUsers[0];
    } else {
      user = await base44.asServiceRole.entities.User.create({
        email,
        full_name: member.full_name || email,
        password: generateToken(), // temporary, never used
      });
    }

    // 3) Create onboarding password token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.OnboardingPasswordToken.create({
      user_id: user.id,
      token,
      expires_at: expiresAt,
      used: false,
    });

    // 4) Update FoundingMember → invited
    await base44.asServiceRole.entities.FoundingMember.update(member_id, {
      approval_status: "invited",
      user_id: user.id,
    });

    // 5) Send onboarding email
    const inviteUrl = `https://hostkeepdigital.co.uk/CreatePassword?token=${token}`;
    await sendInvitationEmail(email, inviteUrl, member.full_name);

    return Response.json({ success: true });
  } catch (err) {
    console.error("promoteUserToInvited error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});