import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;
    const { user_id, email, forename, middle_name, surname, phone, location } = await req.json();

    if (!forename || !surname) {
      return Response.json({ success: false, error: "forename and surname are required" }, { status: 400 });
    }

    if (!email) {
      return Response.json({ success: false, error: "email is required" }, { status: 400 });
    }

    const updates = {
      forename,
      middle_name: middle_name || "",
      surname,
      full_name: [forename, middle_name, surname].filter(Boolean).join(" "),
      phone: phone || "",
      location: location || "",
    };

    // Always look up by email — reliable for custom User entity
    const existing = await serviceRole.entities.User.filter({ email: email.toLowerCase().trim() });

    if (existing && existing.length > 0) {
      await serviceRole.entities.User.update(existing[0].id, updates);
    } else {
      // Create new record if none found
      await serviceRole.entities.User.create({ email: email.toLowerCase().trim(), ...updates });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error("saveUserProfile error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});