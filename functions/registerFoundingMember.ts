import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Creates a user account via service role to avoid triggering
// Base44's built-in verification email (we handle email ourselves).
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { email, password, full_name } = await req.json();

  if (!email || !password || !full_name) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    await base44.asServiceRole.auth.register({
      email: email.toLowerCase().trim(),
      password,
      full_name,
      skip_welcome_email: true,
    });
    return Response.json({ ok: true });
  } catch (err) {
    // If user already exists, that's fine — treat as success
    const msg = err?.message || '';
    if (msg.includes('already') || msg.includes('exists') || msg.includes('duplicate')) {
      return Response.json({ ok: true });
    }
    return Response.json({ error: msg }, { status: 500 });
  }
});