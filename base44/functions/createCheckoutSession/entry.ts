import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";
import Stripe from "npm:stripe@14";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

const PLAN_LOOKUP_KEYS = {
  host_starter_monthly: "host_starter_monthly",
  host_growth_monthly: "host_growth_monthly",
  host_pro_monthly: "host_pro_monthly",
  cleaner_solo_monthly: "cleaner_solo_monthly",
  cleaner_pro_monthly: "cleaner_pro_monthly",
  cleaner_team_monthly: "cleaner_team_monthly",
  founding_host_solo: "founding_host_solo",
  founding_host_multi: "founding_host_multi",
  founding_host_portfolio: "founding_host_portfolio",
  founding_cleaner_solo: "founding_cleaner_solo",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { plan, user_id } = body;

    if (!user_id) {
      return Response.json(
        { error: "Missing user_id" },
        { status: 400 },
      );
    }

    if (!PLAN_LOOKUP_KEYS[plan]) {
      return Response.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Get price by lookup key
    const prices = await stripe.prices.list({
      lookup_keys: [PLAN_LOOKUP_KEYS[plan]],
      expand: ["data.product"],
    });

    if (!prices.data.length) {
      return Response.json(
        { error: "Price not found for plan" },
        { status: 404 },
      );
    }

    const price = prices.data[0];

    const origin = req.headers.get("origin") || "https://app.base44.com";

    // Create Stripe checkout session
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      success_url:
        `${origin}/Subscription?success=true&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/Subscription?cancelled=true`,
      metadata: {
        user_id,
        plan,
      },
      subscription_data: {
        metadata: {
          user_id,
          plan,
        },
      },
    });

    return Response.json({ url: checkout.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});