import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { email, password, full_name } = await req.json();

    if (!email || !password || !full_name) {
      return Response.json(
        { success: false, message: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    const normalisedEmail = email.toLowerCase().trim();

    // Check if credentials already exist
    const existing = await serviceRole.entities.UserCredentials.filter({ email: normalisedEmail });
    if (existing && existing.length > 0) {
      return Response.json(
        { success: false, message: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password using same pattern as customSignIn
    const salt = Deno.env.get('HASH_SALT') || '';
    const password_hash = await hashPassword(password, salt);

    // Create User record
    const user = await serviceRole.entities.User.create({
      email: normalisedEmail,
      full_name,
    });

    // Create UserCredentials record
    await serviceRole.entities.UserCredentials.create({
      email: normalisedEmail,
      password_hash,
    });

    // Create guest UserRole
    await serviceRole.entities.UserRole.create({
      user_id: user.id,
      role: 'guest',
      approval_status: 'approved',
    });

    // Create Guest record for profile storage
    await serviceRole.entities.Guest.create({
      full_name,
      email: normalisedEmail,
    });

    return Response.json({ success: true, message: 'Account created successfully' });

  } catch (error) {
    console.error('Sign-up error:', error);
    return Response.json(
      { success: false, message: error.message || 'Sign-up failed' },
      { status: 500 }
    );
  }
});