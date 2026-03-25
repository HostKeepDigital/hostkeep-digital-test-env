import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { email } = await req.json();

  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  const code = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Delete any existing code for this email
  const existing = await base44.asServiceRole.entities.EmailVerificationCode.filter({ email });
  for (const record of existing) {
    await base44.asServiceRole.entities.EmailVerificationCode.delete(record.id);
  }

  // Store the new code
  await base44.asServiceRole.entities.EmailVerificationCode.create({ email, code, expires_at });

  // Send email via Resend
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "HostKeep <hello@hostkeepdigital.co.uk>",
      to: [email],
      subject: "Your HostKeep Verification Code",
      html: `<p>Your verification code is: <strong>${code}</strong></p><p>It expires in 10 minutes.</p>`,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Resend error:", err);
    return Response.json({ error: "Failed to send email" }, { status: 500 });
  }

  return Response.json({ success: true });
});