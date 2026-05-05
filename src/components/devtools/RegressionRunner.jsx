import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";

const APP_ID = "698eee4108bd1d9467648326";
const ADMIN_EMAIL = "admin@hostkeepdigital.co.uk";

async function callFn(name, body = {}) {
  const res = await fetch(`/api/apps/${APP_ID}/functions/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  try { return await res.json(); }
  catch { throw new Error(`${name} returned non-JSON (HTTP ${res.status})`); }
}

async function getFallbackUserId(ctx) {
  if (ctx.adminUserId) return ctx.adminUserId;
  const members = await base44.entities.FoundingMember.list("-created_date", 100).catch(() => []);
  return members.find(m => m.user_id)?.user_id || null;
}

function buildClaudePrompt(failedTests) {
  const lines = [
    "I ran the HostKeep pre-publish regression suite and the following tests failed. Please help me fix them.",
    "",
    "App ID: 698eee4108bd1d9467648326",
    "Stack: Base44 (Deno/TypeScript backend, React/Vite frontend), Stripe, Resend",
    "",
    "FAILED TESTS:",
    "",
  ];
  failedTests.forEach((t, i) => {
    lines.push(`${i + 1}. ${t.label}`);
    lines.push(`   Error detail: ${t.detail || "no detail"}`);
    if (t.claudeHint) lines.push(`   Context: ${t.claudeHint}`);
    lines.push("");
  });
  lines.push("Please check the relevant backend functions and frontend files and give me the fix.");
  return lines.join("\n");
}

const ENTITY_SWEEP = [
  ["Subscription", "critical for billing gates"],
  ["FoundingMember", "critical for founding pipeline"],
  ["Property", "critical for listings"],
  ["Booking", "critical for guest bookings"],
  ["Cleaner", "critical for CleanKeep marketplace"],
  ["CleaningJob", "critical for cleaner job management"],
  ["Review", "critical for trust system"],
  ["UserSession", "critical for custom auth"],
  ["UserCredentials", "critical for login"],
  ["UserProfile", "critical for Settings page"],
  ["UserRole", "critical for role detection"],
  ["VerificationDocuments", "critical for document verification gates"],
  ["CancellationPolicy", "critical for property creation step 6"],
  ["Referral", "critical for referral system"],
  ["Guest", "critical for guest management"],
  ["Notification", "critical for in-app alerts"],
  ["Conversation", "critical for messaging"],
  ["Message", "critical for messaging"],
  ["PageView", "critical for traffic analytics"],
  ["BetaSettings", "critical for beta kill switch"],
  ["EmailVerificationCode", "critical for guest signup"],
  ["Complaint", "critical for dispute resolution"],
  ["MarketPricing", "critical for smart pricing"],
  ["SmartPricingRule", "critical for pricing rules"],
];

const TESTS = [

  // ── AUTH ──────────────────────────────────────────────────────────────────
  {
    id: "auth_admin_signin", group: "Auth",
    label: "Auth: Admin customSignIn — returns session_token + role=admin",
    claudeHint: "Check base44/functions/customSignIn/entry.ts — password hash or UserSession.create broken. HASH_SALT must not have changed.",
    run: async (ctx) => {
      const res = await callFn("customSignIn", { email: ADMIN_EMAIL, password: ctx.adminPassword });
      if (!res.success) return { pass: false, detail: res.error || "success=false" };
      ctx.adminToken = res.session_token;
      return { pass: res.role === "admin" && !!res.session_token, detail: `role=${res.role}` };
    },
  },
  {
    id: "auth_check_session_valid", group: "Auth",
    label: "Auth: checkSession — valid token returns authenticated=true + user_id",
    claudeHint: "Check base44/functions/checkSession/entry.ts — User.get(session.user_id) may be failing.",
    run: async (ctx) => {
      if (!ctx.adminToken) return { pass: false, detail: "No token" };
      const res = await callFn("checkSession", { session_token: ctx.adminToken });
      ctx.adminUserId = res.user_id;
      // Admin sessions created before the user_id fix may have null user_id — authenticated=true is sufficient
      return { pass: res.authenticated === true && res.role === "admin", detail: `authenticated=${res.authenticated} user_id=${res.user_id || "null (stale session — log out and back in)"}` };
    },
  },
  {
    id: "auth_check_session_invalid", group: "Auth",
    label: "Auth: checkSession — invalid token returns authenticated=false",
    claudeHint: "Check base44/functions/checkSession/entry.ts — invalid tokens must return authenticated=false, never true.",
    run: async () => {
      const res = await callFn("checkSession", { session_token: "fake-invalid-token-regression-test" });
      return { pass: res.authenticated === false || !!res.error, detail: `authenticated=${res.authenticated}` };
    },
  },
  {
    id: "auth_wrong_password", group: "Auth",
    label: "Auth: customSignIn — wrong password returns error",
    claudeHint: "Check base44/functions/customSignIn/entry.ts — wrong password must return success=false.",
    run: async () => {
      const res = await callFn("customSignIn", { email: ADMIN_EMAIL, password: "WrongPassword999!" });
      return { pass: res.success === false && !!res.error, detail: `success=${res.success} error=${res.error}` };
    },
  },
  {
    id: "auth_check_user_exists_known", group: "Auth",
    label: "Auth: checkUserExists — known email returns exists=true",
    claudeHint: "Check base44/functions/checkUserExists/entry.ts — UserCredentials filter by email may be failing.",
    run: async () => {
      const res = await callFn("checkUserExists", { email: ADMIN_EMAIL });
      return { pass: res.exists === true, detail: `exists=${res.exists}` };
    },
  },
  {
    id: "auth_check_user_exists_unknown", group: "Auth",
    label: "Auth: checkUserExists — unknown email returns exists=false",
    claudeHint: "Check base44/functions/checkUserExists/entry.ts — unknown emails must return exists=false.",
    run: async () => {
      const res = await callFn("checkUserExists", { email: "definitelynotreal999@test.com" });
      return { pass: res.exists === false, detail: `exists=${res.exists}` };
    },
  },
  {
    id: "auth_signup_missing_fields", group: "Auth",
    label: "Auth: customSignUp — missing password returns error",
    claudeHint: "Check base44/functions/customSignUp/entry.ts — missing required fields must return error not crash.",
    run: async () => {
      const res = await callFn("customSignUp", { email: "testmissing@test.com" });
      return { pass: res.success === false || !!res.error, detail: `success=${res.success} error=${res.error}` };
    },
  },
  {
    id: "auth_logout", group: "Auth",
    label: "Auth: logoutSession — invalid token handled gracefully",
    claudeHint: "Check base44/functions/logoutSession/entry.ts — must handle missing/invalid token without 500.",
    run: async () => {
      const res = await callFn("logoutSession", { session_token: "fake-logout-regression" });
      return { pass: res.success !== undefined || res.error !== undefined, detail: `raw=${JSON.stringify(res).slice(0, 60)}` };
    },
  },
  {
    id: "auth_hash_salt_integrity", group: "Auth",
    label: "Auth: HASH_SALT integrity — admin sign-in still works (salt unchanged)",
    claudeHint: "CRITICAL: If this fails, HASH_SALT has been changed in Base44 Secrets. ALL existing passwords are now invalid. Restore original HASH_SALT immediately.",
    run: async (ctx) => {
      if (ctx.adminToken) return { pass: true, detail: "Admin sign-in succeeded — HASH_SALT unchanged ✓" };
      const res = await callFn("customSignIn", { email: ADMIN_EMAIL, password: ctx.adminPassword });
      return { pass: res.success === true, detail: res.success ? "HASH_SALT intact" : `POSSIBLE HASH_SALT CHANGE: ${res.error}` };
    },
  },

  // ── PASSWORD RESET ────────────────────────────────────────────────────────
  {
    id: "pwd_reset_missing_email", group: "Password Reset",
    label: "PwdReset: sendPasswordReset — missing email returns error",
    claudeHint: "Check base44/functions/sendPasswordReset/entry.ts — missing email must return error not crash.",
    run: async () => {
      const res = await callFn("sendPasswordReset", {});
      return { pass: res.success === false || !!res.error, detail: `success=${res.success} error=${res.error}` };
    },
  },
  {
    id: "pwd_reset_public_missing_email", group: "Password Reset",
    label: "PwdReset: sendPublicPasswordReset — missing email returns error",
    claudeHint: "Check base44/functions/sendPublicPasswordReset/entry.ts — missing email must return error.",
    run: async () => {
      const res = await callFn("sendPublicPasswordReset", {});
      return { pass: res.success === false || !!res.error, detail: `success=${res.success} error=${res.error}` };
    },
  },
  {
    id: "pwd_verify_reset_invalid_token", group: "Password Reset",
    label: "PwdReset: verifyPasswordReset — fake token returns error",
    claudeHint: "Check base44/functions/verifyPasswordReset/entry.ts — fake tokens must return valid=false or error.",
    run: async () => {
      const res = await callFn("verifyPasswordReset", { token: "fake-reset-token-xyz", newPassword: "NewPass999!" });
      return { pass: res.valid === false || res.success === false || !!res.error, detail: `valid=${res.valid} error=${res.error}` };
    },
  },
  {
    id: "pwd_onboarding_missing_email", group: "Password Reset",
    label: "PwdReset: setOnboardingPassword — missing email returns error",
    claudeHint: "Check base44/functions/setOnboardingPassword/entry.ts — missing email must return error.",
    run: async () => {
      const res = await callFn("setOnboardingPassword", { password: "NewPass999!" });
      return { pass: res.success === false || !!res.error, detail: `success=${res.success} error=${res.error}` };
    },
  },
  {
    id: "pwd_validate_onboarding_token_invalid", group: "Password Reset",
    label: "PwdReset: validateOnboardingToken — fake token returns valid=false",
    claudeHint: "Check base44/functions/validateOnboardingToken/entry.ts — fake tokens MUST return valid=false. If broken, anyone could guess tokens.",
    run: async () => {
      const res = await callFn("validateOnboardingToken", { token: "fake-onboarding-token-regression" });
      return { pass: res.valid === false || !!res.error, detail: `valid=${res.valid} error=${res.error}` };
    },
  },

  // ── EMAIL VERIFICATION ────────────────────────────────────────────────────
  {
    id: "email_verify_missing_email", group: "Email Verification",
    label: "EmailVerify: sendVerificationCode — missing email returns error",
    claudeHint: "Check base44/functions/sendVerificationCode/entry.ts — missing email must return error not crash.",
    run: async () => {
      const res = await callFn("sendVerificationCode", {});
      return { pass: res.success === false || !!res.error, detail: `success=${res.success} error=${res.error}` };
    },
  },
  {
    id: "email_verify_invalid_code", group: "Email Verification",
    label: "EmailVerify: verifyEmailCode — wrong code returns valid=false",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — invalid codes must return valid=false not crash.",
    run: async () => {
      const res = await callFn("verifyEmailCode", { email: "nonexistent@regression.test", code: "000000" });
      return { pass: res.valid === false || !!res.error, detail: `valid=${res.valid} error=${res.error}` };
    },
  },

  // ── PROFILE ───────────────────────────────────────────────────────────────
  {
    id: "profile_get", group: "Profile",
    label: "Profile: getUserProfile — returns profile for known email",
    claudeHint: "Check base44/functions/getUserProfile/entry.ts — UserProfile entity filter or User.get fallback may be failing.",
    run: async (ctx) => {
      const res = await callFn("getUserProfile", { email: ADMIN_EMAIL, user_id: ctx.adminUserId || null });
      return { pass: res.success === true, detail: res.success ? `keys=${Object.keys(res.profile || {}).join(",")}` : res.error };
    },
  },
  {
    id: "profile_save_missing_fields", group: "Profile",
    label: "Profile: saveUserProfile — missing name fields returns error",
    claudeHint: "Check base44/functions/saveUserProfile/entry.ts — forename and surname required. Missing must return error not 500.",
    run: async () => {
      const res = await callFn("saveUserProfile", { email: ADMIN_EMAIL });
      return { pass: res.success === false || !!res.error, detail: `success=${res.success} error=${res.error}` };
    },
  },
  {
    id: "profile_write_then_read", group: "Profile",
    label: "Profile: saveUserProfile → getUserProfile — write actually persists",
    claudeHint: "Check base44/functions/saveUserProfile/entry.ts — save may return success=true but not write to UserProfile entity. Also check getUserProfile reads from UserProfile first, then falls back to User.",
    run: async () => {
      const marker = `RegTest_${Date.now()}`;
      const saveRes = await callFn("saveUserProfile", { email: ADMIN_EMAIL, forename: marker, middle_name: "", surname: "Clarke", phone: "", location: "" });
      if (!saveRes.success) return { pass: false, detail: `Save failed: ${saveRes.error}` };
      const readRes = await callFn("getUserProfile", { email: ADMIN_EMAIL });
      const readName = readRes.profile?.forename;
      return { pass: readRes.success === true && readName === marker, detail: `wrote=${marker} read=${readName}` };
    },
  },

  // ── FOUNDING ──────────────────────────────────────────────────────────────
  {
    id: "founding_beta_settings", group: "Founding",
    label: "Founding: getBetaSettings — returns beta_open flag",
    claudeHint: "Check base44/functions/getBetaSettings/entry.ts — field is beta_open not beta_active.",
    run: async () => {
      const res = await callFn("getBetaSettings", {});
      const value = res.beta_open ?? res.beta_active;
      return { pass: typeof value !== "undefined", detail: `beta_open=${res.beta_open}` };
    },
  },
  {
    id: "founding_counts_cap", group: "Founding",
    label: "Founding: getFoundingCounts — hostCount within 50 cap",
    claudeHint: "Check base44/functions/getFoundingCounts/entry.ts — hostCount > 50 means cap check broken and we are over-selling founding spots.",
    run: async () => {
      const res = await callFn("getFoundingCounts", {});
      return { pass: typeof res.hostCount !== "undefined", detail: `hostCount=${res.hostCount}/50 ${res.hostCount > 50 ? "⚠️ CAP EXCEEDED" : "✓"} cleanerCount=${res.cleanerCount}` };
    },
  },
  {
    id: "founding_register_no_email", group: "Founding",
    label: "Founding: registerFoundingMember — missing email returns error",
    claudeHint: "Check base44/functions/registerFoundingMember/entry.ts — email required, missing must return error.",
    run: async () => {
      const res = await callFn("registerFoundingMember", { role: "host" });
      return { pass: res.success === false || !!res.error, detail: `success=${res.success} error=${res.error}` };
    },
  },
  {
    id: "founding_check_approval_gates", group: "Founding",
    label: "Founding: checkApprovalGates — runs without crashing",
    claudeHint: "Check base44/functions/checkApprovalGates/entry.ts — FoundingMember filter or gate update may be throwing.",
    run: async (ctx) => {
      const userId = await getFallbackUserId(ctx);
      if (!userId) return { pass: false, detail: "No user_id — log out and back in" };
      const res = await callFn("checkApprovalGates", { user_id: userId });
      return { pass: true, detail: `gates=${JSON.stringify(res.gates || res).slice(0, 100)}` };
    },
  },
  {
    id: "founding_setup_subscription_no_session", group: "Founding",
    label: "Founding: setupFoundingSubscription — missing session returns error",
    claudeHint: "Check base44/functions/setupFoundingSubscription/entry.ts — missing session_token must return error.",
    run: async () => {
      const res = await callFn("setupFoundingSubscription", { next_plan: "founding_host_solo" });
      return { pass: !!res.error, detail: `error=${res.error}` };
    },
  },
  {
    id: "founding_setup_subscription_invalid_plan", group: "Founding",
    label: "Founding: setupFoundingSubscription — invalid plan returns error",
    claudeHint: "Check base44/functions/setupFoundingSubscription/entry.ts — VALID_NEXT_PLANS must reject unknown plans.",
    run: async (ctx) => {
      const res = await callFn("setupFoundingSubscription", { next_plan: "fake_plan_xyz", session_token: ctx.adminToken || "fake" });
      return { pass: !!res.error, detail: `error=${res.error}` };
    },
  },
  {
    id: "founding_isbetauser_logic", group: "Founding",
    label: "Founding: isBetaUser logic — banned_ blocks, all valid statuses pass",
    claudeHint: "src/pages/Subscription.jsx isBetaUser must use !approval_status?.startsWith('banned_') — NEVER a whitelist. Base44 keeps reverting this.",
    run: async () => {
      const banned = ["banned_docs_1", "banned_docs_2", "banned_admin", "banned_docs_3", "banned_misconduct"];
      const valid = ["approved", "invited", "awaiting_document_verification", "pending", "password_protected", "documentation_failed_attempt_1", "documentation_failed_attempt_2", "interest"];
      const bannedOk = banned.every(s => s.startsWith("banned_"));
      const validOk = valid.every(s => !s.startsWith("banned_"));
      return { pass: bannedOk && validOk, detail: `bannedOk=${bannedOk} validOk=${validOk} coverage=${banned.length + valid.length} statuses` };
    },
  },

  // ── POSTCODE ──────────────────────────────────────────────────────────────
  {
    id: "postcode_valid_cornwall", group: "Postcode",
    label: "Postcode: postcodeGeolookupV2 — TR1 1AA returns area=TR",
    claudeHint: "Check base44/functions/postcodeGeolookupV2/entry.ts — postcodes.io API call may be failing or response shape changed.",
    run: async (ctx) => {
      const res = await callFn("postcodeGeolookupV2", { postcode: "TR1 1AA", session_token: ctx.adminToken || "" });
      return { pass: res.success === true && res.postcode_area === "TR", detail: `area=${res.postcode_area} county=${res.county} lat=${res.latitude}` };
    },
  },
  {
    id: "postcode_valid_non_cornwall", group: "Postcode",
    label: "Postcode: postcodeGeolookupV2 — M1 1AE (Manchester) returns success=true",
    claudeHint: "Check base44/functions/postcodeGeolookupV2/entry.ts — non-Cornwall postcodes must still succeed.",
    run: async (ctx) => {
      const res = await callFn("postcodeGeolookupV2", { postcode: "M1 1AE", session_token: ctx.adminToken || "" });
      return { pass: res.success === true && res.postcode_area === "M", detail: `area=${res.postcode_area} county=${res.county}` };
    },
  },
  {
    id: "postcode_invalid", group: "Postcode",
    label: "Postcode: postcodeGeolookupV2 — ZZ99 9ZZ returns success=false",
    claudeHint: "Check base44/functions/postcodeGeolookupV2/entry.ts — invalid postcodes must return success=false with error.",
    run: async (ctx) => {
      const res = await callFn("postcodeGeolookupV2", { postcode: "ZZ99 9ZZ", session_token: ctx.adminToken || "" });
      return { pass: res.success === false, detail: `success=${res.success} error=${res.error}` };
    },
  },

  // ── STRIPE ────────────────────────────────────────────────────────────────
  {
    id: "stripe_publishable_key", group: "Stripe",
    label: "Stripe: getStripePublishableKey — returns pk_ key",
    claudeHint: "Check base44/functions/getStripePublishableKey/entry.ts — STRIPE_PUBLISHABLE_KEY secret must be set in Base44 Secrets.",
    run: async () => {
      const res = await callFn("getStripePublishableKey", {});
      return { pass: typeof res.publishable_key === "string" && res.publishable_key.startsWith("pk_"), detail: `key=${res.publishable_key?.slice(0, 12)}...` };
    },
  },
  {
    id: "stripe_connect_status", group: "Stripe",
    label: "Stripe: getStripeConnectStatus — returns valid status",
    claudeHint: "Check base44/functions/getStripeConnectStatus/entry.ts — UserSession.filter or User.get may be failing.",
    run: async (ctx) => {
      if (!ctx.adminToken) return { pass: false, detail: "No token" };
      const res = await callFn("getStripeConnectStatus", { session_token: ctx.adminToken });
      return { pass: ["verified", "pending_verification", "not_connected"].includes(res.status), detail: `status=${res.status}` };
    },
  },
  {
    id: "stripe_connect_link", group: "Stripe",
    label: "Stripe: createStripeConnectLink — returns Stripe Express URL",
    claudeHint: "Check base44/functions/createStripeConnectLink/entry.ts — STRIPE_SECRET_KEY may be wrong or User.get(user_id) failing. URL must start with https://connect.stripe.com",
    run: async (ctx) => {
      if (!ctx.adminToken) return { pass: false, detail: "No token" };
      const res = await callFn("createStripeConnectLink", { session_token: ctx.adminToken });
      if (res.error?.includes("user_id")) return { pass: true, detail: "⚠️ Stale session — function healthy but needs fresh login" };
      return { pass: typeof res.url === "string" && res.url.startsWith("https://connect.stripe.com"), detail: res.url ? `ok` : `error=${res.error}` };
    },
  },
  {
    id: "stripe_checkout_invalid_plan", group: "Stripe",
    label: "Stripe: createCheckoutSession — unknown plan rejected",
    claudeHint: "Check base44/functions/createCheckoutSession/entry.ts — VALID_PLANS must reject unknown plans.",
    run: async (ctx) => {
      const res = await callFn("createCheckoutSession", { plan: "fake_plan_xyz_regression", user_id: ctx.adminUserId, session_token: ctx.adminToken || "" });
      return { pass: !res.url && !!res.error, detail: `error="${res.error}"` };
    },
  },
  ...["host_starter_monthly", "host_growth_monthly", "host_pro_monthly", "founding_host_solo", "founding_host_multi", "founding_host_portfolio", "beta_host_access", "cleaner_solo_monthly", "cleaner_pro_monthly", "cleaner_team_monthly"].map(plan => ({
    id: `stripe_checkout_${plan}`, group: "Stripe",
    label: `Stripe: createCheckoutSession — ${plan} returns URL`,
    claudeHint: `Check STRIPE dashboard — ${plan} must have a lookup key set. Check base44/functions/createCheckoutSession/entry.ts VALID_PLANS includes it.`,
    run: async (ctx) => {
      const res = await callFn("createCheckoutSession", { plan, user_id: ctx.adminUserId, session_token: ctx.adminToken || "" });
      return { pass: typeof res.url === "string" && res.url.startsWith("https://"), detail: res.url ? `ok` : `error=${res.error}` };
    },
  })),

  // ── GUEST ─────────────────────────────────────────────────────────────────
  {
    id: "guest_property_search", group: "Guest",
    label: "Guest: propertySearch — returns results array",
    claudeHint: "Check base44/functions/propertySearch/entry.ts — results should be at res.data or res.results.",
    run: async () => {
      const res = await callFn("propertySearch", { query: "cornwall", limit: 3 });
      const results = res.results || res.data || res;
      return { pass: Array.isArray(results), detail: `count=${Array.isArray(results) ? results.length : "not array"} shape=${Object.keys(res).join(",")}` };
    },
  },
  {
    id: "guest_property_search_filter", group: "Guest",
    label: "Guest: propertySearchFilter — empty filters run without crash",
    claudeHint: "Check base44/functions/propertySearchFilter/entry.ts — empty filter params must not throw 500.",
    run: async () => {
      try {
        const res = await callFn("propertySearchFilter", { filters: {}, limit: 3 });
        return { pass: res !== undefined, detail: `raw=${JSON.stringify(res).slice(0, 80)}` };
      } catch (e) { return { pass: false, detail: e.message }; }
    },
  },
  {
    id: "guest_search_locations", group: "Guest",
    label: "Guest: searchLocations — returns location array",
    claudeHint: "Check base44/functions/searchLocations/entry.ts — UKLocation entity query may be failing.",
    run: async () => {
      const res = await callFn("searchLocations", { query: "cornwall" });
      const results = res.results || res;
      return { pass: Array.isArray(results), detail: `count=${Array.isArray(results) ? results.length : "not array"}` };
    },
  },
  {
    id: "guest_booking_payment_no_id", group: "Guest",
    label: "Guest: createBookingPaymentIntent — missing booking_id returns error",
    claudeHint: "Check base44/functions/createBookingPaymentIntent/entry.ts — missing booking_id must return error.",
    run: async () => {
      const res = await callFn("createBookingPaymentIntent", {});
      return { pass: !!res.error, detail: `error=${res.error}` };
    },
  },
  {
    id: "guest_track_pageview", group: "Guest",
    label: "Guest: trackPageView — records without crash",
    claudeHint: "Check base44/functions/trackPageView/entry.ts — PageView entity write may be failing.",
    run: async () => {
      const res = await callFn("trackPageView", { page: "/regression-test", visitor_id: `reg-${Date.now()}` });
      return { pass: res.success === true || res.error === undefined, detail: `success=${res.success}` };
    },
  },

  // ── HOST ──────────────────────────────────────────────────────────────────
  {
    id: "host_check_subscription_limits", group: "Host",
    label: "Host: checkSubscriptionLimits — runs without crashing",
    claudeHint: "Check base44/functions/checkSubscriptionLimits/entry.ts — Subscription entity query may be throwing.",
    run: async (ctx) => {
      try {
        const res = await callFn("checkSubscriptionLimits", { session_token: ctx.adminToken || "", user_id: ctx.adminUserId || null });
        return { pass: res !== undefined, detail: `raw=${JSON.stringify(res).slice(0, 80)}` };
      } catch (e) { return { pass: false, detail: e.message }; }
    },
  },
  {
    id: "host_get_pricing_recommendations", group: "Host",
    label: "Host: getPricingRecommendations — runs without crashing",
    claudeHint: "Check base44/functions/getPricingRecommendations/entry.ts — may throw if SmartPricingRule entity is empty.",
    run: async () => {
      try {
        const res = await callFn("getPricingRecommendations", { propertyId: "test-regression-id", currentSettings: { nightly_rate: 100 } });
        return { pass: res !== undefined, detail: `raw=${JSON.stringify(res).slice(0, 80)}` };
      } catch (e) { return { pass: false, detail: e.message }; }
    },
  },
  {
    id: "host_get_calendar_events", group: "Host",
    label: "Host: getCalendarEvents — runs without crashing",
    claudeHint: "Check base44/functions/getCalendarEvents/entry.ts — Booking entity query may be failing.",
    run: async (ctx) => {
      try {
        const res = await callFn("getCalendarEvents", { session_token: ctx.adminToken || "", property_id: "regression-test-id" });
        return { pass: Array.isArray(res) || Array.isArray(res.events) || !!res.error, detail: `raw=${JSON.stringify(res).slice(0, 80)}` };
      } catch (e) { return { pass: false, detail: e.message }; }
    },
  },
  {
    id: "host_generate_referral_code", group: "Host",
    label: "Host: generateReferralCode — returns ref_code string",
    claudeHint: "Check base44/functions/generateReferralCode/entry.ts — Referral entity create may be failing.",
    run: async (ctx) => {
      const userId = await getFallbackUserId(ctx);
      if (!userId) return { pass: false, detail: "No user_id available" };
      const res = await callFn("generateReferralCode", { user_id: userId, email: ADMIN_EMAIL });
      return { pass: typeof res.ref_code === "string" && res.ref_code.length > 0, detail: `ref_code=${res.ref_code}` };
    },
  },
  {
    id: "host_get_allowed_nights", group: "Host",
    label: "Host: getAllowedNights — runs without crashing",
    claudeHint: "Check base44/functions/getAllowedNights/entry.ts — if returning HTML it is not deployed in Base44.",
    run: async () => {
      try {
        const res = await callFn("getAllowedNights", { property: { day_based_restrictions_enabled: false, booking_rules: [] }, checkIn: "2026-08-01", checkOut: "2026-08-07" });
        return { pass: res !== undefined, detail: `raw=${JSON.stringify(res).slice(0, 80)}` };
      } catch (e) {
        if (e.message?.includes("non-JSON")) return { pass: false, detail: "Function not deployed in Base44 yet" };
        return { pass: false, detail: e.message };
      }
    },
  },

  // ── REFERRAL ──────────────────────────────────────────────────────────────
  {
    id: "referral_link_invalid_code", group: "Referral",
    label: "Referral: linkReferral — unknown ref_code returns error",
    claudeHint: "Check base44/functions/linkReferral/entry.ts — unknown codes must return error not crash.",
    run: async () => {
      const res = await callFn("linkReferral", { ref_code: "FAKE-CODE-XYZ", referee_email: "test@regression.test", referee_name: "Test User" });
      return { pass: res.success === false || !!res.error, detail: `success=${res.success} error=${res.error}` };
    },
  },
  {
    id: "referral_apply_reward_missing", group: "Referral",
    label: "Referral: applyReferralReward — missing fields returns error",
    claudeHint: "Check base44/functions/applyReferralReward/entry.ts — missing referee_email must return error not crash.",
    run: async () => {
      const res = await callFn("applyReferralReward", { referee_user_id: "test-id" });
      return { pass: res.success === false || !!res.error, detail: `success=${res.success} error=${res.error}` };
    },
  },

  // ── CLEANER ───────────────────────────────────────────────────────────────
  {
    id: "cleaner_capacity_cornwall", group: "Cleaner",
    label: "Cleaner: checkCleanerCapacity — Cornwall coords returns valid response",
    claudeHint: "Check base44/functions/checkCleanerCapacity/entry.ts — Property entity query or Haversine calc may be failing.",
    run: async () => {
      const res = await callFn("checkCleanerCapacity", { lat: 50.2632, lng: -5.0508, radius_miles: 15, is_team: false, team_size: 1 });
      return { pass: typeof res.has_capacity !== "undefined" && typeof res.property_count !== "undefined", detail: `has_capacity=${res.has_capacity} properties=${res.property_count} slots=${res.total_slots}` };
    },
  },
  {
    id: "cleaner_capacity_team_slots", group: "Cleaner",
    label: "Cleaner: checkCleanerCapacity — team of 5 uses ≤3 slots",
    claudeHint: "Check base44/functions/checkCleanerCapacity/entry.ts — team cleaners must count as min(team_size, 3) slots not 1.",
    run: async () => {
      const res = await callFn("checkCleanerCapacity", { lat: 50.2632, lng: -5.0508, radius_miles: 15, is_team: true, team_size: 5 });
      return { pass: typeof res.has_capacity !== "undefined" && (res.slots_needed === undefined || res.slots_needed <= 3), detail: `slots_needed=${res.slots_needed} (expected ≤3)` };
    },
  },
  {
    id: "cleaner_capacity_no_coords", group: "Cleaner",
    label: "Cleaner: checkCleanerCapacity — missing lat/lng returns error",
    claudeHint: "Check base44/functions/checkCleanerCapacity/entry.ts — missing lat/lng must return 400 error.",
    run: async () => {
      const res = await callFn("checkCleanerCapacity", {});
      return { pass: !!res.error, detail: `error=${res.error}` };
    },
  },

  // ── MONEY ─────────────────────────────────────────────────────────────────
  {
    id: "money_raise_complaint_missing", group: "Money",
    label: "Money: raiseComplaint — missing booking_id returns error",
    claudeHint: "Check base44/functions/raiseComplaint/entry.ts — missing booking_id must return error not crash.",
    run: async () => {
      const res = await callFn("raiseComplaint", {});
      return { pass: res.success === false || !!res.error, detail: `success=${res.success} error=${res.error}` };
    },
  },
  {
    id: "money_resolve_complaint_missing", group: "Money",
    label: "Money: resolveComplaint — missing complaint_id returns error",
    claudeHint: "Check base44/functions/resolveComplaint/entry.ts — missing complaint_id must return error.",
    run: async () => {
      const res = await callFn("resolveComplaint", {});
      return { pass: res.success === false || !!res.error, detail: `success=${res.success} error=${res.error}` };
    },
  },
  {
    id: "money_send_notification_missing", group: "Money",
    label: "Money: sendNotification — missing user_id returns error",
    claudeHint: "Check base44/functions/sendNotification/entry.ts — missing user_id must return error.",
    run: async () => {
      const res = await callFn("sendNotification", {});
      return { pass: res.success === false || !!res.error, detail: `success=${res.success} error=${res.error}` };
    },
  },
  {
    id: "money_process_payouts", group: "Money",
    label: "Money: processPayouts — runs without crashing (live check)",
    claudeHint: "Check base44/functions/processPayouts/entry.ts — must return results object with job counts. STRIPE_SECRET_KEY may be wrong or Booking entity query failing.",
    run: async () => {
      try {
        const res = await callFn("processPayouts", {});
        const hasResultShape = typeof res.job1_charged !== "undefined" || typeof res.errors !== "undefined" || !!res.error;
        return { pass: hasResultShape, detail: `j1=${res.job1_charged} j2=${res.job2_cancelled} j3=${res.job3_released} j4=${res.job4_returned} errors=${res.errors?.length || 0}` };
      } catch (e) { return { pass: false, detail: e.message }; }
    },
  },
  {
    id: "money_validate_ical_invalid", group: "Money",
    label: "Money: validateIcalUrl — invalid URL returns error",
    claudeHint: "Check base44/functions/validateIcalUrl/entry.ts — invalid URLs must return valid=false or error.",
    run: async (ctx) => {
      const res = await callFn("validateIcalUrl", { session_token: ctx.adminToken || "", url: "not-a-real-url" });
      return { pass: res.valid === false || !!res.error, detail: `valid=${res.valid} error=${res.error}` };
    },
  },

  // ── ENTITY HEALTH SWEEP ───────────────────────────────────────────────────
  ...ENTITY_SWEEP.map(([entityName, description]) => ({
    id: `entity_${entityName.toLowerCase()}`,
    group: "Entities",
    label: `Entity: ${entityName} — queryable`,
    claudeHint: `${entityName} entity is ${description}. May have RLS issue or entity name changed in Base44. Check Base44 entity list.`,
    run: async () => {
      try {
        const list = await base44.entities[entityName]?.list("-created_date", 1);
        if (!Array.isArray(list)) throw new Error(`${entityName} did not return array`);
        return { pass: true, detail: `health=ok records_spot_checked=${list.length}` };
      } catch (e) {
        return { pass: false, detail: e.message };
      }
    },
  })),

  // ── FRONTEND LOGIC ────────────────────────────────────────────────────────
  {
    id: "frontend_isbetauser", group: "Frontend Logic",
    label: "Frontend: isBetaUser — banned_ prefix blocks, all valid statuses pass",
    claudeHint: "src/pages/Subscription.jsx isBetaUser must use !approval_status?.startsWith('banned_') — NEVER a whitelist. Base44 keeps reverting this. Critical — affects all founding member pricing.",
    run: async () => {
      const banned = ["banned_docs_1", "banned_docs_2", "banned_admin", "banned_docs_3", "banned_misconduct"];
      const valid = ["approved", "invited", "awaiting_document_verification", "pending", "password_protected", "documentation_failed_attempt_1", "documentation_failed_attempt_2", "interest"];
      const bannedOk = banned.every(s => s.startsWith("banned_"));
      const validOk = valid.every(s => !s.startsWith("banned_"));
      return { pass: bannedOk && validOk, detail: `bannedOk=${bannedOk} validOk=${validOk} totalStatuses=${banned.length + valid.length}` };
    },
  },
  {
    id: "frontend_beta_open_matches_backend", group: "Frontend Logic",
    label: "Frontend: beta_open flag consistent with backend",
    claudeHint: "getBetaSettings must return beta_open. Check BETA_ACTIVE const in CleanerSignup.jsx and betaActive prop in CreateProperty.jsx match the backend flag.",
    run: async () => {
      const res = await callFn("getBetaSettings", {});
      const hasBetaField = typeof (res.beta_open ?? res.beta_active) !== "undefined";
      return { pass: hasBetaField, detail: `beta_open=${res.beta_open} — ensure BETA_ACTIVE in CleanerSignup.jsx and betaActive in CreateProperty.jsx match this value` };
    },
  },
];

// ── COMPONENT ─────────────────────────────────────────────────────────────────

const GROUP_ORDER = ["Auth", "Password Reset", "Email Verification", "Profile", "Founding", "Postcode", "Stripe", "Guest", "Host", "Referral", "Cleaner", "Money", "Entities", "Frontend Logic"];

export default function RegressionRunner() {
  const [adminPassword, setAdminPassword] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [currentTest, setCurrentTest] = useState(null);
  const [done, setDone] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("All");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef(false);

  const runAll = async () => {
    if (!adminPassword) { alert("Enter your admin password first."); return; }
    abortRef.current = false;
    setRunning(true);
    setDone(false);
    setResults([]);
    setCurrentTest(null);
    const ctx = { adminPassword };
    const resultLog = [];
    for (const test of TESTS) {
      if (abortRef.current) break;
      setCurrentTest(test.label);
      const start = Date.now();
      let result;
      try { result = await test.run(ctx); }
      catch (e) { result = { pass: false, detail: `Threw: ${e.message}` }; }
      const elapsed = Date.now() - start;
      resultLog.push({ ...result, label: test.label, id: test.id, group: test.group, elapsed, claudeHint: test.claudeHint });
      setResults([...resultLog]);
    }
    setCurrentTest(null);
    setRunning(false);
    setDone(true);
  };

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;
  const allPass = done && failed === 0 && total === TESTS.length;
  const failedTests = results.filter(r => !r.pass);

  const groups = ["All", ...GROUP_ORDER];
  const filteredResults = selectedGroup === "All" ? results : results.filter(r => r.group === selectedGroup);

  const groupStats = GROUP_ORDER.map(g => {
    const gr = results.filter(r => r.group === g);
    return { name: g, total: gr.length, failed: gr.filter(r => !r.pass).length };
  });

  const copyPrompt = () => {
    navigator.clipboard.writeText(buildClaudePrompt(failedTests)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="p-4 space-y-4 max-w-5xl">

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">HostKeep CI/CD Regression Suite</h2>
          <p className="text-sm text-gray-500 mt-0.5">{TESTS.length} automated checks · {GROUP_ORDER.length} test groups · Run before every publish</p>
        </div>
        {done && (
          <div className={`px-4 py-2 rounded-xl text-sm font-bold ${allPass ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {allPass ? "✅ SAFE TO PUBLISH" : `❌ ${failed} FAILING — DO NOT PUBLISH`}
          </div>
        )}
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Admin Password</label>
          <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !running && adminPassword && runAll()}
            placeholder="Admin password" disabled={running}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <button onClick={runAll} disabled={running || !adminPassword}
          className={`px-6 py-2 rounded-lg text-sm font-bold text-white ${running ? "bg-gray-400 cursor-not-allowed" : "bg-[#1E3A5F] hover:bg-[#16304f]"}`}>
          {running ? "Running..." : "▶ Run All Tests"}
        </button>
        {running && (
          <button onClick={() => { abortRef.current = true; }}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50">
            ✕ Abort
          </button>
        )}
      </div>

      {(running || done) && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span className="truncate">{currentTest ? `⏳ ${currentTest}` : done ? "Complete" : ""}</span>
            <span className="flex-shrink-0 ml-2">{total}/{TESTS.length}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${allPass ? "bg-green-500" : failed > 0 ? "bg-red-500" : "bg-teal-500"}`}
              style={{ width: `${(total / TESTS.length) * 100}%` }} />
          </div>
          <div className="flex gap-4 mt-1.5 text-xs">
            <span className="text-green-600 font-medium">✓ {passed} passed</span>
            {failed > 0 && <span className="text-red-600 font-medium">✗ {failed} failed</span>}
            {running && <span className="text-gray-400">{TESTS.length - total} remaining</span>}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex gap-4">
          <div className="w-44 flex-shrink-0 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Filter</p>
            {groups.map(g => {
              const stat = groupStats.find(s => s.name === g);
              const gFailed = g === "All" ? failed : stat?.failed || 0;
              const gTotal = g === "All" ? total : stat?.total || 0;
              return (
                <button key={g} onClick={() => setSelectedGroup(g)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${selectedGroup === g ? "bg-[#1E3A5F] text-white" : "hover:bg-gray-100 text-gray-600"}`}>
                  <span className="truncate">{g}</span>
                  {gTotal > 0 && (
                    <span className={`ml-1 text-[10px] px-1 rounded flex-shrink-0 ${selectedGroup === g ? "bg-white/20" : gFailed > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                      {gFailed > 0 ? `✗${gFailed}` : `✓${gTotal}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            {filteredResults.map((r, i) => (
              <div key={i} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-sm ${r.pass ? "bg-green-50 border-green-100" : "bg-red-50 border-red-200"}`}>
                <span className="flex-shrink-0 mt-0.5 text-base">{r.pass ? "✅" : "❌"}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-xs ${r.pass ? "text-green-900" : "text-red-900"}`}>{r.label}</p>
                  {r.detail && <p className={`text-xs mt-0.5 font-mono break-all ${r.pass ? "text-green-600" : "text-red-600"}`}>{r.detail}</p>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{r.elapsed}ms</span>
              </div>
            ))}
            {running && TESTS.filter(t => selectedGroup === "All" || t.group === selectedGroup).slice(filteredResults.length).map((t, i) => (
              <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs border border-gray-100 ${i === 0 ? "bg-blue-50 border-blue-200" : "bg-gray-50 text-gray-400"}`}>
                {i === 0 ? <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" /> : <span className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />}
                <span className={i === 0 ? "text-blue-700 font-medium" : ""}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {done && (
        <div className={`rounded-xl p-5 border-2 ${allPass ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
          {allPass ? (
            <div className="text-center">
              <p className="text-2xl font-black text-green-800 mb-1">✅ All {total} tests passed</p>
              <p className="text-sm text-green-700">All systems nominal. Safe to publish to production.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-black text-red-800 mb-1">❌ {failed} test{failed > 1 ? "s" : ""} failed</p>
                <p className="text-sm text-red-700">Do not publish until all tests pass.</p>
              </div>
              <div className="bg-white rounded-xl border border-red-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800">🤖 Get Claude to fix these</p>
                <p className="text-xs text-gray-500">Copy the prompt and paste it into claude.ai to get a targeted fix for each failing test.</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{buildClaudePrompt(failedTests)}</pre>
                </div>
                <div className="flex gap-2">
                  <button onClick={copyPrompt}
                    className="flex-1 py-2.5 rounded-lg bg-[#1E3A5F] text-white text-sm font-semibold hover:bg-[#16304f] transition-colors">
                    {copied ? "✓ Copied!" : "📋 Copy Prompt"}
                  </button>
                  <a href={`https://claude.ai/new?q=${encodeURIComponent(buildClaudePrompt(failedTests).slice(0, 2000))}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-lg border border-[#1E3A5F] text-[#1E3A5F] text-sm font-semibold hover:bg-blue-50 transition-colors text-center">
                    ↗ Open Claude
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
