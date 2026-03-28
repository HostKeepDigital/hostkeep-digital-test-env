import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// ------------------------------
// Helper: Send invitation email
// ------------------------------
async function sendInvitationEmail(to, inviteUrl) {
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
        subject: "You're invited to HostKeep",
        html: `
          <h2>Welcome to HostKeep</h2>
          <p>You've been invited to complete your onboarding.</p>
          <p><a href="${inviteUrl}">Click here to begin</a></p>
        `,
      }),
    });
  } catch (_) {
    // Non-fatal — onboarding still continues
  }
}

// ------------------------------
// Helper: Generate secure token
// ------------------------------
function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ------------------------------
// MAIN FUNCTION
// ------------------------------
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return Response.json(
        { success: false, error: "missing_user_id" },
        { status: 400 }
      );
    }

    // 1) Load user
    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    const user = users?.[0];

    if (!user) {
      return Response.json(
        { success: false, error: "user_not_found" },
        { status: 404 }
      );
    }

    // 2) Prevent banned users from being invited
    if (user.status && user.status.startsWith("banned")) {
      return Response.json(
        { success: false, error: "user_banned" },
        { status: 400 }
      );
    }

    // 3) Prevent duplicate invitations
    if (user.approval_status === "invited") {
      return Response.json(
        { success: false, error: "already_invited" },
        { status: 400 }
      );
    }

    // 4) Create email verification token
    const emailToken = generateToken();
    const emailExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.EmailVerificationToken.create({
      user_id,
      email: user.email,
      token: emailToken,
      expires_at: emailExpires,
      used: false,
    });

    // 5) Create onboarding password token
    const passwordToken = generateToken();
    const passwordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.OnboardingPasswordToken.create({
      user_id,
      token: passwordToken,
      expires_at: passwordExpires,
      used: false,
    });

    // 6) Update user → invited
    await base44.asServiceRole.entities.User.update(user_id, {
      approval_status: "invited",
    });

    // 7) Send invitation email
    const inviteUrl = `https://hostkeepdigital.co.uk/Onboarding?token=${passwordToken}`;
    await sendInvitationEmail(user.email, inviteUrl);

    return Response.json({ success: true });
  } catch (err) {
    console.error("promoteUserToInvited error", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});