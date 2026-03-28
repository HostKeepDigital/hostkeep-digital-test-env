import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req).asServiceRole;

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json(
        { success: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const normalisedEmail = email.toLowerCase().trim();

    const members = await base44.entities.FoundingMember.filter({
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

    const existingUsers = await base44.entities.User.filter({
      email: normalisedEmail,
    });

    if (existingUsers?.length > 0) {
      return Response.json(
        { success: false, error: "user_already_exists" },
        { status: 400 }
      );
    }

    const user = await base44.entities.User.create({
      email: normalisedEmail,
      password,
    });

    await base44.entities.FoundingMember.update(member.id, {
      user_id: user.id,
      approval_status: "password_protected",
    });

    return Response.json({ success: true });

  } catch (err) {
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});