import { createClientFromRequest } from 
  'npm:@base44/sdk@0.8.21';

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

  const hasRole = existingRoles?.some(r => 
    r.role === member.role
  );
  
if (!hasRole) {
    await base44.asServiceRole.entities.UserRole
      .create({
        user_id: user_id,
        role: member.role,
        approval_status: 'approved',
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