import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { full_name, email, postcode, role } = await req.json();

  if (!full_name || !email || !postcode || !role) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const outOfArea = !['TR','PL','EX'].some(p =>
    postcode.trim().toUpperCase().replace(/\s+/g,'').startsWith(p)
  );

  // Check for duplicate email
  const existing = await base44.asServiceRole.entities.FoundingMember.filter({
    email: email.toLowerCase().trim()
  });
  if (existing && existing.length > 0) {
    return Response.json({ error: 'duplicate_email' });
  }

  // Create FoundingMember record
  await base44.asServiceRole.entities.FoundingMember.create({
    full_name: full_name.trim(),
    email: email.toLowerCase().trim(),
    postcode: postcode.toUpperCase().trim(),
    role,
    approval_status: outOfArea ? 'out_of_area' : 'pending',
    signup_timestamp: new Date().toISOString(),
  });

  const roleLabel = role === 'host' ? 'Host' : 'Cleaner';

  if (!outOfArea) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'HostKeep',
        to: email.toLowerCase().trim(),
        subject: "You're on the list — HostKeep",
        body: `Thank you for applying to become a Founding ${roleLabel} on HostKeep. We are reviewing your application and will be in touch within 24 hours. You do not need to do anything right now.`,
      });
    } catch (_) {}

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'HostKeep',
        to: 'admin@hostkeepdigital.co.uk',
        subject: `New Founding Member Application — ${full_name.trim()} (${roleLabel})`,
        body: `New application submitted.\n\nName: ${full_name.trim()}\nEmail: ${email}\nPostcode: ${postcode}\nRole: ${roleLabel}`,
      });
    } catch (_) {}
  }

  return Response.json({ success: true, out_of_area: outOfArea });
});