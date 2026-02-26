import LegalNavigation from "@/components/legal/LegalNavigation";
import LegalBackButton from "@/components/legal/LegalBackButton";

export default function DisputePolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto flex">
        <div className="hidden lg:block w-64">
          <LegalNavigation currentPage="DisputePolicy" />
        </div>
        
        <div className="flex-1 px-4 py-12 md:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="lg:hidden mb-4">
              <LegalBackButton />
            </div>
            <p className="text-sm text-gray-500 mb-2">Last Updated: February 2026</p>
            <h1 className="text-4xl font-bold text-gray-900 mb-8">Dispute Policy</h1>

            <div className="space-y-8">
              {/* Introduction */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <p className="text-gray-700 leading-relaxed">
                  This Dispute Policy explains how disputes are handled on the HostKeep platform ("Platform"), operated by HostKeep Digital Ltd ("HostKeep", "we", "us", "our"). This Policy should be read together with our Terms & Conditions, Payment Policy, and Refund Policy.
                </p>
                <p className="text-gray-700 leading-relaxed mt-4">
                  By using the Platform, you agree to the procedures set out in this Dispute Policy.
                </p>
              </section>

              {/* 1. Platform Role in Disputes */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Platform Role in Disputes</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    1.1 HostKeep provides digital infrastructure only and is not a party to any contract between Users.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">1.2 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Act as an arbitrator</li>
                      <li>Issue binding decisions</li>
                      <li>Enforce User obligations</li>
                      <li>Guarantee dispute outcomes</li>
                      <li>Determine fault or liability</li>
                      <li>Provide legal advice</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    1.3 HostKeep may, at its discretion, offer optional mediation, but this is non-binding and informal.
                  </p>
                </div>
              </section>

              {/* 2. Types of Disputes Covered */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Types of Disputes Covered</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">This Policy applies to disputes between Users, including:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Host vs Guest disputes</li>
                      <li>Host vs Cleaner disputes</li>
                      <li>Guest vs Cleaner disputes</li>
                      <li>Disputes relating to bookings</li>
                      <li>Disputes relating to cleaning services</li>
                      <li>Disputes relating to cancellations</li>
                      <li>Disputes relating to property damage</li>
                      <li>Disputes relating to refund requests</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">This Policy does not apply to:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Disputes involving Stripe</li>
                      <li>Disputes involving banks or card networks</li>
                      <li>Disputes involving law enforcement</li>
                      <li>Disputes involving third-party service providers</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 3. User Responsibilities in Disputes */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Responsibilities in Disputes</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    3.1 Users must attempt to resolve disputes directly with each other before involving HostKeep.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">3.2 Users must:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Communicate respectfully</li>
                      <li>Provide accurate information</li>
                      <li>Act in good faith</li>
                      <li>Comply with applicable laws</li>
                      <li>Provide evidence when requested</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">3.3 HostKeep may decline to assist if Users:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Refuse to communicate</li>
                      <li>Provide false or misleading information</li>
                      <li>Behave abusively</li>
                      <li>Breach Platform rules</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 4. Optional Mediation by HostKeep */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Optional Mediation by HostKeep</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    4.1 HostKeep may offer informal, non-binding mediation to help Users reach a voluntary resolution.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">4.2 Mediation may include:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Reviewing User-submitted evidence</li>
                      <li>Facilitating communication</li>
                      <li>Clarifying Platform rules</li>
                      <li>Suggesting possible solutions</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">4.3 Mediation is not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Arbitration</li>
                      <li>Adjudication</li>
                      <li>A legal process</li>
                      <li>A guarantee of outcome</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">4.4 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Determine who is right or wrong</li>
                      <li>Issue binding decisions</li>
                      <li>Enforce agreements</li>
                      <li>Compensate Users</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    4.5 Users participate in mediation voluntarily.
                  </p>
                </div>
              </section>

              {/* 5. Evidence Requirements */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Evidence Requirements</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">5.1 Users may be asked to provide evidence, including:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Messages exchanged on the Platform</li>
                      <li>Booking details</li>
                      <li>Photographs or videos</li>
                      <li>Receipts or invoices</li>
                      <li>Cleaning reports</li>
                      <li>Property condition records</li>
                      <li>Proof of payment</li>
                      <li>Relevant documentation</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">5.2 HostKeep may refuse to review evidence that is:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Incomplete</li>
                      <li>Irrelevant</li>
                      <li>Unlawfully obtained</li>
                      <li>Abusive or inappropriate</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    5.3 HostKeep is not obligated to review all evidence submitted.
                  </p>
                </div>
              </section>

              {/* 6. Temporary Fund Holds */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Temporary Fund Holds</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    6.1 HostKeep may request Stripe to temporarily hold funds while a dispute is reviewed.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">6.2 Fund holds may occur when:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>A dispute is raised</li>
                      <li>Fraud is suspected</li>
                      <li>A chargeback is initiated</li>
                      <li>Evidence is being reviewed</li>
                      <li>Stripe requires additional verification</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">6.3 HostKeep does not control:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>The duration of fund holds</li>
                      <li>Stripe's risk assessments</li>
                      <li>Stripe's release decisions</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    6.4 HostKeep is not liable for losses arising from fund holds.
                  </p>
                </div>
              </section>

              {/* 7. Resolution Outcomes */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Resolution Outcomes</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">7.1 Disputes may be resolved by:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Agreement between Users</li>
                      <li>Refund issued by the Host or Cleaner</li>
                      <li>Partial refund</li>
                      <li>No refund</li>
                      <li>Cancellation of a booking</li>
                      <li>External legal action</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">7.2 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Enforce outcomes</li>
                      <li>Guarantee compliance</li>
                      <li>Compensate Users</li>
                      <li>Provide legal remedies</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    7.3 Users are responsible for enforcing agreements reached between themselves.
                  </p>
                </div>
              </section>

              {/* 8. Chargebacks and External Processes */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Chargebacks and External Processes</h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700">
                    8.1 Chargebacks are handled exclusively by Stripe and the card networks.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">8.2 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Participate in chargeback investigations</li>
                      <li>Provide evidence on behalf of Users</li>
                      <li>Influence chargeback outcomes</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">8.3 Users may pursue external remedies, including:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Small claims court</li>
                      <li>Insurance claims</li>
                      <li>Law enforcement reports</li>
                    </ul>
                    <p className="text-gray-700 text-sm mt-2">HostKeep does not participate in external legal proceedings.</p>
                  </div>
                </div>
              </section>

              {/* 9. Abuse of the Dispute Process */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Abuse of the Dispute Process</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-3">HostKeep may take action if a User:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Repeatedly raises unfounded disputes</li>
                      <li>Submits fraudulent evidence</li>
                      <li>Harasses other Users</li>
                      <li>Misuses the dispute process</li>
                      <li>Breaches Platform rules</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">Actions may include:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Warnings</li>
                      <li>Account suspension</li>
                      <li>Account termination</li>
                      <li>Reporting to authorities</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 10. HostKeep's Liability in Disputes */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. HostKeep's Liability in Disputes</h2>
                
                <p className="text-gray-700 mb-4">
                  To the maximum extent permitted by UK law, HostKeep is not liable for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Dispute outcomes</li>
                  <li>User behaviour</li>
                  <li>Property damage</li>
                  <li>Service quality</li>
                  <li>Cancellations</li>
                  <li>Refund refusals</li>
                  <li>Losses arising from disputes</li>
                  <li>Stripe decisions</li>
                  <li>Fund holds</li>
                </ul>
                <p className="text-gray-700">
                  HostKeep's total liability is limited to the subscription fees paid by the User in the previous 12 months, subject to mandatory UK legal exceptions.
                </p>
              </section>

              {/* 11. Governing Law and Jurisdiction */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Governing Law and Jurisdiction</h2>
                <p className="text-gray-700 mb-4">Jurisdiction is determined by User residence:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Scotland → Scottish Courts</li>
                  <li>Northern Ireland → NI Courts</li>
                  <li>Elsewhere → England & Wales Courts</li>
                </ul>
              </section>

              {/* 12. Changes to This Dispute Policy */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Dispute Policy</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>We may update this Policy from time to time.</li>
                  <li>The "Last Updated" date will reflect the most recent version.</li>
                  <li>Continued use of the Platform constitutes acceptance of updated terms.</li>
                </ul>
              </section>

              {/* 13. Contact Information */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Information</h2>
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