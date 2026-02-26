import LegalNavigation from "@/components/legal/LegalNavigation";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto flex">
        <div className="hidden lg:block w-64">
          <LegalNavigation currentPage="RefundPolicy" />
        </div>
        
        <div className="flex-1 px-4 py-12 md:px-8">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm text-gray-500 mb-2">Last Updated: February 2026</p>
            <h1 className="text-4xl font-bold text-gray-900 mb-8">Refund Policy</h1>

            <div className="space-y-8">
              {/* Introduction */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <p className="text-gray-700 leading-relaxed">
                  This Refund Policy explains how refunds are handled on the HostKeep platform ("Platform"), operated by HostKeep Digital Ltd ("HostKeep", "we", "us", "our"). This Policy should be read together with our Terms & Conditions, Payment Policy, and Dispute Policy.
                </p>
                <p className="text-gray-700 leading-relaxed mt-4">
                  By using the Platform, you agree to the terms set out in this Refund Policy.
                </p>
              </section>

              {/* 1. Platform Role in Refunds */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Platform Role in Refunds</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    1.1 HostKeep provides digital infrastructure only and does not supply accommodation or cleaning services.
                  </p>
                  
                  <div>
                    <p className="text-gray-700 mb-2">1.2 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Issue refunds for accommodation bookings</li>
                      <li>Issue refunds for cleaning services</li>
                      <li>Determine refund eligibility between Users</li>
                      <li>Intervene in User-to-User refund negotiations</li>
                      <li>Hold or control User funds</li>
                      <li>Process payments or refunds directly</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    1.3 All payment processing and refund mechanisms are handled exclusively by Stripe, the third-party payment provider.
                  </p>
                </div>
              </section>

              {/* 2. Subscription Refunds */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Subscription Refunds (HostKeep Fees)</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    2.1 HostKeep operates a subscription-based SaaS model.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">2.2 Subscription fees provide access to:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Marketplace visibility</li>
                      <li>Communication tools</li>
                      <li>Listing management</li>
                      <li>Platform functionality</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    2.3 Subscription fees are non-refundable, except where required by law.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">2.4 You may cancel your subscription at any time, but:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Cancellation does not entitle you to a refund for the current billing period</li>
                      <li>Access will continue until the end of the paid period</li>
                      <li>No pro-rata refunds are issued</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">2.5 If you believe you have been incorrectly charged, contact us at:</p>
                    <p className="text-gray-700 ml-4">admin@hostkeepdigital.co.uk</p>
                    <p className="text-gray-700 mt-2">
                      HostKeep will review the matter but is not obligated to issue refunds unless legally required.
                    </p>
                  </div>
                </div>
              </section>

              {/* 3. Refunds for Accommodation Bookings */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Refunds for Accommodation Bookings</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    3.1 Refunds relating to accommodation bookings are the responsibility of the Host and Guest, not HostKeep.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">3.2 Hosts may set their own cancellation and refund policies, provided they comply with:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>UK consumer protection law</li>
                      <li>Local property regulations</li>
                      <li>Platform rules</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">3.3 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Enforce Host refund policies</li>
                      <li>Adjudicate refund disputes</li>
                      <li>Issue refunds on behalf of Hosts</li>
                      <li>Guarantee any refund outcome</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">3.4 Refunds for accommodation bookings are processed by Stripe, subject to:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Host approval</li>
                      <li>Stripe's refund rules</li>
                      <li>Card network rules</li>
                      <li>Fraud and risk assessments</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 4. Refunds for Cleaning Services */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Refunds for Cleaning Services</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    4.1 Refunds relating to cleaning services are the responsibility of the Host and Cleaner, not HostKeep.
                  </p>

                  <p className="text-gray-700">
                    4.2 Cleaners may set their own cancellation and refund policies.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">4.3 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Issue refunds for cleaning services</li>
                      <li>Determine whether a refund is appropriate</li>
                      <li>Intervene in quality disputes</li>
                      <li>Guarantee any refund outcome</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">4.4 Refunds for cleaning services are processed by Stripe, subject to:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Cleaner approval</li>
                      <li>Stripe's refund rules</li>
                      <li>Card network rules</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 5. Chargebacks */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Chargebacks</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    5.1 Chargebacks are handled exclusively by Stripe and the card networks.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">5.2 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Decide chargeback outcomes</li>
                      <li>Provide evidence on behalf of Users</li>
                      <li>Reimburse Users for chargeback losses</li>
                      <li>Intervene in chargeback disputes</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">5.3 Users are responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Responding to Stripe's evidence requests</li>
                      <li>Providing documentation</li>
                      <li>Complying with Stripe's deadlines</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    5.4 Stripe's decision is final and binding.
                  </p>
                </div>
              </section>

              {/* 6. Disputes Between Users */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Disputes Between Users</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    6.1 Refund-related disputes between Users (e.g., Host vs Guest, Host vs Cleaner) must be resolved directly between the Users.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">
                      6.2 HostKeep may, at its discretion, offer optional mediation, but:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Mediation is non-binding</li>
                      <li>HostKeep does not issue judgments</li>
                      <li>HostKeep does not enforce outcomes</li>
                      <li>HostKeep does not guarantee results</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    6.3 HostKeep may request Stripe to temporarily hold funds while a dispute is reviewed.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">6.4 HostKeep is not liable for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Losses arising from disputes</li>
                      <li>Dissatisfaction with services</li>
                      <li>Property damage</li>
                      <li>Cancellations</li>
                      <li>Refund refusals</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 7. Refund Processing Times */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Refund Processing Times</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">7.1 Refund processing times depend on:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Stripe's internal processes</li>
                      <li>Card network rules</li>
                      <li>Bank processing times</li>
                      <li>Weekends and bank holidays</li>
                      <li>Fraud or risk reviews</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    7.2 HostKeep is not responsible for delays in refund processing.
                  </p>
                </div>
              </section>

              {/* 8. Fraud Prevention and AML Compliance */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Fraud Prevention and AML Compliance</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">8.1 Stripe may delay or refuse refunds to comply with:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Proceeds of Crime Act 2002</li>
                      <li>Money Laundering Regulations (UK)</li>
                      <li>Card network rules</li>
                      <li>Internal fraud policies</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    8.2 HostKeep does not perform regulated AML functions.
                  </p>
                </div>
              </section>

              {/* 9. HostKeep's Liability for Refunds */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. HostKeep's Liability for Refunds</h2>
                
                <p className="text-gray-700 mb-4">
                  To the maximum extent permitted by UK law, HostKeep is not liable for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Refund failures</li>
                  <li>Refund delays</li>
                  <li>Chargebacks</li>
                  <li>User-to-User refund disputes</li>
                  <li>Stripe refund decisions</li>
                  <li>Losses arising from cancellations</li>
                  <li>Dissatisfaction with services</li>
                </ul>
                <p className="text-gray-700">
                  HostKeep's total liability is limited to the subscription fees paid by the User in the previous 12 months, subject to mandatory UK legal exceptions.
                </p>
              </section>

              {/* 10. Changes to This Refund Policy */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Refund Policy</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>We may update this Policy from time to time.</li>
                  <li>The "Last Updated" date will reflect the most recent version.</li>
                  <li>Continued use of the Platform constitutes acceptance of updated terms.</li>
                </ul>
              </section>

              {/* 11. Contact Information */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
                <div className="text-gray-700 space-y-2">
                  <p className="font-medium">HostKeep Digital Ltd</p>
                  <p>[Registered Address]</p>
                  <p>[Company Number]</p>
                  <p>admin@hostkeepdigital.co.uk</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}