import LegalNavigation from "@/components/legal/LegalNavigation";
import LegalBackButton from "@/components/legal/LegalBackButton";

export default function GuestTerms() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto flex">
        <div className="hidden lg:block w-64">
          <LegalNavigation currentPage="GuestTerms" />
        </div>
        
        <div className="flex-1 px-4 py-12 md:px-8">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm text-gray-500 mb-2">Last Updated: February 2026</p>
            <h1 className="text-4xl font-bold text-gray-900 mb-8">Guest Terms</h1>

            <div className="space-y-8">
              {/* Introduction */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <p className="text-gray-700 leading-relaxed">
                  These Guest Terms ("Guest Terms") apply to all Users who register as Guests on the HostKeep platform ("Platform"), operated by HostKeep Digital Ltd ("HostKeep", "we", "us", "our"). These Guest Terms form part of the broader legal framework, including the Terms & Conditions, Payment Policy, Refund Policy, and Dispute Policy.
                </p>
                <p className="text-gray-700 leading-relaxed mt-4">
                  By registering as a Guest or booking accommodation through the Platform, you agree to be bound by these Guest Terms.
                </p>
              </section>

              {/* 1. Guest Status and Legal Positioning */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Guest Status and Legal Positioning</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    1.1 Guests act as independent users of the Platform and are not employees, agents, or representatives of HostKeep.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">1.2 Nothing in these Guest Terms creates or implies:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>An agency relationship</li>
                      <li>A partnership</li>
                      <li>A joint venture</li>
                      <li>An employment relationship</li>
                      <li>A fiduciary duty</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">1.3 HostKeep provides digital infrastructure only and does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Provide accommodation</li>
                      <li>Manage properties</li>
                      <li>Act as a letting agent</li>
                      <li>Act as a travel agent</li>
                      <li>Act as a property manager</li>
                      <li>Guarantee accommodation quality</li>
                      <li>Supervise Hosts or Cleaners</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    1.4 All accommodation is provided directly by Hosts, not HostKeep.
                  </p>
                </div>
              </section>

              {/* 2. Guest Eligibility */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Guest Eligibility</h2>
                <p className="text-gray-700 mb-4">To register as a Guest, you must:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Be at least 18 years old</li>
                  <li>Provide accurate and truthful information</li>
                  <li>Comply with all applicable laws</li>
                  <li>Maintain an active account</li>
                </ul>
                <p className="text-gray-700 mt-4">HostKeep may request verification documents at any time.</p>
              </section>

              {/* 3. Guest Responsibilities */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Guest Responsibilities</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.1 Accuracy of Information</h3>
                    <p className="text-gray-700 mb-2">Guests must ensure that all information provided is:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4 mb-3">
                      <li>Accurate</li>
                      <li>Complete</li>
                      <li>Up to date</li>
                    </ul>
                    <p className="text-gray-700 mb-2">This includes:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Identity information</li>
                      <li>Booking details</li>
                      <li>Communication with Hosts</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.2 Conduct During Stays</h3>
                    <p className="text-gray-700 mb-2">Guests must:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Comply with Host rules</li>
                      <li>Treat the property with respect</li>
                      <li>Avoid causing damage</li>
                      <li>Avoid unlawful behaviour</li>
                      <li>Respect neighbours and local regulations</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.3 Property Access</h3>
                    <p className="text-gray-700 mb-2">Guests must:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Follow Host check-in instructions</li>
                      <li>Vacate the property on time</li>
                      <li>Return keys or access devices as instructed</li>
                    </ul>
                    <p className="text-gray-700 mt-3">Failure to comply may result in additional charges.</p>
                  </div>
                </div>
              </section>

              {/* 4. Contract Formation with Hosts */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Contract Formation with Hosts</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    4.1 When a Guest books accommodation, a direct contract is formed between the Guest and the Host.
                  </p>
                  <p className="text-gray-700">
                    4.2 HostKeep is not a party to this contract.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">4.3 Guests are responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Reviewing listing details</li>
                      <li>Understanding Host rules</li>
                      <li>Complying with cancellation policies</li>
                      <li>Communicating with the Host</li>
                      <li>Resolving issues directly with the Host</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">4.4 HostKeep does not guarantee:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Property condition</li>
                      <li>Host behaviour</li>
                      <li>Availability</li>
                      <li>Accuracy of listings</li>
                      <li>Safety of accommodation</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 5. Payments */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Payments</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    5.1 Payments are processed exclusively by Stripe, not HostKeep.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">5.2 Guests authorise Stripe to:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Process payments</li>
                      <li>Hold funds temporarily</li>
                      <li>Manage refunds</li>
                      <li>Handle chargebacks</li>
                      <li>Conduct fraud checks</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">5.3 HostKeep is not responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Payment failures</li>
                      <li>Refund delays</li>
                      <li>Chargebacks</li>
                      <li>Stripe account restrictions</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 6. Cancellations and Refunds */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cancellations and Refunds</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    6.1 Refunds relating to accommodation bookings are the responsibility of the Host and Guest, not HostKeep.
                  </p>
                  <p className="text-gray-700">
                    6.2 Guests must review and comply with the Host's cancellation policy.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">6.3 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Issue refunds for bookings</li>
                      <li>Enforce Host cancellation policies</li>
                      <li>Intervene in refund disputes</li>
                      <li>Guarantee refund outcomes</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">6.4 Refunds are processed by Stripe and subject to:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Host approval</li>
                      <li>Stripe's refund rules</li>
                      <li>Card network rules</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 7. Damage, Loss, and Liability */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Damage, Loss, and Liability</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">7.1 Guests are responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Damage caused to the property</li>
                      <li>Loss of items</li>
                      <li>Breach of Host rules</li>
                      <li>Additional cleaning fees (if applicable)</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    7.2 Hosts may seek compensation directly from Guests.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">7.3 HostKeep is not liable for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Property damage</li>
                      <li>Theft</li>
                      <li>Personal injury (except where caused by HostKeep's negligence)</li>
                      <li>Disputes between Guests and Hosts</li>
                      <li>Dissatisfaction with accommodation</li>
                      <li>Service failures</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 8. Cleaners and Third-Party Services */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cleaners and Third-Party Services</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    8.1 Guests may interact with Cleaners if permitted by the Host.
                  </p>
                  <p className="text-gray-700">
                    8.2 Cleaners act as independent contractors, not employees of HostKeep.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">8.3 HostKeep is not responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Cleaning quality</li>
                      <li>Cleaner conduct</li>
                      <li>Disputes involving Cleaners</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 9. Disputes with Hosts or Cleaners */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Disputes with Hosts or Cleaners</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    9.1 Guests must attempt to resolve disputes directly with the Host or Cleaner.
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
                <p className="text-gray-700 mb-4">Guests must comply with:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Local laws</li>
                  <li>Property rules</li>
                  <li>Safety regulations</li>
                  <li>Community guidelines</li>
                </ul>
                <p className="text-gray-700">HostKeep does not verify compliance.</p>
              </section>

              {/* 11. HostKeep's Liability to Guests */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. HostKeep's Liability to Guests</h2>
                
                <p className="text-gray-700 mb-4">
                  To the maximum extent permitted by UK law, HostKeep is not liable for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Property damage</li>
                  <li>Personal injury (except where caused by HostKeep's negligence)</li>
                  <li>Theft</li>
                  <li>Booking failures</li>
                  <li>Accommodation quality</li>
                  <li>Indirect or consequential loss</li>
                  <li>Loss of opportunity</li>
                  <li>Loss of goodwill</li>
                  <li>Loss of data</li>
                  <li>Disputes with Hosts or Cleaners</li>
                  <li>Stripe decisions</li>
                </ul>
                <p className="text-gray-700">
                  HostKeep's total liability is limited to the subscription fees paid by the Guest in the previous 12 months, subject to mandatory UK legal exceptions.
                </p>
              </section>

              {/* 12. Termination of Guest Accounts */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Termination of Guest Accounts</h2>
                <p className="text-gray-700 mb-4">HostKeep may suspend or terminate a Guest account for:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Property damage</li>
                  <li>Fraudulent activity</li>
                  <li>Abusive behaviour</li>
                  <li>Illegal activity</li>
                  <li>Breach of these Guest Terms</li>
                  <li>Breach of Platform rules</li>
                </ul>
                <p className="text-gray-700">
                  Termination does not entitle the Guest to a refund.
                </p>
              </section>

              {/* 13. Changes to These Guest Terms */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Changes to These Guest Terms</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>We may update these Guest Terms from time to time.</li>
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