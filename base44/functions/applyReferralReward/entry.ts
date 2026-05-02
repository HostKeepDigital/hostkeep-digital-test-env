import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@16.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

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
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>HostKeep</title></head><body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;"><tr><td style="background-color:#1E3A5F;padding:32px 40px;text-align:center;"><img src="https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/HostKeep_Digital_Navy_Background.png" alt="HostKeep Digital" width="200" style="display:block;margin:0 auto;max-width:200px;height:auto;"/></td></tr><tr><td style="padding:40px 40px 32px 40px;"><h1 style="margin:0 0 16px 0;font-size:22px;font-weight:bold;color:#111827;">${heading}</h1><div style="font-size:15px;line-height:1.7;color:#374151;">${body}</div>${buttonBlock}</td></tr><tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td></tr><tr><td style="padding:28px 40px;text-align:center;"><p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">© 2026 HostKeep Digital Ltd</p><p style="margin:0;font-size:13px;color:#6b7280;"><a href="mailto:hello@hostkeepdigital.co.uk" style="color:#0d9488;text-decoration:none;">hello@hostkeepdigital.co.uk</a></p></td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const { referee_user_id, referee_email, referee_name } = await req.json();

    // Find the referral record for this referee
    const refs = await sr.entities.Referral.filter({ referee_email: referee_email?.toLowerCase().trim() });
    const referral = refs.find(r => r.status === "pending" && r.ref_code);
    if (!referral) return Response.json({ success: false, error: "no pending referral found" });

    // Update referral record
    await sr.entities.Referral.update(referral.id, {
      referee_user_id,
      referee_name: referee_name || referee_email,
      status: "subscription_activated",
    });

    // Apply 1 month free credit to the referring host's Stripe subscription
    const referrerSubs = await sr.entities.Subscription.filter({ user_id: referral.referrer_user_id });
    const referrerSub = referrerSubs.find(s => s.status === "active" && s.stripe_subscription_id);

    if (referrerSub?.stripe_subscription_id) {
      // Add a one-month invoice credit to the referrer's Stripe customer
      const referrerSubObj = await stripe.subscriptions.retrieve(referrerSub.stripe_subscription_id);
      const monthlyAmount = referrerSub.price_monthly ? Math.round(referrerSub.price_monthly * 100) : 0;

      if (monthlyAmount > 0) {
        await stripe.customerBalanceTransactions.create(referrerSubObj.customer, {
          amount: -monthlyAmount,
          currency: "gbp",
          description: `Referral reward — ${referee_name || referee_email} signed up using your link`,
        });
      }

      await sr.entities.Referral.update(referral.id, {
        status: "reward_applied",
        reward_applied_at: new Date().toISOString().split("T")[0],
      });

      // Email the referee confirming their free month
      await base44.functions.invoke("sendEmail", {
        to: referee_email,
        subject: "Your referral reward is ready — HostKeep",
        html: buildEmail({
          heading: "Your free month is confirmed ✓",
          body: `Great news — your referral reward has been applied to your HostKeep account.<br><br>Your <strong>second month is completely free</strong>. You won't be charged until month three, at which point your normal subscription rate resumes automatically.<br><br>No action needed — Stripe will handle this automatically on your next billing date.<br><br>If you have any questions, just drop us a message at <a href="mailto:hello@hostkeepdigital.co.uk" style="color:#0d9488;">hello@hostkeepdigital.co.uk</a>.`,
          buttonText: "Go to My Dashboard",
          buttonUrl: "https://hostkeepdigital.co.uk/HostDashboard",
        }),
      });

      // Email the referrer confirming their reward
      if (referral.referrer_email) {
        await base44.functions.invoke("sendEmail", {
          to: referral.referrer_email,
          subject: "Your referral reward has been applied — HostKeep",
          html: buildEmail({
            heading: "Referral reward applied ✓",
            body: `${referral.referee_name || "Someone you referred"} has activated their HostKeep subscription using your referral link.<br><br>As a thank you, <strong>one month has been added free to your subscription</strong>. This credit will be applied automatically against your next billing date — you won't see a separate charge.<br><br>Keep sharing your referral link — there's no limit to how many hosts you can refer!`,
            buttonText: "See your referrals",
            buttonUrl: "https://hostkeepdigital.co.uk/HostDashboard",
          }),
        });
      }
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error("applyReferralReward error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});