import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { email, full_name } = await req.json();

  if (!email) {
    return Response.json({ error: 'Email is required' }, { status: 400 });
  }

  // Invalidate all previous codes for this email
  const existing = await base44.asServiceRole.entities.EmailVerificationCode.filter({ email: email.toLowerCase().trim() });
  for (const c of existing) {
    await base44.asServiceRole.entities.EmailVerificationCode.update(c.id, { used: true });
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await base44.asServiceRole.entities.EmailVerificationCode.create({
    email: email.toLowerCase().trim(),
    code,
    expires_at: expiresAt,
    used: false,
  });

  const firstName = (full_name || email).split(' ')[0];

  // Send the verification email
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendResendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "HostKeep <hello@hostkeepdigital.co.uk>",
      to: [to],
      subject,
      html,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("RESEND ERROR:", data);
    throw new Error("Resend failed");
  }
}

  return Response.json({ success: true });
});