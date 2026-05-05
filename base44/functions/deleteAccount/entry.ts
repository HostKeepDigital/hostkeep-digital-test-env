import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { session_token, admin_delete_email } = body;
    if (!session_token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const base44client = createClientFromRequest(req);
    const sessions = await base44client.asServiceRole.entities.UserSession.filter({ session_token });
    const sessionRecord = sessions?.[0];
    if (!sessionRecord || new Date(sessionRecord.expires_at) < new Date()) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base44 = base44client;
    const serviceRole = base44.asServiceRole;

    let email = null;
    let sessionUserId = null;

    if (admin_delete_email) {
      // Admin path — must be admin
      if (sessionRecord.role !== "admin") {
        return Response.json({ error: "Forbidden — admin only" }, { status: 403 });
      }
      email = admin_delete_email.toLowerCase().trim();
    } else {
      // Self-delete path — use session
      email = sessionRecord.email;
      sessionUserId = sessionRecord.user_id;
    }

    // ── Resolve user_id ──────────────────────────────────────────────────────
    // Try from session first, then UserCredentials, then User entity directly
    let user_id = sessionUserId;

    if (!user_id) {
      const creds = await serviceRole.entities.UserCredentials.filter({ email });
      user_id = creds?.[0]?.user_id ?? null;
    }

    if (!user_id) {
      // Guest-only signup path — no credentials record, look up in User entity
      const users = await serviceRole.entities.User.filter({ email });
      user_id = users?.[0]?.id ?? null;
    }

    // ── 1. UserSession ────────────────────────────────────────────────────────
    const allSessions = await serviceRole.entities.UserSession.filter({ email });
    for (const s of allSessions) await serviceRole.entities.UserSession.delete(s.id);

    // ── 2. UserCredentials ────────────────────────────────────────────────────
    const creds = await serviceRole.entities.UserCredentials.filter({ email });
    for (const c of creds) await serviceRole.entities.UserCredentials.delete(c.id);

    // ── 3. FoundingMember ─────────────────────────────────────────────────────
    const members = await serviceRole.entities.FoundingMember.filter({ email });
    for (const m of members) await serviceRole.entities.FoundingMember.delete(m.id);

    // ── 4. PasswordResetToken ─────────────────────────────────────────────────
    const resetTokens = await serviceRole.entities.PasswordResetToken.filter({ email });
    for (const t of resetTokens) await serviceRole.entities.PasswordResetToken.delete(t.id);

    // ── 5. EmailVerificationCode ──────────────────────────────────────────────
    const verifyCodes = await serviceRole.entities.EmailVerificationCode.filter({ email });
    for (const v of verifyCodes) await serviceRole.entities.EmailVerificationCode.delete(v.id);

    // ── Records keyed by user_id ──────────────────────────────────────────────
    if (user_id) {
      // 6. UserRole
      const roles = await serviceRole.entities.UserRole.filter({ user_id });
      for (const r of roles) await serviceRole.entities.UserRole.delete(r.id);

      // 7. Subscription
      const subs = await serviceRole.entities.Subscription.filter({ user_id });
      for (const s of subs) await serviceRole.entities.Subscription.delete(s.id);

      // 8. Property
      const properties = await serviceRole.entities.Property.filter({ owner_id: user_id });
      for (const p of properties) await serviceRole.entities.Property.delete(p.id);

      // 9. Cleaner profile
      const cleaners = await serviceRole.entities.Cleaner.filter({ user_id });
      for (const c of cleaners) await serviceRole.entities.Cleaner.delete(c.id);

      // 10. Notification
      const notifs = await serviceRole.entities.Notification.filter({ user_id });
      for (const n of notifs) await serviceRole.entities.Notification.delete(n.id);
    }

    // ── 11. Guest record (keyed by email) ─────────────────────────────────────
    const guests = await serviceRole.entities.Guest.filter({ email });
    for (const g of guests) await serviceRole.entities.Guest.delete(g.id);

    return Response.json({ success: true });
  } catch (err) {
    console.error("deleteAccount error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});