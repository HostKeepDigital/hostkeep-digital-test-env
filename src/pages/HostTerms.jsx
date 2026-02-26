import LegalNavigation from "@/components/legal/LegalNavigation";
import LegalBackButton from "@/components/legal/LegalBackButton";

export default function HostTerms() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto flex">
        <div className="hidden lg:block w-64">
          <LegalNavigation currentPage="HostTerms" />
        </div>
        
        <div className="flex-1 px-4 py-12 md:px-8">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm text-gray-500 mb-2">Last Updated: February 2026</p>
            <h1 className="text-4xl font-bold text-gray-900 mb-8">Host Terms</h1>

            <div className="space-y-8">
              {/* Introduction */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <p className="text-gray-700 leading-relaxed">
                  These Host Terms ("Host Terms") apply to all Users who register as Hosts on the HostKeep platform ("Platform"), operated by HostKeep Digital Ltd ("HostKeep", "we", "us", "our"). These Host Terms form part of the broader legal framework, including the Terms & Conditions, Payment Policy, Refund Policy, and Dispute Policy.
                </p>
                <p className="text-gray-700 leading-relaxed mt-4">
                  By registering as a Host or listing accommodation on the Platform, you agree to be bound by these Host Terms.
                </p>
              </section>

              {/* 1. Host Status and Legal Positioning */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Host Status and Legal Positioning</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    1.1 Hosts act as independent contractors and not as employees, agents, or representatives of HostKeep.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">1.2 Nothing in these Host Terms creates or implies:</p>
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
                      <li>Manage properties</li>
                      <li>Act as a letting agent</li>
                      <li>Act as a travel agent</li>
                      <li>Act as a property manager</li>
                      <li>Act as an estate agent</li>
                      <li>Provide accommodation</li>
                      <li>Guarantee bookings or income</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    1.4 Hosts are solely responsible for their accommodation, compliance, and contractual obligations.
                  </p>
                </div>
              </section>

              {/* 2. Host Eligibility */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Host Eligibility</h2>
                <p className="text-gray-700 mb-4">To register as a Host, you must:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Be at least 18 years old</li>
                  <li>Have legal authority to list the property</li>
                  <li>Comply with all applicable laws</li>
                  <li>Provide accurate and truthful information</li>
                  <li>Maintain an active subscription (if required)</li>
                </ul>
                <p className="text-gray-700 mt-4">HostKeep may request verification documents at any time.</p>
              </section>

              {/* 3. Host Responsibilities */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Host Responsibilities</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.1 Accuracy of Listings</h3>
                    <p className="text-gray-700 mb-2">Hosts must ensure that all listing information is:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4 mb-3">
                      <li>Accurate</li>
                      <li>Complete</li>
                      <li>Up to date</li>
                      <li>Not misleading</li>
                    </ul>
                    <p className="text-gray-700 mb-2">This includes:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Property description</li>
                      <li>Amenities</li>
                      <li>Pricing</li>
                      <li>Availability</li>
                      <li>House rules</li>
                      <li>Safety features</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.2 Safety and Compliance</h3>
                    <p className="text-gray-700 mb-2">Hosts are solely responsible for ensuring that their accommodation complies with:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Fire safety regulations</li>
                      <li>Gas safety regulations</li>
                      <li>Electrical safety standards</li>
                      <li>Local authority licensing requirements</li>
                      <li>Planning permission rules</li>
                      <li>Health and safety obligations</li>
                      <li>Insurance requirements</li>
                    </ul>
                    <p className="text-gray-700 mt-3">HostKeep does not verify compliance.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.3 Insurance</h3>
                    <p className="text-gray-700 mb-2">Hosts must maintain appropriate insurance, including:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Property insurance</li>
                      <li>Liability insurance</li>
                      <li>Short-term rental coverage (if required)</li>
                    </ul>
                    <p className="text-gray-700 mt-3">HostKeep does not provide insurance.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.4 Taxes and Legal Obligations</h3>
                    <p className="text-gray-700 mb-2">Hosts are responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Income tax</li>
                      <li>Corporation tax (if applicable)</li>
                      <li>VAT (if applicable)</li>
                      <li>Local authority requirements</li>
                      <li>National insurance contributions</li>
                      <li>Record-keeping</li>
                    </ul>
                    <p className="text-gray-700 mt-3">HostKeep does not provide tax advice.</p>
                  </div>
                </div>
              </section>

              {/* 4. Host Autonomy */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Host Autonomy</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">4.1 Hosts have full control over:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Pricing</li>
                      <li>Availability</li>
                      <li>Acceptance or rejection of bookings</li>
                      <li>Cancellation policies</li>
                      <li>House rules</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">4.2 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Assign bookings</li>
                      <li>Mandate pricing</li>
                      <li>Control availability</li>
                      <li>Impose service standards beyond Platform rules</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    4.3 Hosts acknowledge that they operate independently.
                  </p>
                </div>
              </section>

              {/* 5. Contract Formation with Guests */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Contract Formation with Guests</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    5.1 When a Guest books accommodation, a direct contract is formed between the Host and the Guest.
                  </p>
                  <p className="text-gray-700">
                    5.2 HostKeep is not a party to this contract.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">5.3 Hosts are solely responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Fulfilling the booking</li>
                      <li>Providing access to the property</li>
                      <li>Ensuring the property is as described</li>
                      <li>Handling Guest enquiries</li>
                      <li>Resolving issues or complaints</li>
                      <li>Managing cancellations and refunds</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    5.4 HostKeep does not guarantee Guest behaviour or compliance.
                  </p>
                </div>
              </section>

              {/* 6. Payments to Hosts */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Payments to Hosts</h2>
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
                    6.4 Hosts must ensure their Stripe account is accurate and verified.
                  </p>
                </div>
              </section>

              {/* 7. Host Cancellations */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Host Cancellations</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    7.1 Hosts may set their own cancellation policies, provided they comply with UK consumer law.
                  </p>
                  <p className="text-gray-700">
                    7.2 Hosts must honour their stated cancellation policy.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">7.3 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Enforce Host cancellation policies</li>
                      <li>Issue refunds on behalf of Hosts</li>
                      <li>Intervene in cancellation disputes</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">7.4 Repeated Host cancellations may result in:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Listing removal</li>
                      <li>Account suspension</li>
                      <li>Account termination</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 8. Property Condition and Guest Safety */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Property Condition and Guest Safety</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">8.1 Hosts must ensure the property is:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Clean</li>
                      <li>Safe</li>
                      <li>Fit for habitation</li>
                      <li>Compliant with legal standards</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">8.2 Hosts are responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Repairs</li>
                      <li>Maintenance</li>
                      <li>Hazard prevention</li>
                      <li>Emergency procedures</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    8.3 HostKeep does not inspect or verify properties.
                  </p>
                </div>
              </section>

              {/* 9. Damage, Loss, and Liability */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Damage, Loss, and Liability</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">9.1 Hosts are responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Damage caused by Guests</li>
                      <li>Theft</li>
                      <li>Property loss</li>
                      <li>Disputes relating to property condition</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">9.2 HostKeep is not liable for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Property damage</li>
                      <li>Guest misconduct</li>
                      <li>Theft or loss</li>
                      <li>Cleaning issues</li>
                      <li>Service failures</li>
                      <li>Booking failures</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    9.3 Hosts must resolve damage claims directly with Guests.
                  </p>
                </div>
              </section>

              {/* 10. Cleaners and Third-Party Services */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Cleaners and Third-Party Services</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    10.1 Hosts may hire Cleaners through the Platform.
                  </p>
                  <p className="text-gray-700">
                    10.2 Cleaners act as independent contractors, not employees of HostKeep.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">10.3 HostKeep is not responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Cleaning quality</li>
                      <li>Cleaner availability</li>
                      <li>Cleaner conduct</li>
                      <li>Disputes between Hosts and Cleaners</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    10.4 Hosts must resolve issues directly with Cleaners.
                  </p>
                </div>
              </section>

              {/* 11. Disputes with Guests or Cleaners */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Disputes with Guests or Cleaners</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    11.1 Hosts must attempt to resolve disputes directly.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">11.2 HostKeep may offer optional mediation, but:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Mediation is non-binding</li>
                      <li>HostKeep does not issue decisions</li>
                      <li>HostKeep does not enforce outcomes</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    11.3 HostKeep may request Stripe to hold funds temporarily.
                  </p>
                </div>
              </section>

              {/* 12. HostKeep's Liability to Hosts */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. HostKeep's Liability to Hosts</h2>
                
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
                  <li>Disputes with Guests or Cleaners</li>
                  <li>Stripe decisions</li>
                </ul>
                <p className="text-gray-700">
                  HostKeep's total liability is limited to the subscription fees paid by the Host in the previous 12 months, subject to mandatory UK legal exceptions.
                </p>
              </section>

              {/* 13. Termination of Host Accounts */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Termination of Host Accounts</h2>
                <p className="text-gray-700 mb-4">HostKeep may suspend or terminate a Host account for:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Repeated cancellations</li>
                  <li>Fraudulent activity</li>
                  <li>Safety violations</li>
                  <li>Illegal activity</li>
                  <li>Breach of these Host Terms</li>
                  <li>Breach of Platform rules</li>
                </ul>
                <p className="text-gray-700">
                  Termination does not entitle the Host to a subscription refund.
                </p>
              </section>

              {/* 14. Changes to These Host Terms */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Changes to These Host Terms</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>We may update these Host Terms from time to time.</li>
                  <li>The "Last Updated" date will reflect the most recent version.</li>
                  <li>Continued use of the Platform constitutes acceptance of updated terms.</li>
                </ul>
              </section>

              {/* 15. Contact Information */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Contact Information</h2>
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