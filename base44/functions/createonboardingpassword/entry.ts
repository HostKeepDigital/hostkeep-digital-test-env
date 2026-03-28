import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    // Two clients: auth (for register) + service role (for entities)
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json(
        { success: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const normalisedEmail = email.toLowerCase().trim();

    // 1) Find founding member
    const members = await serviceRole.entities.FoundingMember.filter({
      email: normalisedEmail,
    });
    const member = members?.[0];

    if (!member) {
      return Response.json(
        { success: false, error: "not_found" },
        { status: 400 }
      );
    }

    const allowed = ["invited", "email_verified", "awaiting_password"];
    if (!allowed.includes(member.approval_status)) {
      return Response.json(
        { success: false, error: "wrong_state" },
        { status: 400 }
      );
    }

    // 2) Find existing user (created by approveUser)
    const existingUsers = await serviceRole.entities.User.filter({
      email: normalisedEmail,
    });
    const user = existingUsers?.[0];

    if (!user) {
      return Response.json(
        { success: false, error: "user_not_found" },
        { status: 400 }
      );
    }

    // 3) Update the user's password via dedicated auth method
    await serviceRole.auth.changeUserPassword(user.id, password);

    // 4) Mark email as verified on the User entity
    await serviceRole.entities.User.update(user.id, { email_verified: true });

    // 4) Update FoundingMember record
    await serviceRole.entities.FoundingMember.update(member.id, {
      user_id: user?.id,
      approval_status: "password_protected",
    });

    return Response.json({ success: true });

  } catch (err) {
    console.error("createonboardingpassword error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});