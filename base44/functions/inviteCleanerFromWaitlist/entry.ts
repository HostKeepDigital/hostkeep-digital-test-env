import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const { waitlist_id } = await req.json();

    if (!waitlist_id) return Response.json({ error: "waitlist_id required" }, { status: 400 });

    const entry = await sr.entities.CleanerWaitlist.get(waitlist_id);
    if (!entry) return Response.json({ error: "Waitlist entry not found" }, { status: 404 });
    if (entry.status !== "waiting") return Response.json({ error: "Entry is not in waiting status" }, { status: 400 });

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    await sr.entities.CleanerWaitlist.update(waitlist_id, {
      status: "invited",
      invited_at: new Date().toISOString().split("T")[0],
      invitation_expires_at: expiresAt,
    });

    await sr.integrations.Core.SendEmail({
      to: entry.email,
      subject: "Your CleanKeep spot is ready — activate within 48 hours",
      body: `Hi ${entry.name || "there"},

Great news — a cleaner slot has opened in your area and you're next in the queue!

You have 48 hours to activate your CleanKeep account. If you don't activate within this window, the slot will move to the next cleaner on the waitlist.

Activate your account here: https://hostkeepdigital.co.uk/CleanerSignup

This invitation expires: ${new Date(expiresAt).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}

If you have any questions, contact us at hello@hostkeepdigital.co.uk.`,
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error("inviteCleanerFromWaitlist error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});