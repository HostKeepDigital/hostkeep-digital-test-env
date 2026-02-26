import LegalNavigation from "@/components/legal/LegalNavigation";
import LegalBackButton from "@/components/legal/LegalBackButton";

export default function CleanerTerms() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto flex">
        <div className="hidden lg:block w-64">
          <LegalNavigation currentPage="CleanerTerms" />
        </div>
        
        <div className="flex-1 px-4 py-12 md:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="lg:hidden mb-4">
              <LegalBackButton />
            </div>
            <p className="text-sm text-gray-500 mb-2">Last Updated: February 2026</p>
            <h1 className="text-4xl font-bold text-gray-900 mb-8">Cleaner Terms</h1>

            <div className="space-y-8">
              {/* Introduction */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <p className="text-gray-700 leading-relaxed">
                  These Cleaner Terms ("Cleaner Terms") apply to all Users who register as Cleaners on the HostKeep platform ("Platform"), operated by HostKeep Digital Ltd ("HostKeep", "we", "us", "our"). These Cleaner Terms form part of the broader legal framework, including the Terms & Conditions, Payment Policy, Refund Policy, and Dispute Policy.
                </p>
                <p className="text-gray-700 leading-relaxed mt-4">
                  CleanKeep is the dedicated section of the HostKeep Platform through which Cleaners manage their profiles, subscriptions, service offerings, and interactions with Hosts. CleanKeep is a brand layer only and is not a separate legal entity.
                </p>
                <p className="text-gray-700 leading-relaxed mt-4">
                  By registering as a Cleaner or offering cleaning services through CleanKeep, you agree to be bound by these Cleaner Terms.
                </p>
              </section>

              {/* 1. Cleaner Status and Legal Positioning */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Cleaner Status and Legal Positioning</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    1.1 Cleaners act as independent contractors, not employees, workers, agents, or representatives of HostKeep.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">1.2 Nothing in these Cleaner Terms creates or implies:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>An employment relationship</li>
                      <li>An agency relationship</li>
                      <li>A partnership</li>
                      <li>A joint venture</li>
                      <li>A fiduciary duty</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">1.3 HostKeep provides digital infrastructure only and does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Employ Cleaners</li>
                      <li>Assign work</li>
                      <li>Control working conditions</li>
                      <li>Supervise cleaning activities</li>
                      <li>Provide cleaning equipment</li>
                      <li>Guarantee work or income</li>
                      <li>Set Cleaner pricing</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    1.4 CleanKeep is a functional section of the HostKeep Platform and does not alter the legal relationship between Cleaners and HostKeep Digital Ltd.
                  </p>
                </div>
              </section>

              {/* 2. Cleaner Eligibility */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Cleaner Eligibility</h2>
                <p className="text-gray-700 mb-4">To register as a Cleaner, you must:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Be at least 18 years old</li>
                  <li>Have the legal right to work in the UK</li>
                  <li>Provide accurate and truthful information</li>
                  <li>Comply with all applicable laws</li>
                  <li>Maintain an active subscription (if required)</li>
                </ul>
                <p className="text-gray-700 mt-4">HostKeep may request verification documents at any time.</p>
              </section>

              {/* 3. Cleaner Responsibilities */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Cleaner Responsibilities</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.1 Service Quality and Professional Conduct</h3>
                    <p className="text-gray-700 mb-2">Cleaners must:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4 mb-3">
                      <li>Perform services with reasonable care and skill</li>
                      <li>Act professionally and respectfully</li>
                      <li>Comply with Host instructions (where reasonable)</li>
                      <li>Avoid unlawful or unsafe behaviour</li>
                      <li>Maintain confidentiality</li>
                    </ul>
                    <p className="text-gray-700">HostKeep does not supervise or evaluate cleaning quality.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.2 Tools and Equipment</h3>
                    <p className="text-gray-700 mb-2">Cleaners must:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4 mb-3">
                      <li>Provide their own cleaning tools</li>
                      <li>Provide their own cleaning products</li>
                      <li>Ensure equipment is safe and compliant</li>
                      <li>Maintain equipment in good working order</li>
                    </ul>
                    <p className="text-gray-700">HostKeep does not supply equipment.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.3 Insurance</h3>
                    <p className="text-gray-700 mb-2">Cleaners must maintain appropriate insurance, including:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4 mb-3">
                      <li>Public liability insurance</li>
                      <li>Professional indemnity insurance (if applicable)</li>
                    </ul>
                    <p className="text-gray-700">HostKeep does not provide insurance.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.4 Taxes and National Insurance</h3>
                    <p className="text-gray-700 mb-2">Cleaners are solely responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4 mb-3">
                      <li>Income tax</li>
                      <li>National insurance contributions</li>
                      <li>VAT (if applicable)</li>
                      <li>Business registration (if required)</li>
                      <li>Record-keeping</li>
                    </ul>
                    <p className="text-gray-700">HostKeep does not provide tax advice.</p>
                  </div>
                </div>
              </section>

              {/* 4. Cleaner Autonomy */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Cleaner Autonomy</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">4.1 Cleaners have full control over:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Pricing</li>
                      <li>Availability</li>
                      <li>Acceptance or rejection of cleaning jobs</li>
                      <li>Service offerings</li>
                      <li>Cancellation policies</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">4.2 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Assign work</li>
                      <li>Mandate pricing</li>
                      <li>Control schedules</li>
                      <li>Impose working conditions</li>
                      <li>Guarantee any level of work</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    4.3 Cleaners acknowledge that they operate independently.
                  </p>
                </div>
              </section>

              {/* 5. Contract Formation with Hosts */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Contract Formation with Hosts</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    5.1 When a Host books cleaning services through CleanKeep, a direct contract is formed between the Cleaner and the Host.
                  </p>
                  <p className="text-gray-700">
                    5.2 HostKeep is not a party to this contract.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">5.3 Cleaners are solely responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Fulfilling the cleaning service</li>
                      <li>Communicating with the Host</li>
                      <li>Resolving issues or complaints</li>
                      <li>Managing cancellations and refunds</li>
                      <li>Ensuring service quality</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    5.4 HostKeep does not guarantee Host behaviour or compliance.
                  </p>
                </div>
              </section>

              {/* 6. Payments to Cleaners */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Payments to Cleaners</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    6.1 Payments are processed exclusively by Stripe, not HostKeep.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">6.2 Stripe may:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Hold funds temporarily</li>
                      <li>Delay payouts</li>
                      <li>Require identity verification</li>
                      <li>Conduct AML checks</li>
                      <li>Manage chargebacks</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">6.3 HostKeep is not responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Payout delays</li>
                      <li>Failed payouts</li>
                      <li>Chargebacks</li>
                      <li>Stripe account restrictions</li>
                      <li>Incorrect bank details</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    6.4 Cleaners must ensure their Stripe account is accurate and verified.
                  </p>
                </div>
              </section>

              {/* 7. Cleaner Cancellations */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cleaner Cancellations</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    7.1 Cleaners may set their own cancellation policies, provided they comply with UK consumer law.
                  </p>
                  <p className="text-gray-700">
                    7.2 Cleaners must honour their stated cancellation policy.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">7.3 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Enforce Cleaner cancellation policies</li>
                      <li>Issue refunds on behalf of Cleaners</li>
                      <li>Intervene in cancellation disputes</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">7.4 Repeated Cleaner cancellations may result in:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Listing removal</li>
                      <li>Account suspension</li>
                      <li>Account termination</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 8. Damage, Loss, and Liability */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Damage, Loss, and Liability</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">8.1 Cleaners are responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Damage caused during cleaning</li>
                      <li>Loss of property</li>
                      <li>Disputes relating to service quality</li>
                      <li>Compliance with health and safety laws</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">8.2 HostKeep is not liable for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Property damage</li>
                      <li>Theft</li>
                      <li>Service failures</li>
                      <li>Host dissatisfaction</li>
                      <li>Booking failures</li>
                      <li>Disputes between Hosts and Cleaners</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    8.3 Cleaners must resolve damage claims directly with Hosts.
                  </p>
                </div>
              </section>

              {/* 9. Disputes with Hosts or Guests */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Disputes with Hosts or Guests</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    9.1 Cleaners must attempt to resolve disputes directly.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">9.2 HostKeep may offer optional mediation, but:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Mediation is non-binding</li>
                      <li>HostKeep does not issue decisions</li>
                      <li>HostKeep does not enforce outcomes</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    9.3 HostKeep may request Stripe to hold funds temporarily.
                  </p>
                </div>
              </section>

              {/* 10. Compliance with Laws */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Compliance with Laws</h2>
                <p className="text-gray-700 mb-4">Cleaners must comply with:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>UK employment law (as self-employed individuals)</li>
                  <li>UK tax law</li>
                  <li>Health and safety regulations</li>
                  <li>Local authority requirements</li>
                  <li>Environmental regulations (for cleaning chemicals)</li>
                </ul>
                <p className="text-gray-700">HostKeep does not verify compliance.</p>
              </section>

              {/* 11. HostKeep's Liability to Cleaners */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. HostKeep's Liability to Cleaners</h2>
                
                <p className="text-gray-700 mb-4">
                  To the maximum extent permitted by UK law, HostKeep is not liable for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Property damage</li>
                  <li>Personal injury (except where caused by HostKeep's negligence)</li>
                  <li>Theft</li>
                  <li>Booking failures</li>
                  <li>Income loss</li>
                  <li>Indirect or consequential loss</li>
                  <li>Loss of opportunity</li>
                  <li>Loss of goodwill</li>
                  <li>Loss of data</li>
                  <li>Disputes with Hosts or Guests</li>
                  <li>Stripe decisions</li>
                </ul>
                <p className="text-gray-700">
                  HostKeep's total liability is limited to the subscription fees paid by the Cleaner in the previous 12 months, subject to mandatory UK legal exceptions.
                </p>
              </section>

              {/* 12. Termination of Cleaner Accounts */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Termination of Cleaner Accounts</h2>
                <p className="text-gray-700 mb-4">HostKeep may suspend or terminate a Cleaner account for:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Repeated cancellations</li>
                  <li>Fraudulent activity</li>
                  <li>Unsafe conduct</li>
                  <li>Illegal activity</li>
                  <li>Breach of these Cleaner Terms</li>
                  <li>Breach of Platform rules</li>
                </ul>
                <p className="text-gray-700">
                  Termination does not entitle the Cleaner to a subscription refund.
                </p>
              </section>

              {/* 13. Changes to These Cleaner Terms */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Changes to These Cleaner Terms</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>We may update these Cleaner Terms from time to time.</li>
                  <li>The "Last Updated" date will reflect the most recent version.</li>
                  <li>Continued use of the Platform constitutes acceptance of updated terms.</li>
                </ul>
              </section>

              {/* 14. Contact Information */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Information</h2>
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