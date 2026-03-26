import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ exists: false });
    }

    const normalisedEmail = email.toLowerCase().trim();

    // Look for a User with this email
    const users = await base44.asServiceRole.entities.User.filter({
      email: normalisedEmail,
    });

    const exists = users && users.length > 0;

    return Response.json({ exists });
  } catch (err) {
    console.error("checkUserExists error:", err);
    return Response.json({ exists: false });
  }
});