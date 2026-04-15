import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Helper: Send approval email
async function sendApprovalEmail(to: string, fullName: string) {
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
        subject: "You're fully approved — your property can now be published",
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
                  Congratulations! You've completed all verification requirements. Your property can now be published to guests.
                </p>
                <a href="https://hostkeepdigital.co.uk/HostDashboard"
                   style="display:inline-block;background:#0d9488;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                  Go to Dashboard
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
      return Response.json(
        { success: false, error: "missing_user_id" },
        { status: 400 }
      );
    }

    // 1) Load User
    const user = await base44.asServiceRole.entities.User.get(user_id);
    if (!user) {
      return Response.json(
        { success: false, error: "user_not_found" },
        { status: 404 }
      );
    }

    // 2) Load FoundingMember
    const members = await base44.asServiceRole.entities.FoundingMember.filter({
      user_id,
    });
    const member = members?.[0];

    if (!member) {
      return Response.json({ success: false, reason: "no_member" });
    }

    // 3) Check if already approved
    if (member.approval_status === "approved") {
      return Response.json({ success: true, already_approved: true });
    }

    // 4) Read gates
    const documents_verified = user.documents_verified || false;
    const stripe_verified = user.stripe_verified || false;
    const subscription_active = user.subscription_active || false;

    // 5) If all gates passed
    if (documents_verified && stripe_verified && subscription_active) {
      // Update FoundingMember
      await base44.asServiceRole.entities.FoundingMember.update(member.id, {
        approval_status: "approved",
      });

      // Find and update UserRole
      const roles = await base44.asServiceRole.entities.UserRole.filter({
        user_id,
        role: member.role,
      });
      if (roles?.[0]) {
        await base44.asServiceRole.entities.UserRole.update(roles[0].id, {
          approval_status: "approved",
        });
      }

      // Send approval email
      await sendApprovalEmail(user.email, user.full_name);

      return Response.json({ success: true, approved: true });
    }

    // 6) Return gate status
    return Response.json({
      success: true,
      approved: false,
      gates: {
        documents: documents_verified,
        stripe: stripe_verified,
        subscription: subscription_active,
      },
    });
  } catch (err) {
    console.error("checkApprovalGates error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});