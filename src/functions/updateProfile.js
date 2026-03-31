// @deno-types="npm:@types/node"
/* global Deno */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const { session_token, full_name } = await req.json();

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

    // Update full_name on FoundingMember
    if (full_name !== undefined) {
      if (!session.founding_member_id) {
        return Response.json({ success: false, error: "no_founding_member_id" }, { status: 400 });
      }
      await serviceRole.entities.FoundingMember.update(session.founding_member_id, {
        full_name: full_name.trim(),
      });
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error("updateProfile error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});