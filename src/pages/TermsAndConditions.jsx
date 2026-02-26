import LegalNavigation from "@/components/legal/LegalNavigation";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsAndConditions() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');
  const checkIn = urlParams.get('checkIn');
  const nights = urlParams.get('nights');
  const adults = urlParams.get('adults');
  const childrenAges = urlParams.get('childrenAges');
  
  const hasBookingParams = propertyId && checkIn && nights;
  const bookingParams = hasBookingParams 
    ? `?id=${propertyId}&checkIn=${checkIn}&nights=${nights}&adults=${adults || 1}${childrenAges ? `&childrenAges=${childrenAges}` : ''}`
    : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto flex">
        <div className="hidden lg:block w-64">
          <LegalNavigation currentPage="TermsAndConditions" />
        </div>
        
        <div className="flex-1 px-4 py-12 md:px-8">
          <div className="max-w-3xl mx-auto">
            {hasBookingParams && (
              <Link to={`${createPageUrl('PropertyDetails')}${bookingParams}`}>
                <Button variant="outline" className="mb-6">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Booking
                </Button>
              </Link>
            )}
            <p className="text-sm text-gray-500 mb-2">Last Updated: February 2026</p>
            <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms & Conditions</h1>

            <div className="space-y-8">
              {/* Introduction */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <p className="text-gray-700 leading-relaxed">
                  These Terms and Conditions ("Terms") govern your access to and use of the HostKeep platform ("Platform"), operated by HostKeep Digital Ltd, a company incorporated in the United Kingdom ("HostKeep", "we", "us", "our"). By creating an account or using the Platform, you agree to be bound by these Terms.
                </p>
              </section>

              {/* 1. Definitions */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Definitions</h2>
                <p className="text-gray-700 mb-4">In these Terms:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li><span className="font-medium">"Platform"</span> means the HostKeep website, mobile applications, and associated digital infrastructure.</li>
                  <li><span className="font-medium">"User"</span> means any individual or entity using the Platform, including Hosts, Guests, and Cleaners.</li>
                  <li><span className="font-medium">"Host"</span> means a User who lists accommodation for short-term rental.</li>
                  <li><span className="font-medium">"Guest"</span> means a User who books accommodation.</li>
                  <li><span className="font-medium">"Cleaner"</span> means a User who offers cleaning services.</li>
                  <li><span className="font-medium">"Subscription"</span> means the paid access plan enabling use of Platform features.</li>
                  <li><span className="font-medium">"Stripe"</span> means the third-party payment provider facilitating User-to-User payments.</li>
                  <li><span className="font-medium">"Content"</span> means any text, images, listings, messages, or materials uploaded by Users.</li>
                </ul>
              </section>

              {/* 2. Platform Legal Positioning */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Platform Legal Positioning</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    2.1 HostKeep operates solely as a digital infrastructure provider.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">2.2 HostKeep does not act as:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>A travel agent</li>
                      <li>A letting agent</li>
                      <li>A property manager</li>
                      <li>An employer</li>
                      <li>A financial services provider</li>
                      <li>A service quality guarantor</li>
                      <li>An agent for any User</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">2.3 Nothing in these Terms creates or implies:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>An agency relationship</li>
                      <li>A partnership</li>
                      <li>A joint venture</li>
                      <li>An employment relationship</li>
                      <li>A fiduciary duty</li>
                    </ul>
                    <p className="text-gray-700 text-sm mt-2">...between HostKeep and any User.</p>
                  </div>
                </div>
              </section>

              {/* 3. User Roles and Status */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Roles and Status</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    3.1 Users may register as Hosts, Guests, or Cleaners.
                  </p>
                  <p className="text-gray-700">
                    3.2 All Users act as independent contractors or independent customers.
                  </p>
                  <p className="text-gray-700">
                    3.3 HostKeep does not supervise, direct, or control Users.
                  </p>
                  <div>
                    <p className="text-gray-700 mb-2">3.4 HostKeep does not guarantee:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Bookings</li>
                      <li>Income</li>
                      <li>Work availability</li>
                      <li>Service quality</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 4. User Autonomy */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Autonomy</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">4.1 Hosts and Cleaners must:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Set their own pricing</li>
                      <li>Control their own availability</li>
                      <li>Accept or reject work independently</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">4.2 HostKeep must not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Assign work</li>
                      <li>Mandate working conditions</li>
                      <li>Impose employment-like obligations</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">4.3 Users are solely responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Tax obligations</li>
                      <li>National insurance contributions</li>
                      <li>Licensing requirements</li>
                      <li>Safety and insurance</li>
                      <li>Compliance with local property laws</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 5. Subscription Model */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Subscription Model</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    5.1 HostKeep operates a subscription-based SaaS model.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">5.2 Subscription fees provide access to:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Marketplace visibility</li>
                      <li>Communication tools</li>
                      <li>Listing management</li>
                      <li>Platform functionality</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">5.3 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Charge commission on bookings</li>
                      <li>Take a percentage of transaction value</li>
                      <li>Participate in revenue share</li>
                      <li>Charge service fees based on booking value</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    5.4 Subscription fees are non-refundable except as expressly stated in the Refund Policy.
                  </p>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">5.5 Cooling-Off Waiver (Consumer Contracts Regulations 2013)</h3>
                    <p className="text-gray-700">
                      By subscribing and requesting immediate access to the Platform's digital services, you acknowledge and agree that you waive your right to a 14-day cooling-off period under the Consumer Contracts Regulations 2013. You confirm that you understand this waiver means you cannot cancel your subscription and claim a refund after requesting immediate access, even within 14 days of purchase.
                    </p>
                  </div>
                  </div>
                  </section>

              {/* 6. Payment Processing */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Payment Processing</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    6.1 All payments between Users are facilitated by Stripe, acting as the regulated payment provider.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">6.2 Stripe may:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Hold funds in escrow</li>
                      <li>Schedule payouts</li>
                      <li>Conduct KYC/AML checks</li>
                      <li>Manage chargebacks</li>
                      <li>Determine card network outcomes</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">6.3 HostKeep is not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>A bank</li>
                      <li>A financial institution</li>
                      <li>A money remitter</li>
                      <li>A custodian of User funds</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">6.4 HostKeep is not responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Payment disputes</li>
                      <li>Chargebacks</li>
                      <li>Payout delays</li>
                      <li>Card network decisions</li>
                      <li>Stripe system failures</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    6.5 Users authorise Stripe to process payments in accordance with its own terms.
                  </p>
                </div>
              </section>

              {/* 7. Contract Formation Between Users */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Contract Formation Between Users</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    7.1 All contracts for accommodation or cleaning services are formed directly between Users.
                  </p>
                  <p className="text-gray-700">
                    7.2 HostKeep is not a party to any contract between Users.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">7.3 HostKeep is not responsible for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Performance of services</li>
                      <li>Quality of accommodation</li>
                      <li>Safety of premises</li>
                      <li>Accuracy of listings</li>
                      <li>Fulfilment of obligations</li>
                      <li>Damages or losses arising from User interactions</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    7.4 Users must resolve contractual issues directly with one another.
                  </p>
                </div>
              </section>

              {/* 8. User Responsibilities */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. User Responsibilities</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">8.1 Hosts</h3>
                    <p className="text-gray-700 mb-2">Hosts must:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Ensure listings are accurate and lawful</li>
                      <li>Comply with property, fire safety, and licensing laws</li>
                      <li>Maintain appropriate insurance</li>
                      <li>Ensure accommodation is safe and fit for purpose</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">8.2 Guests</h3>
                    <p className="text-gray-700 mb-2">Guests must:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Comply with house rules</li>
                      <li>Avoid causing damage</li>
                      <li>Act lawfully and respectfully</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">8.3 Cleaners</h3>
                    <p className="text-gray-700 mb-2">Cleaners must:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Provide their own tools and equipment</li>
                      <li>Maintain appropriate insurance</li>
                      <li>Comply with tax and NI obligations</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 9. Content and Platform Use */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Content and Platform Use</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">9.1 Users must not upload:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Unlawful content</li>
                      <li>Misleading or fraudulent information</li>
                      <li>Discriminatory or abusive material</li>
                      <li>Content infringing third-party rights</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    9.2 HostKeep may remove content that breaches these Terms.
                  </p>

                  <p className="text-gray-700">
                    9.3 HostKeep may suspend or terminate accounts for serious or repeated breaches.
                  </p>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">9.4 User Content Licence</h3>
                    <p className="text-gray-700">
                      By uploading, posting, or submitting content to the Platform (including but not limited to property listings, photographs, descriptions, messages, and reviews), Users grant HostKeep a non-exclusive, worldwide, royalty-free, perpetual licence to host, display, reproduce, distribute, and use such content solely for the purpose of operating, maintaining, promoting, and improving the Platform.
                    </p>
                    <p className="text-gray-700 mt-3">
                      Users retain ownership of their content and may request removal at any time, subject to legal retention requirements.
                    </p>
                  </div>
                  </div>
                  </section>

              {/* 10. Liability Exclusions */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Liability Exclusions</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">
                      10.1 To the maximum extent permitted by UK law, HostKeep excludes liability for:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Property damage</li>
                      <li>Personal injury (except where caused by HostKeep's negligence)</li>
                      <li>Theft</li>
                      <li>Service failure</li>
                      <li>Booking failure</li>
                      <li>Income loss</li>
                      <li>Indirect or consequential loss</li>
                      <li>Loss of opportunity</li>
                      <li>Loss of goodwill</li>
                      <li>Loss of data</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">10.2 Liability Cap:</h3>
                    <p className="text-gray-700">
                      HostKeep's total liability to any User is limited to the total subscription fees paid by that User in the preceding 12 months.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">10.3 Mandatory UK Exceptions:</h3>
                    <p className="text-gray-700 mb-2">
                      Nothing in these Terms excludes or limits liability for:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Death caused by negligence</li>
                      <li>Personal injury caused by negligence</li>
                      <li>Fraud</li>
                      <li>Fraudulent misrepresentation</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 11. Dispute Management */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Dispute Management</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    11.1 HostKeep may offer optional mediation between Users.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">11.2 HostKeep does not:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Act as arbitrator</li>
                      <li>Issue binding decisions</li>
                      <li>Guarantee dispute outcomes</li>
                      <li>Enforce User obligations</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    11.3 Funds may be temporarily held during dispute review.
                  </p>
                </div>
              </section>

              {/* 12. Privacy and Data Protection */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Privacy and Data Protection</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">12.1 HostKeep complies with:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>UK GDPR</li>
                      <li>Data Protection Act 2018</li>
                      <li>Consumer Rights Act 2015</li>
                      <li>Consumer Contracts Regulations 2013</li>
                      <li>Electronic Commerce Regulations 2002</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    12.2 Data is used solely for Platform functionality.
                  </p>

                  <div>
                    <p className="text-gray-700 mb-2">12.3 Data is shared only with:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Stripe</li>
                      <li>Infrastructure providers</li>
                      <li>Legal authorities when required</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    12.4 HostKeep does not sell personal data.
                  </p>
                </div>
              </section>

              {/* 13. AML and Fraud Prevention */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. AML and Fraud Prevention</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-2">
                      13.1 KYC and AML checks are conducted by Stripe in accordance with:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      <li>Proceeds of Crime Act 2002</li>
                      <li>UK Money Laundering Regulations</li>
                    </ul>
                  </div>

                  <p className="text-gray-700">
                    13.2 HostKeep does not perform regulated AML functions.
                  </p>
                </div>
              </section>

              {/* 14. Force Majeure */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Force Majeure</h2>
                <p className="text-gray-700 mb-3">
                  HostKeep is not liable for delays or failures caused by:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Pandemics</li>
                  <li>Government restrictions</li>
                  <li>Natural disasters</li>
                  <li>Network failures</li>
                  <li>Power failures</li>
                  <li>Events beyond reasonable control</li>
                </ul>
              </section>

              {/* 15. Governing Law and Jurisdiction */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Governing Law and Jurisdiction</h2>
                <p className="text-gray-700 mb-4">Jurisdiction is determined by User residence:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Scotland → Scottish Courts</li>
                  <li>Northern Ireland → NI Courts</li>
                  <li>Elsewhere → England & Wales Courts</li>
                </ul>
              </section>

              {/* 16. Amendments */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Amendments</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>HostKeep may update these Terms from time to time.</li>
                  <li>Continued use of the Platform constitutes acceptance of updated Terms.</li>
                </ul>
              </section>

              {/* 17. Contact Information */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. Contact Information</h2>
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