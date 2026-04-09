import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { session_token, full_name, forename, middle_name, surname, phone, location } = await req.json();

    // Assemble full_name from parts if not provided directly
    const resolvedFullName = full_name !== undefined
      ? full_name
      : (forename !== undefined || surname !== undefined)
        ? [forename || "", middle_name || "", surname || ""].map(s => s.trim()).filter(Boolean).join(" ")
        : undefined;

    if (!session_token) {
      return Response.json({ success: false, error: "missing_session_token" }, { status: 401 });
    }

    const sessions = await serviceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];

    if (!session) {
      return Response.json({ success: false, error: "invalid_session" }, { status: 401 });
    }

    if (new Date(session.expires_at) < new Date()) {
      return Response.json({ success: false, error: "session_expired" }, { status: 401 });
    }

    const updates = {};
    if (resolvedFullName !== undefined) updates.full_name = resolvedFullName.trim();
    if (forename !== undefined) updates.forename = forename.trim();
    if (middle_name !== undefined) updates.middle_name = middle_name.trim();
    if (surname !== undefined) updates.surname = surname.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (location !== undefined) updates.location = location.trim();

    if (Object.keys(updates).length === 0) {
      return Response.json({ success: true });
    }

    // Founding member path
    if (session.founding_member_id) {
      const fmUpdates = {};
      if (resolvedFullName !== undefined) fmUpdates.full_name = resolvedFullName.trim();
      if (phone !== undefined) fmUpdates.phone = phone.trim();
      if (location !== undefined) fmUpdates.location = location.trim();
      await serviceRole.entities.FoundingMember.update(session.founding_member_id, fmUpdates);
      return Response.json({ success: true });
    }

    // Regular guest path — update Guest entity by email
    const normalisedEmail = session.email.toLowerCase().trim();
    const guests = await serviceRole.entities.Guest.filter({ email: normalisedEmail });
    if (guests?.[0]) {
      const guestUpdates = {};
      if (resolvedFullName !== undefined) guestUpdates.full_name = resolvedFullName.trim();
      if (forename !== undefined) guestUpdates.forename = forename.trim();
      if (middle_name !== undefined) guestUpdates.middle_name = middle_name.trim();
      if (surname !== undefined) guestUpdates.surname = surname.trim();
      if (phone !== undefined) guestUpdates.phone = phone.trim();
      await serviceRole.entities.Guest.update(guests[0].id, guestUpdates);

      // full_name, phone and location also go to User if user_id exists
      if (session.user_id) {
        const userUpdates = {};
        if (resolvedFullName !== undefined) userUpdates.full_name = resolvedFullName.trim();
        if (phone !== undefined) userUpdates.phone = phone.trim();
        if (location !== undefined) userUpdates.location = location.trim();
        if (Object.keys(userUpdates).length > 0) {
          await serviceRole.entities.User.update(session.user_id, userUpdates);
        }
      }

      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: "user_not_found" }, { status: 404 });

  } catch (err) {
    console.error("updateProfile error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});