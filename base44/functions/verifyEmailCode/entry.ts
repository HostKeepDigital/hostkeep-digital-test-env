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

  // Delete the used code
  await base44.asServiceRole.entities.EmailVerificationCode.delete(record.id);

  // ⭐ SEND THE THANK-YOU EMAIL HERE
  await base44.asServiceRole.functions.invoke("sendEmail", {
    to: email,
    subject: "Thank you for registering with HostKeep",
    html: `
      <h2>Welcome to HostKeep!</h2>
      <p>Thank you for registering your interest as a Founding Member.</p>
      <p>We'll review your application shortly and notify you once a decision has been made.</p>
    `,
  });

  return Response.json({ valid: true });
});