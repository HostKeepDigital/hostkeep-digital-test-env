import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const serviceRole = createClientFromRequest(req).asServiceRole;
    const { email, forename, middle_name, surname, phone, location } = await req.json();

    if (!email || !forename || !surname) {
      return Response.json({ success: false, error: "forename, surname and email are required" }, { status: 400 });
    }

    const existing = await serviceRole.entities.User.filter({ email });

    if (existing.length > 0) {
      await serviceRole.entities.User.update(existing[0].id, {
        forename,
        middle_name: middle_name || "",
        surname,
        phone: phone || "",
        location: location || "",
      });
    } else {
      await serviceRole.entities.User.create({
        email,
        forename,
        middle_name: middle_name || "",
        surname,
        phone: phone || "",
        location: location || "",
      });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("saveUserProfile error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});