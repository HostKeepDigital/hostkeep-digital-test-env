// functions/validateAccess.ts
// Base44 route access control

import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // PUBLIC ROUTES
    const PUBLIC_PATHS = [
      "/",
      "/Home",
      "/SignIn",
      "/ForgotPassword",
      "/CreatePassword",
      "/ResetPassword",
      "/founding",
      "/waitlist",
      "/pending",
      "/Subscription",
      "/AboutUs",
      "/LegalCentre",
      "/TermsAndConditions",
      "/PrivacyPolicy",
      "/CookiePolicy",
      "/GuestTerms",
      "/HostTerms",
      "/CleanerTerms",
      "/DisputePolicy",
      "/PaymentPolicy",
      "/RefundPolicy",
      "/Accessibility",
      "/BecomeHost",
      "/BecomeCleaner",
      "/Search",
      "/PropertyDetails",
      "/Pay",

      // Onboarding validator must be public
      "/functions/validateOnboardingToken"
    ];

    // Allow wildcard for CreatePassword?token=...
    if (path.startsWith("/CreatePassword")) {
      return Response.json({ allowed: true });
    }

    // Explicit public paths
    if (PUBLIC_PATHS.includes(path)) {
      return Response.json({ allowed: true });
    }

    // PROTECTED ROUTES
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.id) {
      return Response.json(
        { allowed: false, reason: "auth_required" },
        { status: 401 }
      );
    }

    return Response.json({ allowed: true });

  } catch (err) {
    console.error("validateAccess error:", err);
    return Response.json(
      { allowed: false, reason: "server_error" },
      { status: 500 }
    );
  }
});