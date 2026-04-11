/**
 * Scheduled automation: checks if any host's property count is at or near
 * their subscription limit and sends them a warning notification + email.
 * Run daily.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    // Get all active subscriptions with a max_properties limit
    const subscriptions = await serviceRole.entities.Subscription.filter({ status: "active" });

    const warned = [];

    for (const sub of subscriptions) {
      if (!sub.max_properties || !sub.user_id) continue;

      // Count this host's published/draft properties
      const properties = await serviceRole.entities.Property.filter({ owner_id: sub.user_id });
      const activeCount = properties.filter((p) => p.status !== "paused").length;

      const limit = sub.max_properties;
      const atLimit = activeCount >= limit;
      const nearLimit = !atLimit && activeCount >= limit - 1 && limit > 1;

      if (!atLimit && !nearLimit) continue;

      const title = atLimit
        ? "⚠️ Property Limit Reached"
        : "Property Limit Almost Reached";

      const body = atLimit
        ? `You have ${activeCount} of ${limit} allowed properties on your current plan. You won't be able to add more without upgrading.`
        : `You have ${activeCount} of ${limit} allowed properties. You're 1 away from your plan limit — consider upgrading soon.`;

      await serviceRole.functions.invoke("sendNotification", {
        user_id: sub.user_id,
        type: "general",
        title,
        body,
        link: "/Subscription",
        force_email: false,
      });

      warned.push({ user_id: sub.user_id, activeCount, limit });
    }

    return Response.json({ ok: true, warned });
  } catch (err) {
    console.error("checkSubscriptionLimits error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});