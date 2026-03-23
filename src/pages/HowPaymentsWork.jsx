import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, CheckCircle, Clock, PoundSterling, Shield, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function HowPaymentsWork() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to={createPageUrl("HostDashboard")} className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">How Payments Work</h1>
        <p className="text-gray-500 mb-10">Everything you need to know about receiving payments from guests.</p>

        {/* Setting Up Stripe */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-teal-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Setting Up Your Stripe Account</h2>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <p className="text-gray-600 leading-relaxed">
                Before you can receive payments from guests, you need to connect your bank account through <strong>Stripe</strong> — the world's most trusted payment processor. This is a one-time setup that takes about 5 minutes.
              </p>
              <div className="space-y-3 mt-4">
                {[
                  { step: "1", text: "Click Connect with Stripe in your dashboard" },
                  { step: "2", text: "Enter your personal details and bank account details" },
                  { step: "3", text: "Stripe verifies your identity — usually 1–2 business days" },
                  { step: "4", text: "Once verified, your property is ready to accept bookings" },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {step}
                    </div>
                    <p className="text-gray-700 pt-1">{text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* How Guest Payments Work */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">How Guest Payments Work</h2>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <p className="text-gray-600 leading-relaxed">
                When a guest books your property, their payment is held securely by Stripe. <strong>24 hours after the guest checks in</strong>, the full booking amount is automatically transferred to your bank account.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Payment Timeline</p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  {[
                    "Guest books",
                    "Payment held by Stripe",
                    "Guest checks in",
                    "24 hours later",
                    "Funds transferred to your bank",
                    "Allow 1–2 business days for bank processing",
                  ].map((step, i, arr) => (
                    <span key={i} className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium">{step}</span>
                      {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* What You Receive */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <PoundSterling className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">What You Receive</h2>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <p className="text-gray-600 leading-relaxed">
                <strong>HostKeep takes 0% commission.</strong> The only deduction is Stripe's standard card processing fee of <strong>1.4% + 20p per transaction</strong>. This goes directly to Stripe — not to HostKeep.
              </p>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 mt-2">
                <p className="text-sm font-semibold text-gray-700 mb-3">Example on a £300 booking</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Booking total</span>
                    <span className="font-medium text-gray-900">£300.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stripe fee (1.4% + 20p)</span>
                    <span className="font-medium text-red-600">−£4.40</span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-200 pt-2 mt-2">
                    <span className="font-semibold text-gray-900">You receive</span>
                    <span className="font-bold text-emerald-700 text-base">£295.60</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">HostKeep commission</span>
                    <span className="font-bold text-emerald-600">£0.00</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Support */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-violet-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Support</h2>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-3 text-gray-600">
                <p>
                  For Stripe account issues, visit{" "}
                  <a href="https://support.stripe.com" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-medium">
                    support.stripe.com
                  </a>
                </p>
                <p>
                  For HostKeep account issues, contact{" "}
                  <a href="mailto:Hello@hostkeepdigital.co.uk" className="text-teal-600 hover:underline font-medium">
                    Hello@hostkeepdigital.co.uk
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}