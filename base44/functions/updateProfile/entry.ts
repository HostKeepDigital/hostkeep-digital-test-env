// src/functions/updateProfile.js
// @deno-types="npm:@types/node"
/* @global Deno */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base64 = createClientFromRequest(req);
    const serviceRole = base64.asServiceRole;

    const { session_token, full_name, phone, location } = await req.json();

    if (!session_token) {
      return Response.json({ success: false, error: "missing_session_token" }, { status: 401 });
    }

    // Validate session
    const sessions = await serviceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];

    if (!session) {
      return Response.json({ success: false, error: "invalid_session" }, { status: 401 });
    }

    if (new Date(session.expires_at) < new Date()) {
      return Response.json({ success: false, error: "session_expired" }, { status: 401 });
    }

    if (!session.founding_member_id) {
      return Response.json({ success: false, error: "no_founding_member_id" }, { status: 400 });
    }

    // Build update object dynamically
    const updates = {};

    if (full_name !== undefined) {
      updates.full_name = full_name.trim();
    }

    if (phone !== undefined) {
      updates.phone = phone.trim();
    }

    if (location !== undefined) {
      updates.location = location.trim();
    }

    // Only update if something was provided
    if (Object.keys(updates).length > 0) {
      await serviceRole.entities.FoundingMember.update(session.founding_member_id, updates);
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error("updateProfile error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});