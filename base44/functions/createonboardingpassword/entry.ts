import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  try {
    // ⭐ Critical: allow this function to run without a logged‑in user
    const base44 = createClientFromRequest(req).asServiceRole;

    const { token } = await req.json();

    if (!token) {
      return Response.json(
        { valid: false, error: "missing_token" },
        { status: 400 }
      );
    }

    // Look up the invited founding member by onboarding token
    const members = await base44.entities.FoundingMember.filter({
      onboarding_token: token,
      approval_status: "invited",
    });

    const member = members?.[0];

    if (!member) {
      return Response.json(
        { valid: false, error: "invalid_token" },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(member.onboarding_expires_at) < new Date()) {
      return Response.json(
        { valid: false, error: "expired" },
        { status: 400 }
      );
    }

    // Return the email so the frontend can prefill the field
    return Response.json({
      valid: true,
      email: member.email.toLowerCase().trim(),
    });

  } catch (err) {
    console.error("validateOnboardingToken error:", err);
    return Response.json(
      { valid: false, error: "server_error" },
      { status: 500 }
    );
  }
});