import { Link } from "react-router-dom";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function CleanerApprovalBanner({ cleanerProfile, user }) {
  const isVerified = cleanerProfile?.verified === true;
  const isStripeVerified = user?.stripe_connect_status === "verified";
  const isSubscribed = cleanerProfile?.subscription_status === "active";

  const allComplete = isVerified && isStripeVerified && isSubscribed;
  if (allComplete) return null;

  const steps = [
    {
      done: isVerified,
      label: "Identity verified by admin",
      cta: "Submit documents",
      href: "/CleanerVerification",
    },
    {
      done: isStripeVerified,
      label: "Bank account connected via Stripe",
      cta: "Connect bank account",
      href: "/Settings",
    },
    {
      done: isSubscribed,
      label: "Active CleanKeep subscription",
      cta: "Choose a plan",
      href: `/CleanerSubscriptionPay?id=${cleanerProfile?.id}&plan=basic`,
    },
  ];

  const incomplete = steps.filter((s) => !s.done);

  return (
    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-teal-700 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-teal-900 mb-2">
            Complete your profile setup to appear in the marketplace and accept jobs
          </p>
          <ul className="space-y-1.5">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center gap-2 text-sm">
                {step.done ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <span className="text-teal-700">{step.label}</span>
                  </>
                ) : (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-teal-400 flex-shrink-0" />
                    <span className="text-teal-800">
                      {step.label} —{" "}
                      <Link
                        to={step.href}
                        className="font-medium underline underline-offset-2 hover:text-teal-900"
                      >
                        {step.cta} →
                      </Link>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Export a helper so the dashboard can gate Accept buttons
export function useCleanerGatesComplete(cleanerProfile, user) {
  return (
    cleanerProfile?.verified === true &&
    user?.stripe_connect_status === "verified" &&
    cleanerProfile?.subscription_status === "active"
  );
}