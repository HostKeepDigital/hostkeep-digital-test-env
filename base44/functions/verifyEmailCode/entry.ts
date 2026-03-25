import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { email, code } = await req.json();

  if (!email || !code) {
    return Response.json({ valid: false });
  }

  const records = await base44.asServiceRole.entities.EmailVerificationCode.filter({ email });

  if (!records || records.length === 0) {
    return Response.json({ valid: false });
  }

  const record = records[0];

  if (record.code !== code) {
    return Response.json({ valid: false });
  }

  if (new Date(record.expires_at) < new Date()) {
    return Response.json({ valid: false });
  }

  await base44.asServiceRole.entities.EmailVerificationCode.delete(record.id);

  return Response.json({ valid: true });
});