import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json(
        { success: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const normalisedEmail = email.toLowerCase().trim();

    // Allow multiple valid onboarding states
    const members = await base44.asServiceRole.entities.FoundingMember.filter({
      email: normalisedEmail,
      approval_status: ["invited", "email_verified", "awaiting_password"],
    });

    const member = members?.[0];

    if (!member) {
      return Response.json(
        { success: false, error: "not_invited_or_wrong_state" },
        { status: 400 }
      );
    }

    // Check if a User already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({
      email: normalisedEmail,
    });

    if (existingUsers?.length > 0) {
      return Response.json(
        { success: false, error: "user_already_exists" },
        { status: 400 }
      );
    }

    // Create the user
    const user = await base44.asServiceRole.entities.User.create({
      email: normalisedEmail,
      password,
    });

    // Update founding member
    await base44.asServiceRole.entities.FoundingMember.update(member.id, {
      user_id: user.id,
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