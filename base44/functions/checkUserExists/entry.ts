import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const { email } = await req.json();
    if (!email) return Response.json({ exists: false });

    const normalisedEmail = email.toLowerCase().trim();

    // Check FoundingMember
    const fm = await base44.asServiceRole.entities.FoundingMember.filter({
      email: normalisedEmail,
      approval_status: "Invited"
    });
    console.log("DEBUG: FoundingMember:", fm);

    // Check Cleaner
    const cleaners = await base44.asServiceRole.entities.Cleaner.filter({
      email: normalisedEmail,
      approval_status: "Invited"
    });
    console.log("DEBUG: Cleaner:", cleaners);

    // Check Host
    const hosts = await base44.asServiceRole.entities.Host.filter({
      email: normalisedEmail,
      approval_status: "Invited"
    });
    console.log("DEBUG: Host:", hosts);

    const exists =
      (fm && fm.length > 0) ||
      (cleaners && cleaners.length > 0) ||
      (hosts && hosts.length > 0);

    return Response.json({ exists });
  } catch (err) {
    console.error("checkUserExists error:", err);
    return Response.json({ exists: false });
  }
});