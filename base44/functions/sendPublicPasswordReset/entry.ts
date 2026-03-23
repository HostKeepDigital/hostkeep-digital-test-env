import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    
    // Use service role to send password reset without requiring user auth
    await base44.asServiceRole.auth.sendPasswordResetEmail(email);

    return Response.json({ success: true });
  } catch (error) {
    // Always return success for security (don't reveal if email exists)
    return Response.json({ success: true });
  }
});