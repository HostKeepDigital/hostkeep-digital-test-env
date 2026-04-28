import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    const { email, password, forename, middle_name, surname } = await req.json();

    if (!email || !password || !forename || !surname) {
      return Response.json(
        { success: false, message: 'Email, password, forename, and surname are required' },
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
    let user;
    try {
      user = await serviceRole.entities.User.create({
        email: normalisedEmail,
        forename,
        middle_name: middle_name || null,
        surname,
      });
    } catch (err) {
      console.error('Failed to create User:', err.message);
      throw err;
    }

    // Create UserCredentials record
    try {
      await serviceRole.entities.UserCredentials.create({
        email: normalisedEmail,
        password_hash,
      });
    } catch (err) {
      console.error('Failed to create UserCredentials:', err.message);
      throw err;
    }

    // Create guest UserRole
    try {
      await serviceRole.entities.UserRole.create({
        user_id: user.id,
        role: 'guest',
        approval_status: 'approved',
      });
    } catch (err) {
      console.error('Failed to create UserRole:', err.message);
      throw err;
    }

    // Create Guest record for profile storage
    try {
      await serviceRole.entities.Guest.create({
        forename,
        middle_name: middle_name || null,
        surname,
        email: normalisedEmail,
      });
    } catch (err) {
      console.error('Failed to create Guest:', err.message);
      // Don't throw - Guest is optional
    }

    // Send verification code
    try {
      await serviceRole.functions.invoke('sendVerificationCode', { email: normalisedEmail, name: forename });
    } catch (err) {
      console.error('Failed to send verification code:', err.message);
      // Don't throw - email sending is optional
    }

    return Response.json({ success: true, email: normalisedEmail });

  } catch (error) {
    console.error('Sign-up error:', error);
    return Response.json(
      { success: false, message: error.message || 'Sign-up failed' },
      { status: 500 }
    );
  }
});