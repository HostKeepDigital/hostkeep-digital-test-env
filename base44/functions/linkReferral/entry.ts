import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    return Response.json({ success: true });
  } catch (e) {
    console.error("linkReferral error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});