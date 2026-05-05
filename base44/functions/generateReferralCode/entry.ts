import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { session_token, user_id, email } = body;
    if (!session_token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const base44client = createClientFromRequest(req);
    const sessions = await base44client.asServiceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const base44 = base44client;
    const sr = base44.asServiceRole;

    if (!user_id) return Response.json({ success: false, error: "user_id required" }, { status: 400 });

    // Check if code already exists for this user
    const existing = await sr.entities.Referral.filter({ referrer_user_id: user_id });
    const existingCode = existing.find(r => r.ref_code);
    if (existingCode?.ref_code) {
      return Response.json({ success: true, ref_code: existingCode.ref_code });
    }

    // Generate a unique 8-char alphanumeric code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const ref_code = Array.from(bytes).map(b => chars[b % chars.length]).join("");

    // Store as a seed record so the code is reserved
    await sr.entities.Referral.create({
      referrer_user_id: user_id,
      referrer_email: email || "",
      ref_code,
      status: "pending",
    });

    return Response.json({ success: true, ref_code });
  } catch (e) {
    console.error("generateReferralCode error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});