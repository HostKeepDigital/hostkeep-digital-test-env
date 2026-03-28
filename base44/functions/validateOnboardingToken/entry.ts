import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ valid: false, error: "missing_token" }, { status: 400 });
    }

    const members = await base44.asServiceRole.entities.FoundingMember.filter({
      onboarding_token: token,
      approval_status: "invited",
    });

    const member = members?.[0];

    if (!member) {
      return Response.json({ valid: false, error: "invalid_token" }, { status: 400 });
    }

    if (new Date(member.onboarding_expires_at) < new Date()) {
      return Response.json({ valid: false, error: "expired" }, { status: 400 });
    }

    // ⭐ Return the email so the frontend can display it
    return Response.json({
      valid: true,
      email: member.email.toLowerCase().trim(),
    });

  } catch (err) {
    console.error("validateOnboardingToken error:", err);
    return Response.json({ valid: false, error: "server_error" }, { status: 500 });
  }
});