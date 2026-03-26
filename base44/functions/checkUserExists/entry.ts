import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ exists: false });
    }

    const normalisedEmail = email.toLowerCase().trim();

    // Look for an invited Founding Member with this email
    const members = await base44.asServiceRole.entities.FoundingMember.filter({
      email: normalisedEmail,
      approval_status: "invited",
    });

    const exists = members && members.length > 0;

    return Response.json({ exists });
  } catch (err) {
    console.error("checkUserExists error:", err);
    return Response.json({ exists: false });
  }
});
