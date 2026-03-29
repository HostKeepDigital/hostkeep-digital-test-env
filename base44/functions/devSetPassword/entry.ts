import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    // Admin-only
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ success: false, error: 'forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return Response.json({ success: false, error: 'missing_fields' }, { status: 400 });
    }

    const normalisedEmail = email.toLowerCase().trim();
    const salt = Deno.env.get('HASH_SALT') || '';
    const password_hash = await hashPassword(password, salt);

    const credentials = await serviceRole.entities.UserCredentials.filter({ email: normalisedEmail });

    let updated;
    if (credentials?.[0]) {
      updated = await serviceRole.entities.UserCredentials.update(credentials[0].id, { password_hash });
    } else {
      updated = await serviceRole.entities.UserCredentials.create({ email: normalisedEmail, password_hash });
    }

    return Response.json({ success: true, updated });
  } catch (err) {
    console.error('devSetPassword error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});