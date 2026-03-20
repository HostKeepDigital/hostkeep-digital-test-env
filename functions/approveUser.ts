import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { role_id } = await req.json();

  if (!role_id) {
    return Response.json({ error: 'Missing role_id' }, { status: 400 });
  }

  const roles = await base44.asServiceRole.entities.UserRole.filter({ id: role_id });
  if (!roles || roles.length === 0) {
    return new Response('<html><body><h2>Role not found.</h2></body></html>', {
      headers: { 'Content-Type': 'text/html' },
      status: 404,
    });
  }

  await base44.asServiceRole.entities.UserRole.update(role_id, { approval_status: 'approved' });

  // Send approval email to user
  const role = roles[0];
  const users = await base44.asServiceRole.entities.User.filter({ id: role.user_id });
  if (users && users[0]) {
    const user = users[0];
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: 'Your HostKeep application has been approved!',
      body: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #0d9488;">You're approved! 🎉</h2>
          <p>Hi ${user.full_name || 'there'},</p>
          <p>Great news — your HostKeep application has been reviewed and approved. You can now log in and get started.</p>
          <p>To activate your account, you'll need to subscribe to a plan:</p>
          <a href="https://hostkeepdigital.co.uk/Subscription"
             style="display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">
            Choose a Plan
          </a>
          <p style="margin-top:24px;color:#6b7280;font-size:14px;">Welcome to HostKeep!</p>
        </div>
      `,
    });
  }

  return new Response(
    `<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
      <h2 style="color:#0d9488;">✅ User approved successfully!</h2>
      <p>The user has been notified by email.</p>
      <a href="https://hostkeepdigital.co.uk/admin" style="color:#0d9488;">Go to Admin Panel</a>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
});