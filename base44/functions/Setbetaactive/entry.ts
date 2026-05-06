/**
 * setBetaActive — admin-only toggle for beta mode
 * Updates the beta_open flag in BetaSettings entity.
 * Frontend reads this via getBetaSettings (public).
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { session_token, beta_open } = body;

    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    // Validate session + admin role
    if (!session_token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const sessions = await serviceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date() || session.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (typeof beta_open !== "boolean") {
      return Response.json({ error: "beta_open must be true or false" }, { status: 400 });
    }

    // Get or create BetaSettings record
    const settings = await serviceRole.entities.BetaSettings.list();
    if (settings.length > 0) {
      await serviceRole.entities.BetaSettings.update(settings[0].id, { beta_open });
    } else {
      await serviceRole.entities.BetaSettings.create({
        beta_open,
        emails_sent_count: 0,
      });
    }

    return Response.json({ success: true, beta_open });
  } catch (err) {
    console.error("setBetaActive error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});