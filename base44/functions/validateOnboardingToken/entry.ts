import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req).asServiceRole;

    const { token } = await req.json();

    if (!token) {
      return Response.json(
        { valid: false, error: "missing_token" },
        { status: 400 }
      );
    }

    let member = null;

    try {
      const members = await base44.entities.FoundingMember.filter({
        onboarding_token: token,
        approval_status: "invited",
      });
      member = members?.[0];
    } catch (err) {
      return Response.json(
        { valid: false, error: "invalid_token" },
        { status: 400 }
      );
    }

    if (!member) {
      return Response.json(
        { valid: false, error: "invalid_token" },
        { status: 400 }
      );
    }

    if (new Date(member.onboarding_expires_at) < new Date()) {
      return Response.json(
        { valid: false, error: "expired" },
        { status: 400 }
      );
    }

    return Response.json({
      valid: true,
      email: member.email.toLowerCase().trim(),
    });

  } catch (err) {
    return Response.json(
      { valid: false, error: "server_error" },
      { status: 500 }
    );
  }
});