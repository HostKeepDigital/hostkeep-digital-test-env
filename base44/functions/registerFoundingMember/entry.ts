import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Creates a user account via service role to avoid triggering
// Base44's built-in verification email (we handle email ourselves).
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { email, password, full_name, role } = await req.json();

  if (!email || !password || !full_name) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    await base44.auth.register({
      email: email.toLowerCase().trim(),
      password,
      full_name,
      skip_welcome_email: true,
    });

    // Create a pending UserRole for this user so they land on /pending after login
    if (role) {
      try {
        const users = await base44.asServiceRole.entities.User.list();
        const newUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());
        if (newUser) {
          const existingRoles = await base44.asServiceRole.entities.UserRole.filter({ user_id: newUser.id });
          if (existingRoles.length === 0) {
            await base44.asServiceRole.entities.UserRole.create({
              user_id: newUser.id,
              role: role,
              approval_status: 'pending',
            });
          }
        }
      } catch (roleErr) {
        console.error('UserRole creation failed:', roleErr.message);
      }
    }

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