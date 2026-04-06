import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { email, user_id } = await req.json();

  if (!email || !user_id) {
    return Response.json({ matched: false });
  }

  const members = await base44.asServiceRole
    .entities.FoundingMember.filter({ 
      email: email.toLowerCase().trim() 
    });

  const member = members?.find(m => 
    ['invited', 'doc_review', 'approved']
      .includes(m.approval_status)
  );

  if (!member) {
    return Response.json({ matched: false });
  }

  const existingRoles = await base44.asServiceRole
    .entities.UserRole.filter({ 
      user_id: user_id 
    });

  // Auto-create beta subscription for founding members
  const existingSubs = await base44.asServiceRole
    .entities.Subscription.filter({ user_id });

  const betaPlan = member.role === 'host' ? 'beta_host_access' : 'beta_cleaner_access';
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (!existingSubs.length) {
    await base44.asServiceRole.entities.Subscription.create({
      user_id,
      plan: betaPlan,
      status: 'active',
      is_founding_member: true,
      price_monthly: 0,
      start_date: now.toISOString().split('T')[0],
      end_date: thirtyDaysFromNow.toISOString().split('T')[0],
    });
  }
  
  const hasRole = existingRoles?.some(r => 
    r.role === member.role
  );
  
if (!hasRole) {
    await base44.asServiceRole.entities.UserRole
      .create({
        user_id: user_id,
        role: member.role,
        approval_status: 'approved',
        is_founding_member: member.is_founding_member || false,
      });

    await base44.asServiceRole.entities.FoundingMember
      .update(member.id, { 
        user_id: user_id 
      });
  }

  return Response.json({ 
    matched: true, 
    role: member.role 
  });
});