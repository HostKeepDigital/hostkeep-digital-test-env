import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;
    const body = await req.json();
    const { email, forename, middle_name, surname, phone, location } = body;

    if (!email || !forename || !surname) {
      return Response.json({ success: false, error: "forename, surname and email are required" }, { status: 400 });
    }

    const existing = await serviceRole.entities.User.filter({ email: email });

    if (existing.length > 0) {
      await serviceRole.entities.User.update(existing[0].id, {
        forename: forename,
        middle_name: middle_name || "",
        surname: surname,
        phone: phone || "",
        location: location || "",
      });
    } else {
      await serviceRole.entities.User.create({
        email: email,
        forename: forename,
        middle_name: middle_name || "",
        surname: surname,
        phone: phone || "",
        location: location || "",
      });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("saveUserProfile error:", err.message || err);
    return Response.json({ success: false, error: String(err.message || err) }, { status: 500 });
  }
});