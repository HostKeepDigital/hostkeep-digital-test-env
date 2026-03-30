import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const LOGO_URL = "https://i.ibb.co/6cwz6PzN/Host-Keep-Digital-Navy-Background.png";
const FB_ICON = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/600px-Facebook_Logo_%282019%29.png";
const IG_ICON = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png";

// ── FOUNDING MEMBER RULES ─────────────────────────────────────────────────────
const CORNWALL_POSTCODES   = ["TR", "PL", "EX"];
const HOST_FOUNDING_CAP    = 50;
const CLEANER_FOUNDING_CAP = 30;

// Statuses that mean the slot is still occupied — count these toward the cap
const NON_ACTIVE_STATUSES = [
  "banned_email_verification",
  "banned_documentation_failure",
  "banned_fraud",
  "banned_manual_admin_action",
  "rejected",
  "rejected_pending_application",
  "out_of_area",
];

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendInvitationEmail(
  to,
  fullName,
  roleLabel,
  inviteUrl,
  isFoundingMember,
) {
  if (!RESEND_API_KEY) return;

  const founderLine = isFoundingMember
    ? `<p style="margin-top:16px;padding:12px 16px;background-color:#f0fdfa;border-left:4px solid #0d9488;border-radius:4px;font-size:14px;color:#0f766e;">
        <strong>🎉 You're a Founding ${roleLabel}!</strong> You've secured one of our limited founding spots and will receive your exclusive founding member benefits when you upgrade to a paid plan.
      </p>`
    : "";

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
        subject: "You're approved — Welcome to HostKeep",
        html: `<!DOCTYPE html>
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
          <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:bold;color:#111827;">You're approved!</h1>
          <div style="font-size:15px;line-height:1.7;color:#374151;">
            <p>Hi ${fullName || "there"},</p>
            <p>Your application to become a Founding ${roleLabel} on HostKeep has been approved.</p>
            ${founderLine}
            <p>Click the button below to create your password and activate your account.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
              <tr><td align="center">
                <a href="${inviteUrl}" style="display:inline-block;background-color:#0d9488;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;">
                  Create Your Password
                </a>
              </td></tr>
            </table>
            <p style="margin-top:24px;">This link is unique to you and expires in 24 hours.</p>
            <p>Once your password is set, you can begin setting up your ${roleLabel === "Host" ? "first property." : "cleaner profile."}</p>
          </div>
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
</html>`,
      }),
    });
  } catch (_) {}
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { member_id } = await req.json();

    if (!member_id) {
      return Response.json({ success: false, error: "missing_member_id" }, { status: 400 });
    }

    const member = await base44.asServiceRole.entities.FoundingMember.get(member_id);
    if (!member) {
      return Response.json({ success: false, error: "member_not_found" }, { status: 404 });
    }

    const email = member.email.toLowerCase().trim();

    // Ensure User entity exists so setOnboardingPassword can find it
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (!existingUsers?.[0]) {
      await base44.asServiceRole.entities.User.create({
        email,
        full_name: member.full_name || email,
        password: generateToken(),
      });
    }

    // ── FOUNDING MEMBER CHECK ─────────────────────────────────────────────
    // The badge belongs to the SLOT not the person.
    // Count active Cornwall/Devon members of same role — excludes banned/rejected.
    // If a slot was freed by a ban, this count will be below the cap,
    // so the waitlist user filling that slot correctly gets founding status.

    const postcode = (member.postcode || "").trim().toUpperCase();
    const isCornwall = CORNWALL_POSTCODES.some(p => postcode.startsWith(p));

    let isFoundingMember = false;

    if (isCornwall) {
      const cap = member.role === "host" ? HOST_FOUNDING_CAP : CLEANER_FOUNDING_CAP;

      // Get all members of same role
      const allSameRole = await base44.asServiceRole.entities.FoundingMember.filter({
        role: member.role,
      });

      // Count only Cornwall/Devon members who are actively occupying a slot
      const activeCount = (allSameRole || []).filter(m => {
        const pc = (m.postcode || "").trim().toUpperCase();
        const isInArea = CORNWALL_POSTCODES.some(p => pc.startsWith(p));
        const isActive = !NON_ACTIVE_STATUSES.includes(m.approval_status);
        return isInArea && isActive;
      }).length;

      // Current member being approved is not yet counted — check if adding them stays within cap
      if (activeCount < cap) {
        isFoundingMember = true;
      }
    }

    // ── GENERATE TOKEN & UPDATE ───────────────────────────────────────────
    const token = generateToken();
    const inviteUrl = `https://hostkeepdigital.co.uk/CreatePassword?token=${token}`;

    await base44.asServiceRole.entities.FoundingMember.update(member_id, {
      approval_status: "invited",
      onboarding_token: token,
      onboarding_expires_at: new Date(Date.now() + 86400000).toISOString(),
      is_founding_member: isFoundingMember,
    });

    const roleLabel = member.role === "host" ? "Host" : "Cleaner";
    await sendInvitationEmail(email, member.full_name, roleLabel, inviteUrl, isFoundingMember);

    return Response.json({ success: true, is_founding_member: isFoundingMember });

  } catch (err) {
    console.error("promoteUserToInvited error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});