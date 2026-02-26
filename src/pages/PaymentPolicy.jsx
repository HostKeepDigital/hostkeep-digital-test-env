import LegalNavigation from "@/components/legal/LegalNavigation";
import LegalBackButton from "@/components/legal/LegalBackButton";

export default function PaymentPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto flex">
        <div className="hidden lg:block w-64">
          <LegalNavigation currentPage="PaymentPolicy" />
        </div>
        
        <div className="flex-1 px-4 py-12 md:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="lg:hidden mb-4">
              <LegalBackButton />
            </div>
            <p className="text-sm text-gray-500 mb-2">Last Updated: February 2026</p>
            <h1 className="text-4xl font-bold text-gray-900 mb-8">Payment Policy</h1>

            <div className="space-y-8">
              {/* Introduction */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <p className="text-gray-700 leading-relaxed">
                  This Payment Policy explains how payments are processed on the HostKeep platform ("Platform"), operated by HostKeep Digital Ltd ("HostKeep", "we", "us", "our"). It should be read together with our Terms & Conditions, Refund Policy, and Dispute Policy.
                </p>
                <p className="text-gray-700 leading-relaxed mt-4">
                  By using the Platform, you agree to the terms set out in this Payment Policy.
                </p>
              </section>

              {/* 1. Platform Role in Payments */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Platform Role in Payments</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">1.1 HostKeep provides digital infrastructure only.</p>
                  
                  <div>
                    <p className="text-gray-700 mb-2">1.2 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Process payments</li>
                      <li>Hold funds</li>
                      <li>Act as a bank or financial institution</li>
                      <li>Act as a money remitter</li>
                      <li>Provide financial services</li>
                      <li>Act as an agent for any User</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    1.3 All payments between Users are facilitated exclusively by Stripe, a regulated third-party payment provider.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">1.4 HostKeep does not have access to, or control over:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Card details</li>
                      <li>Bank account information</li>
                      <li>Payout schedules</li>
                      <li>Chargeback decisions</li>
                      <li>Fraud assessments</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 2. Stripe as Payment Provider */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Stripe as Payment Provider</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">2.1 Stripe provides:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Payment processing</li>
                      <li>Identity verification (KYC)</li>
                      <li>Anti-money laundering checks (AML)</li>
                      <li>Fraud detection</li>
                      <li>Escrow-style fund holding</li>
                      <li>Payout scheduling</li>
                      <li>Chargeback handling</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    2.2 Stripe acts as an independent data controller and independent financial service provider.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">2.3 Users must comply with Stripe's Terms of Service and may be required to provide:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4 mb-3">
                      <li>Identity documents</li>
                      <li>Proof of address</li>
                      <li>Business information</li>
                      <li>Bank account details</li>
                    </ul>
                    <p className="text-gray-700">Failure to complete verification may result in:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Delayed payouts</li>
                      <li>Cancelled transactions</li>
                      <li>Account restrictions</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 3. Escrow-Style Holding of Funds */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Escrow-Style Holding of Funds</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">3.1 Stripe may temporarily hold funds ("escrow-style holding") until:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>A booking is confirmed</li>
                      <li>A service is completed</li>
                      <li>A payout is authorised</li>
                      <li>A dispute is resolved</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">3.2 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Hold User funds</li>
                      <li>Control the timing of fund release</li>
                      <li>Guarantee payout dates</li>
                      <li>Intervene in Stripe's risk assessments</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">3.3 Users acknowledge that Stripe may delay or freeze funds in accordance with:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Fraud prevention rules</li>
                      <li>AML regulations</li>
                      <li>Card network requirements</li>
                      <li>Internal risk policies</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 4. Payouts to Hosts and Cleaners */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Payouts to Hosts and Cleaners</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">4.1 Payouts are issued by Stripe directly to:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Hosts (for accommodation bookings)</li>
                      <li>Cleaners (for cleaning services)</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">4.2 Payout timing depends on:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Stripe's processing schedules</li>
                      <li>User verification status</li>
                      <li>Bank processing times</li>
                      <li>Weekends and bank holidays</li>
                      <li>Fraud or risk reviews</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">4.3 HostKeep is not responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Payout delays</li>
                      <li>Failed payouts</li>
                      <li>Incorrect bank details</li>
                      <li>Stripe account restrictions</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    4.4 Users must ensure their Stripe account details are accurate and up to date.
                  </p>
                </div>
              </section>

              {/* 5. Fees */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Fees</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    5.1 HostKeep operates a subscription-only business model.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">5.2 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Charge commission</li>
                      <li>Take a percentage of bookings</li>
                      <li>Charge service fees</li>
                      <li>Take a share of cleaning fees</li>
                      <li>Add transaction mark-ups</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">5.3 Stripe may charge:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Payment processing fees</li>
                      <li>Payout fees</li>
                      <li>Chargeback fees</li>
                      <li>Currency conversion fees</li>
                    </ul>
                    <p className="text-gray-700 mt-2">These fees are determined solely by Stripe.</p>
                  </div>
                </div>
              </section>

              {/* 6. Chargebacks */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Chargebacks</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    6.1 Chargebacks are handled exclusively by Stripe and the card networks.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">6.2 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Decide chargeback outcomes</li>
                      <li>Participate in chargeback investigations</li>
                      <li>Reimburse Users for chargeback losses</li>
                      <li>Provide evidence on behalf of Users</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">6.3 Users are responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Providing evidence to Stripe</li>
                      <li>Responding to chargeback requests</li>
                      <li>Complying with Stripe's deadlines</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    6.4 Stripe's decision is final and binding.
                  </p>
                </div>
              </section>

              {/* 7. Payment Disputes Between Users */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Payment Disputes Between Users</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    7.1 Payment disputes between Users (e.g., Host vs Guest, Host vs Cleaner) must be resolved directly between the Users.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">
                      7.2 HostKeep may, at its discretion, offer optional mediation, but:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Mediation is non-binding</li>
                      <li>HostKeep does not issue judgments</li>
                      <li>HostKeep does not enforce outcomes</li>
                      <li>HostKeep does not guarantee results</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    7.3 HostKeep may temporarily request Stripe to hold funds while a dispute is reviewed.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">7.4 HostKeep is not liable for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Losses arising from disputes</li>
                      <li>User dissatisfaction</li>
                      <li>Service quality issues</li>
                      <li>Property damage</li>
                      <li>Cancellations</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 8. Cancellations and Refunds */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cancellations and Refunds</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    8.1 Refunds relating to accommodation bookings, cleaning services, damages, or cancellations are the responsibility of the Users involved, not HostKeep.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">8.2 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Issue refunds for User-to-User transactions</li>
                      <li>Determine refund eligibility</li>
                      <li>Intervene in refund negotiations</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    8.3 Subscription refunds are governed by the Refund Policy.
                  </p>
                </div>
              </section>

              {/* 9. Fraud Prevention and AML Compliance */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Fraud Prevention and AML Compliance</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">9.1 Stripe conducts:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Identity verification</li>
                      <li>AML checks</li>
                      <li>Fraud monitoring</li>
                      <li>Transaction risk assessments</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    9.2 HostKeep does not perform regulated AML functions.
                  </p>

                  <p className="text-gray-700">
                    9.3 Users may be required to provide additional documentation to Stripe.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">
                      9.4 Stripe may freeze funds, delay payouts, cancel transactions, or restrict accounts to comply with:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Proceeds of Crime Act 2002</li>
                      <li>Money Laundering Regulations (UK)</li>
                      <li>Card network rules</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 10. HostKeep's Liability for Payments */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. HostKeep's Liability for Payments</h2>
                
                <p className="text-gray-700 mb-4">
                  To the maximum extent permitted by UK law, HostKeep is not liable for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Payment failures</li>
                  <li>Payout delays</li>
                  <li>Chargebacks</li>
                  <li>Stripe account restrictions</li>
                  <li>Incorrect bank details</li>
                  <li>Fraud losses</li>
                  <li>Unauthorised transactions</li>
                  <li>User disputes</li>
                  <li>Card network decisions</li>
                  <li>Stripe system outages</li>
                </ul>
                <p className="text-gray-700">
                  HostKeep's total liability is limited to the subscription fees paid by the User in the previous 12 months, subject to mandatory UK legal exceptions.
                </p>
              </section>

              {/* 11. Changes to This Payment Policy */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to This Payment Policy</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>We may update this Policy from time to time.</li>
                  <li>The "Last Updated" date will reflect the most recent version.</li>
                  <li>Continued use of the Platform constitutes acceptance of updated terms.</li>
                </ul>
              </section>

              {/* 12. Contact Information */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Information</h2>
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