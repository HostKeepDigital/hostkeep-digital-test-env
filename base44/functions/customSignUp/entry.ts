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

    const { email, password, forename, middle_name, surname, ref_code } = await req.json().catch(() => ({}));

    if (!email || !password || !forename || !surname) {
      return Response.json(
        { success: false, message: 'Email, password, forename, and surname are required' },
        { status: 400 }
      );
    }

    if (forename.length > 100 || surname.length > 100) {
      return Response.json({ success: false, error: "Name fields cannot exceed 100 characters" }, { status: 400 });
    }
    if ((middle_name || "").length > 100) {
      return Response.json({ success: false, error: "Middle name cannot exceed 100 characters" }, { status: 400 });
    }
    if (password.length > 128) {
      return Response.json({ success: false, error: "Password cannot exceed 128 characters" }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ success: false, error: "Password must be at least 8 characters" }, { status: 400 });
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
        full_name: [forename, middle_name, surname].filter(Boolean).join(" "),
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
        user_id: user.id,
      });
    } catch (err) {
      console.error('Failed to create UserCredentials:', err.message);
      throw err;
    }

    // Link referee to referral record if a ref_code was provided
    if (ref_code) {
      try {
        const normCode = ref_code.trim().toUpperCase();
        const refs = await serviceRole.entities.Referral.filter({ ref_code: normCode });
        if (refs.length > 0) {
          await serviceRole.entities.Referral.update(refs[0].id, {
            referee_email: normalisedEmail,
            referee_name: [forename, surname].filter(Boolean).join(" "),
          });
        }
      } catch (_) {}
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