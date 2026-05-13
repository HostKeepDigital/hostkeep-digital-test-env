import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function sendEmail({ to, subject, html }) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'HostKeep Digital <hello@hostkeepdigital.co.uk>', to, subject, html }),
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const { ref_code, referee_email, referee_name } = await req.json();

    if (!ref_code || !referee_email) {
      return Response.json({ success: false, error: "ref_code and referee_email required" }, { status: 400 });
    }

    const normCode = ref_code.trim().toUpperCase();
    const normEmail = referee_email.toLowerCase().trim();

    // Find the seed referral record for this code
    const refs = await sr.entities.Referral.filter({ ref_code: normCode });
    const seed = refs.find(r => !r.referee_email || r.referee_email === "");

    if (!seed) {
      return Response.json({ success: false, error: "referral code not found or already used" });
    }

    // Update the seed record with the referee's details
    await sr.entities.Referral.update(seed.id, {
      referee_email: normEmail,
      referee_name: referee_name || normEmail,
      status: "pending",
    });

    // Email the referee explaining the referral reward and what happens next
    try {
      await base44.functions.invoke("sendEmail", {
        to: normEmail,
        subject: "You've been referred to HostKeep — here's what to expect",
        html: `<p>Hi ${referee_name || "there"},</p>
<p>You signed up to HostKeep using a referral link from one of our existing hosts. Here is what happens next:</p>
<p><strong>Once you activate a paid subscription:</strong></p>
<ul>
<li>Your <strong>second month is completely free</strong> — Stripe will automatically apply a credit to your account so you are not charged until month three.</li>
<li>The host who referred you will also receive <strong>one free month</strong> added to their subscription as a thank you.</li>
</ul>
<p>Your referral status is currently <strong>Pending</strong> — it will update to <strong>Completed</strong> automatically once your subscription is activated. No action is needed from you at this point.</p>
<p>If you have any questions, just get in touch at <a href="mailto:hello@hostkeepdigital.co.uk">hello@hostkeepdigital.co.uk</a>.</p>
<p><a href="https://hostkeepdigital.co.uk/HostDashboard">Go to your dashboard →</a></p>`,
      });
    } catch (_) {}

    return Response.json({ success: true });
  } catch (e) {
    console.error("linkReferral error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});