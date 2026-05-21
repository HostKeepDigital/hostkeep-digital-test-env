import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { forename, middle_name, surname, email, postcode, role, is_existing_guest } = await req.json();

  if (!forename || !surname || !email || !postcode || !role) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const cleanPostcode = postcode.trim().toUpperCase().replace(/\s+/g, "");
  const outOfArea = !["TR", "PL", "EX"].some((p) => cleanPostcode.startsWith(p));

  // Check for duplicate email
// Check for duplicate email+role combination
  const existing = await base44.asServiceRole.entities.FoundingMember.filter({
    email: email.toLowerCase().trim(),
    role,
  });
  if (existing && existing.length > 0) {
    return Response.json({ error: "duplicate_email", status: existing[0].approval_status });
  }

  // Create FoundingMember record
  await base44.asServiceRole.entities.FoundingMember.create({
    forename: forename.trim(),
    middle_name: middle_name?.trim() || "",
    surname: surname.trim(),
    email: email.toLowerCase().trim(),
    postcode: cleanPostcode,
    role,
    approval_status: is_existing_guest ? "pending" : outOfArea ? "out_of_area" : "interest",
    email_verified: false,
    is_founding_member: true,
    signup_timestamp: new Date().toISOString(),
  });

  return Response.json({ success: true, out_of_area: outOfArea });
});