import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { member_id } = await req.json();
    if (!member_id) {
      return Response.json({ error: 'member_id required' }, { status: 400 });
    }

    // Get founding member & their associated user account
    const member = await base44.entities.FoundingMember.get(member_id);
    if (!member) {
      return Response.json({ error: 'Member not found' }, { status: 404 });
    }

    // Update member status
    await base44.entities.FoundingMember.update(member_id, { 
      approval_status: 'password_protected' 
    });

    // Create UserRole if needed
    const existingRoles = await base44.entities.UserRole.filter({ 
      user_id: member.user_id || member.id,
      role: 'host'
    });
    
    if (!existingRoles || existingRoles.length === 0) {
      await base44.entities.UserRole.create({
        user_id: member.user_id || member.id,
        role: 'host',
        approval_status: 'approved'
      });
    }

    // Send approval email
    await base44.functions.invoke('sendEmail', {
      to: member.email,
      subject: 'You\'ve been approved as a HostKeep Host!',
      body: `Hi ${member.full_name},

Great news! Your application to become a HostKeep Host has been approved.

You now have full access to the Host Dashboard where you can:
- Create and manage your properties
- View and respond to booking requests
- Manage your calendar and pricing
- Message with guests

Log in to get started: https://hostkeep.co.uk

Welcome to the HostKeep host community!

Best regards,
The HostKeep Team`
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Approval error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});