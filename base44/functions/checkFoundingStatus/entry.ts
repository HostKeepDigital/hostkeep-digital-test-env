import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
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
      ['invited', 'approved', 'password_protected']
        .includes(m.approval_status)
    );

    if (!member) {
      return Response.json({ matched: false });
    }

    const existingRoles = await base44.asServiceRole
      .entities.UserRole.filter({ user_id });

    const hasRole = existingRoles?.some(r => r.role === member.role);

    if (!hasRole) {
      await base44.asServiceRole.entities.UserRole.create({
        user_id,
        role: member.role,
        approval_status: 'approved',
      });
      await base44.asServiceRole.entities.FoundingMember
        .update(member.id, { user_id });
    }

    // Advance from password_protected → awaiting_document_verification on login
    if (member.approval_status === "password_protected") {
      await base44.asServiceRole.entities.FoundingMember.update(member.id, {
        approval_status: "awaiting_document_verification",
      });
    }

    const userUpdates = { is_founding_member: true };
    if (member.postcode) userUpdates.signup_postcode = member.postcode.trim().toUpperCase();

    if (member.full_name) {
      const parts = member.full_name.trim().split(/\s+/).filter(Boolean);
      userUpdates.full_name = member.full_name.trim();
      userUpdates.forename = parts[0] || "";
      userUpdates.surname = parts.length > 1 ? parts[parts.length - 1] : "";
      userUpdates.middle_name = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
    }

    await base44.asServiceRole.entities.User.update(user_id, userUpdates);

    return Response.json({ matched: true, role: member.role });
  } catch (e) {
    console.error("checkFoundingStatus error:", e);
    return Response.json({ matched: false, error: e.message }, { status: 500 });
  }
});