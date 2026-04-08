import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, CheckCircle, Clock, PoundSterling, Shield, ArrowRight, User, Building2, CreditCard, FileText, Banknote, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function HowPaymentsWork() {
  const location = useLocation();
  const isCleaner = new URLSearchParams(location.search).get("role") === "cleaner";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          to={createPageUrl(isCleaner ? "CleanerDashboard" : "HostDashboard")}
          className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">How Payments Work</h1>
        <p className="text-gray-500 mb-10">
          {isCleaner
            ? "Everything you need to know about receiving payments for cleaning jobs."
            : "Everything you need to know about receiving payments from guests."}
        </p>

        {/* ── STRIPE SETUP GUIDE ── */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-teal-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">How to Set Up Your Stripe Account</h2>
          </div>

          <Card className="border-0 shadow-sm mb-4">
            <CardContent className="p-6">
              <p className="text-gray-600 leading-relaxed mb-6">
                Before you can receive payments, you need to connect your bank account through <strong>Stripe</strong> — the world's most trusted payment processor. This is a one-time setup that takes around <strong>5–10 minutes</strong>. Here's exactly what you'll need to fill in:
              </p>

              {/* Step 1 */}
              <div className="flex gap-4 mb-6">
                <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-teal-600" />
                    <h3 className="font-semibold text-gray-900">Personal Details</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Stripe uses this to verify your identity. Have these ready:</p>
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    {["Full legal name (as on your bank account)", "Date of birth", "Home address", "Email address", "Mobile phone number"].map(f => (
                      <li key={f} className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />{f}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 mb-6">
                <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <h3 className="font-semibold text-gray-900">Identity Verification</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Stripe will ask you to verify your identity. You'll need one of:</p>
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    {["UK Passport", "UK Driving Licence (photo card)", "National Identity Card"].map(f => (
                      <li key={f} className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-400 mt-2">You may be asked to take a photo or upload a scan of the document.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 mb-6">
                <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-teal-600" />
                    <h3 className="font-semibold text-gray-900">Business / Account Type</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Choose the option that best describes you:</p>
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    {[
                      "Individual — if you're renting as a private person",
                      "Sole trader — if you run a small property or cleaning business",
                      "Limited company — if registered at Companies House",
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mt-3 flex gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">If registering as a sole trader or company, Stripe may ask for your UTR number or Companies House registration number.</p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4 mb-6">
                <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">4</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="w-4 h-4 text-teal-600" />
                    <h3 className="font-semibold text-gray-900">Bank Account Details</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">This is where your earnings will be paid. You'll need:</p>
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    {["UK bank account holder name", "Sort code (6 digits)", "Account number (8 digits)"].map(f => (
                      <li key={f} className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-400 mt-2">The account must be in your name (or your business name). Stripe does not support PayPal or prepaid cards.</p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4">
                <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">5</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-teal-600" />
                    <h3 className="font-semibold text-gray-900">Review & Submit</h3>
                  </div>
                  <p className="text-sm text-gray-600">Once submitted, Stripe will verify your details — this usually takes <strong>1–2 business days</strong>. You'll get an email when you're approved. After that, you're ready to accept payments.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="bg-teal-600 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div>
              <p className="font-semibold text-lg">Ready to connect?</p>
              <p className="text-teal-100 text-sm mt-1">Head to your dashboard to start the Stripe onboarding.</p>
            </div>
            <Link
              to={createPageUrl(isCleaner ? "CleanerDashboard" : "HostDashboard")}
              className="flex-shrink-0 bg-white text-teal-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-teal-50 transition-colors"
            >
              Go to Dashboard →
            </Link>
          </div>
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