import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const { email, password } = await req.json();

    // Basic validation
    if (!email || !password) {
      return Response.json(
        { success: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const normalisedEmail = email.toLowerCase().trim();

    // 1) Find invited founding member
    const members = await base44.asServiceRole.entities.FoundingMember.filter({
      email: normalisedEmail,
      approval_status: "invited",
    });
    const member = members?.[0];

    if (!member) {
      return Response.json(
        { success: false, error: "not_invited" },
        { status: 400 }
      );
    }

    // 2) Check if a User already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({
      email: normalisedEmail,
    });
    const existingUser = existingUsers?.[0];

    if (existingUser) {
      return Response.json(
        { success: false, error: "user_already_exists" },
        { status: 400 }
      );
    }

    // 3) Create Base44 Auth user
    const user = await base44.asServiceRole.entities.User.create({
      email: normalisedEmail,
      password,
    });

    // 4) Update founding member → password_protected
    await base44.asServiceRole.entities.FoundingMember.update(member.id, {
      user_id: user.id, // remove if your schema doesn't have this field
      approval_status: "password_protected",
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("createonboardingpassword error", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});