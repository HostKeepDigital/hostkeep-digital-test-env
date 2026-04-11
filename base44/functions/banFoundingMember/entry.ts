import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const CORNWALL_PREFIXES = ["TR", "PL", "EX"];

function getPostcodePrefix(postcode) {
  if (!postcode) return null;
  return postcode.trim().toUpperCase().replace(/\s+/g, "").match(/^[A-Z]+/)?.[0] || null;
}

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sendBanNotificationEmail(to, fullName) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "HostKeep <hello@hostkeepdigital.co.uk>",
        to,
        subject: "Your HostKeep account has been suspended",
        html: `
          <!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif;">
          <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
            <div style="background:#1E3A5F;padding:24px 32px;"><h1 style="color:#fff;font-size:20px;margin:0;">HostKeep</h1></div>
            <div style="padding:32px;">
              <h2 style="color:#111827;font-size:22px;margin:0 0 16px;">Account Suspended</h2>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 12px;">Hi ${fullName || "there"},</p>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Your HostKeep founding member account has been suspended. If you believe this is an error, please contact us.
              </p>
              <a href="mailto:hello@hostkeepdigital.co.uk" style="display:inline-block;background:#1E3A5F;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Contact Support</a>
            </div>
            <div style="background:#f3f4f6;padding:16px 32px;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">HostKeep · <a href="mailto:hello@hostkeepdigital.co.uk" style="color:#9ca3af;">hello@hostkeepdigital.co.uk</a></p>
            </div>
          </div></body></html>
        `,
      }),
    });
  } catch (_) {}
}

async function sendInvitationEmail(to, inviteUrl, fullName) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "HostKeep <hello@hostkeepdigital.co.uk>",
        to,
        subject: "Great news — Your HostKeep founding spot is ready!",
        html: `
          <!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif;">
          <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
            <div style="background:#1E3A5F;padding:24px 32px;"><h1 style="color:#fff;font-size:20px;margin:0;">HostKeep</h1></div>
            <div style="padding:32px;">
              <h2 style="color:#111827;font-size:22px;margin:0 0 16px;">A founding spot just opened up for you! 🎉</h2>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 12px;">Hi ${fullName || "there"},</p>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
                You were on our waitlist and a founding member spot has just become available in your area. 
                Click below to complete your onboarding and lock in your founding rate of £19/month — for life.
              </p>
              <a href="${inviteUrl}" style="display:inline-block;background:#0d9488;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Claim My Founding Spot</a>
              <p style="color:#6b7280;font-size:13px;margin-top:24px;">This link expires in 24 hours.</p>
            </div>
            <div style="background:#f3f4f6;padding:16px 32px;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">HostKeep · <a href="mailto:hello@hostkeepdigital.co.uk" style="color:#9ca3af;">hello@hostkeepdigital.co.uk</a></p>
            </div>
          </div></body></html>
        `,
      }),
    });
  } catch (_) {}
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // Admin-only
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { member_id, ban_reason } = await req.json();
    if (!member_id) return Response.json({ error: 'missing_member_id' }, { status: 400 });

    // 1) Load the member being banned
    const member = await base44.asServiceRole.entities.FoundingMember.get(member_id);
    if (!member) return Response.json({ error: 'member_not_found' }, { status: 404 });

    // 2) Mark as banned
    await base44.asServiceRole.entities.FoundingMember.update(member_id, {
      approval_status: 'banned',
      ban_reason: ban_reason || null,
    });

    // 3) Strip founding member access if they have a user account
    if (member.user_id) {
      // Cancel their beta subscription
      const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: member.user_id });
      for (const sub of subs) {
        if (sub.is_founding_member || sub.plan === 'beta_host_access' || sub.plan === 'beta_cleaner_access') {
          await base44.asServiceRole.entities.Subscription.update(sub.id, {
            status: 'cancelled',
            is_founding_member: false,
          });
        }
      }

      // Remove their host/cleaner role
      const roles = await base44.asServiceRole.entities.UserRole.filter({ user_id: member.user_id });
      for (const r of roles) {
        if (r.role === member.role) {
          await base44.asServiceRole.entities.UserRole.delete(r.id);
        }
      }

      // Update User entity
      await base44.asServiceRole.entities.User.update(member.user_id, {
        is_founding_member: false,
      });

      // Send ban notification
      await sendBanNotificationEmail(member.email, member.full_name);
    }

    // 4) Auto-promote next eligible waitlisted member in the same area
    const bannedPrefix = getPostcodePrefix(member.postcode);
    let promoted = null;

    if (bannedPrefix && CORNWALL_PREFIXES.includes(bannedPrefix)) {
      // Find all pending members with same role, ordered by signup date (oldest first)
      const waitlist = await base44.asServiceRole.entities.FoundingMember.filter({
        approval_status: 'pending',
        role: member.role,
      });

      // Filter to same postcode area, sort by signup_timestamp ascending
      const sameArea = waitlist
        .filter(m => getPostcodePrefix(m.postcode) === bannedPrefix)
        .sort((a, b) => new Date(a.signup_timestamp || 0) - new Date(b.signup_timestamp || 0));

      const next = sameArea[0];

      if (next) {
        // Check if user already exists
        let nextUser;
        const existingUsers = await base44.asServiceRole.entities.User.filter({ email: next.email.toLowerCase().trim() });
        if (existingUsers?.[0]) {
          nextUser = existingUsers[0];
        } else {
          nextUser = await base44.asServiceRole.entities.User.create({
            email: next.email.toLowerCase().trim(),
            full_name: next.full_name || next.email,
            password: generateToken(),
          });
        }

        // Generate onboarding token
        const token = generateToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await base44.asServiceRole.entities.OnboardingPasswordToken.create({
          user_id: nextUser.id,
          token,
          expires_at: expiresAt,
          used: false,
        });

        // Mark as invited
        await base44.asServiceRole.entities.FoundingMember.update(next.id, {
          approval_status: 'invited',
          user_id: nextUser.id,
        });

        // Send invitation email
        const inviteUrl = `https://hostkeepdigital.co.uk/CreatePassword?token=${token}`;
        await sendInvitationEmail(next.email.toLowerCase().trim(), inviteUrl, next.full_name);

        promoted = { id: next.id, email: next.email, full_name: next.full_name };
      }
    }

    return Response.json({
      success: true,
      banned: { id: member_id, email: member.email },
      promoted,
    });

  } catch (err) {
    console.error('banFoundingMember error:', err);
    return Response.json({ error: 'server_error', detail: err.message }, { status: 500 });
  }
});