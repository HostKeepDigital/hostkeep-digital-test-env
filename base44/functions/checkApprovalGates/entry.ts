import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendFullyApprovedEmail(to, fullName) {
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
        subject: "You're fully approved on HostKeep 🎉",
        html: `
          <!DOCTYPE html>
          <html>
          <body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif;">
            <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
              <div style="background:#1E3A5F;padding:24px 32px;">
                <h1 style="color:#ffffff;font-size:20px;margin:0;">HostKeep</h1>
              </div>
              <div style="padding:32px;">
                <h2 style="color:#111827;font-size:22px;margin:0 0 16px;">You're fully approved! 🎉</h2>
                <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 12px;">
                  Hi ${fullName || "there"},
                </p>
                <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  All your verification steps are complete. Your property can now be published on HostKeep and you can start accepting bookings.
                </p>
                <a href="https://hostkeepdigital.co.uk/HostDashboard"
                   style="display:inline-block;background:#0d9488;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                  Go to your Dashboard
                </a>
                <p style="color:#6b7280;font-size:13px;margin-top:24px;">
                  If you have any questions, contact us at hello@hostkeepdigital.co.uk
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
    // Non-fatal
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return Response.json({ success: false, reason: "missing_user_id" }, { status: 400 });
    }

    // Load FoundingMember by user_id
    const members = await base44.asServiceRole.entities.FoundingMember.filter({ user_id });
    const member = members?.[0];

    if (!member) {
      return Response.json({ success: false, reason: "no_member" });
    }

    // Already fully approved — nothing to do
    if (member.approval_status === "approved") {
      return Response.json({ success: true, already_approved: true });
    }

    const userRecords = await base44.asServiceRole.entities.User.filter({ id: user_id });
    const user = userRecords?.[0];

    const gates = {
      documents: !!user?.documents_verified,
      stripe: !!user?.stripe_verified,
      subscription: !!user?.subscription_active,
    };

    // Not all gates passed
    if (!gates.documents || !gates.stripe || !gates.subscription) {
      return Response.json({ success: true, approved: false, gates });
    }

    // All gates passed — approve
    await base44.asServiceRole.entities.FoundingMember.update(member.id, {
      approval_status: "approved",
    });

    // Update the matching UserRole to approved
    const userRoles = await base44.asServiceRole.entities.UserRole.filter({
      user_id,
      role: member.role,
    });
    if (userRoles?.[0]) {
      await base44.asServiceRole.entities.UserRole.update(userRoles[0].id, {
        approval_status: "approved",
      });
    }

    // Send fully approved email
    await sendFullyApprovedEmail(member.email, member.full_name);

    return Response.json({ success: true, approved: true });
  } catch (err) {
    console.error("checkApprovalGates error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});