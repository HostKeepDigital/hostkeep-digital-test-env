import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req).asServiceRole;

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ success: false, error: "missing_fields" }, { status: 400 });
    }

    const normalisedEmail = email.toLowerCase().trim();

    let member = null;
    try {
      const members = await base44.entities.FoundingMember.filter({ email: normalisedEmail });
      member = members?.[0];
    } catch (err) {
      return Response.json({ success: false, error: "not_found" }, { status: 400 });
    }

    if (!member) {
      return Response.json({ success: false, error: "not_found" }, { status: 400 });
    }

    const allowed = ["invited", "email_verified", "awaiting_password"];
    if (!allowed.includes(member.approval_status)) {
      return Response.json({ success: false, error: "wrong_state" }, { status: 400 });
    }

    const existingUsers = await base44.entities.User.filter({ email: normalisedEmail });
    const user = existingUsers?.[0];

    if (!user) {
      return Response.json({ success: false, error: "user_not_found" }, { status: 400 });
    }

    await base44.entities.User.update(user.id, {
      password,
      email_verified: true,
    });

    await base44.entities.FoundingMember.update(member.id, {
      approval_status: "password_protected",
    });

    return Response.json({ success: true });

  } catch (err) {
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});