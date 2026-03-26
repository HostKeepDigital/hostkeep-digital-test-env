import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { user_id } = await req.json();

  try {
    // Try direct password update on the user via service role
    const result = await base44.asServiceRole.entities.User.update(user_id, { password: 'TestNewPass99!' });
    return Response.json({ success: true, result });
  } catch (e) {
    return Response.json({ error: e.message });
  }
});