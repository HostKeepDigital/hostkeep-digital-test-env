import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { event, data } = await req.json();

  // Only fire on create
  if (event?.type !== 'create') return Response.json({ ok: true });

  const { user_id, role, approval_status } = data || {};

  // Only notify for host/cleaner pending roles
  if (!['host', 'cleaner'].includes(role) || approval_status !== 'pending') {
    return Response.json({ ok: true });
  }

  const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
  const user = users?.[0];
  if (!user) return Response.json({ ok: true });

  // Get the role record id for the approve link
  const roles = await base44.asServiceRole.entities.UserRole.filter({ user_id, role });
  const roleRecord = roles?.[0];

  const approveFunctionUrl = `https://api.base44.app/api/apps/698eee4108bd1d9467648326/functions/approveUser`;

  await base44.asServiceRole.integrations.Core.SendEmail({
    to: 'hello@hostkeepdigital.co.uk',
    subject: `New ${role} application: ${user.full_name || user.email}`,
    body: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#0d9488;">New ${role.charAt(0).toUpperCase() + role.slice(1)} Application</h2>
        <table style="border-collapse:collapse;width:100%;margin-bottom:24px;">
          <tr><td style="padding:8px;color:#6b7280;width:120px;">Name</td><td style="padding:8px;font-weight:600;">${user.full_name || '—'}</td></tr>
          <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">Email</td><td style="padding:8px;">${user.email}</td></tr>
          <tr><td style="padding:8px;color:#6b7280;">Role applied for</td><td style="padding:8px;text-transform:capitalize;">${role}</td></tr>
          <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">Registered</td><td style="padding:8px;">${new Date().toLocaleDateString('en-GB')}</td></tr>
        </table>
        <a href="${approveFunctionUrl}"
           onclick="fetch('${approveFunctionUrl}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role_id:'${roleRecord?.id}'})});this.textContent='Approved ✓';return false;"
           style="display:inline-block;background:#0d9488;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:12px;">
          ✅ Approve Application
        </a>
        <a href="https://hostkeepdigital.co.uk/admin"
           style="display:inline-block;background:#f3f4f6;color:#111827;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
          View Admin Panel
        </a>
        <p style="margin-top:24px;font-size:13px;color:#9ca3af;">
          Or approve via direct link (works in any email client):<br/>
          <a href="${approveFunctionUrl}?role_id=${roleRecord?.id}" style="color:#0d9488;">
            ${approveFunctionUrl}?role_id=${roleRecord?.id}
          </a>
        </p>
      </div>
    `,
  });

  return Response.json({ ok: true });
});