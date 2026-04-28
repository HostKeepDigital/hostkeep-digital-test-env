import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id, email, forename, middle_name, surname, phone, location } = await req.json();

    if (!forename || !surname) {
      return Response.json({ success: false, error: "forename and surname are required" }, { status: 400 });
    }

    const updates = {
      forename,
      middle_name: middle_name || "",
      surname,
      phone: phone || "",
      location: location || "",
    };

    if (user_id) {
      await base44.asServiceRole.entities.User.update(user_id, updates);
    } else {
      const existing = await base44.asServiceRole.entities.User.filter({ email });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.User.update(existing[0].id, updates);
      } else {
        await base44.asServiceRole.entities.User.create({ email, ...updates });
      }
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error("saveUserProfile error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});