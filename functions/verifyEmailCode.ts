import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { email, code } = await req.json();

  if (!email || !code) {
    return Response.json({ error: 'Email and code are required' }, { status: 400 });
  }

  const records = await base44.asServiceRole.entities.EmailVerificationCode.filter({
    email: email.toLowerCase().trim(),
    used: false,
  });

  if (!records || records.length === 0) {
    return Response.json({ valid: false, reason: 'no_code' });
  }

  // Find the most recent unused code matching
  const match = records
    .filter(r => r.code === code)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

  if (!match) {
    return Response.json({ valid: false, reason: 'incorrect' });
  }

  if (new Date() > new Date(match.expires_at)) {
    return Response.json({ valid: false, reason: 'expired' });
  }

  // Mark as used
  await base44.asServiceRole.entities.EmailVerificationCode.update(match.id, { used: true });

  return Response.json({ valid: true });
});