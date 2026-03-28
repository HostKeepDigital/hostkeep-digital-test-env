import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  // ⭐ Critical: elevate to service role so this function can run publicly
  const base44 = createClientFromRequest(req).asServiceRole;

  try {
    console.log("🔵 createonboardingpassword: request received");

    const { email, password } = await req.json();
    console.log("📥 Received payload:", { email, passwordPresent: !!password });

    if (!email || !password) {
      console.log("❌ Missing fields");
      return Response.json(
        { success: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const normalisedEmail = email.toLowerCase().trim();
    console.log("📧 Normalised email:", normalisedEmail);

    // Fetch founding member
    const members = await base44.entities.FoundingMember.filter({
      email: normalisedEmail,
    });

    console.log("🟡 FoundingMember lookup result:", members);

    const member = members?.[0];

    if (!member) {
      console.log("❌ No founding member found");
      return Response.json(
        { success: false, error: "not_found" },
        { status: 400 }
      );
    }

    console.log("🟢 FoundingMember:", {
      id: member.id,
      status: member.approval_status,
    });

    const allowed = ["invited", "email_verified", "awaiting_password"];

    if (!allowed.includes(member.approval_status)) {
      console.log("❌ Wrong state:", member.approval_status);
      return Response.json(
        { success: false, error: "wrong_state" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUsers = await base44.entities.User.filter({
      email: normalisedEmail,
    });

    console.log("🟡 Existing user lookup:", existingUsers);

    if (existingUsers?.length > 0) {
      console.log("❌ User already exists");
      return Response.json(
        { success: false, error: "user_already_exists" },
        { status: 400 }
      );
    }

    // Create user
    console.log("🛠 Creating user…");
    const user = await base44.entities.User.create({
      email: normalisedEmail,
      password,
    });

    console.log("🟢 User created:", user);

    // Update founding member
    console.log("🛠 Updating FoundingMember…");
    await base44.entities.FoundingMember.update(member.id, {
      user_id: user.id,
      approval_status: "password_protected",
    });

    console.log("🟢 FoundingMember updated");

    return Response.json({ success: true });

  } catch (err) {
    console.error("🔥 createonboardingpassword error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});