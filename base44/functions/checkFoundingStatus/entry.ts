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
    ['invited', 'doc_review', 'approved', 'password_protected']
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
        is_founding_member: member.is_founding_member || false,
      });

    await base44.asServiceRole.entities.FoundingMember
      .update(member.id, { user_id: user_id });
  }

  // Always copy postcode + founding flag to User entity
  const userUpdates = { is_founding_member: true };
  if (member.postcode) userUpdates.signup_postcode = member.postcode.trim().toUpperCase();
  await base44.asServiceRole.entities.User.update(user_id, userUpdates);

  return Response.json({ 
    matched: true, 
    role: member.role 
  });
});