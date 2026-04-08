import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, password, full_name } = await req.json();

    if (!email || !password || !full_name) {
      return Response.json(
        { success: false, message: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers && existingUsers.length > 0) {
      return Response.json(
        { success: false, message: 'Email already registered' },
        { status: 400 }
      );
    }

    // Create user via base44 auth (handles hashing, etc.)
    const result = await base44.asServiceRole.auth.createUser({
      email,
      password,
      full_name,
    });

    if (!result) {
      return Response.json(
        { success: false, message: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create guest role record
    await base44.asServiceRole.entities.UserRole.create({
      user_id: result.id,
      role: 'guest',
      approval_status: 'approved',
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