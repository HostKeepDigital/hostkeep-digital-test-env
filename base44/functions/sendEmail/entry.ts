import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { to, subject, html, from_name, from_email } = await req.json();

  if (!to || !subject || !html) {
    return Response.json({ error: 'Missing required fields: to, subject, html' }, { status: 400 });
  }

  const fromAddress = from_email
    ? `${from_name || 'HostKeep'} <${from_email}>`
    : `${from_name || 'HostKeep'} <hello@hostkeepdigital.co.uk>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [to],
      subject,
      html,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return Response.json({ error: data }, { status: res.status });
  }

  return Response.json({ success: true, id: data.id });
});