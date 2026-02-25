import LegalNavigation from "@/components/legal/LegalNavigation";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto flex">
        <div className="hidden lg:block w-64">
          <LegalNavigation currentPage="PrivacyPolicy" />
        </div>
        
        <div className="flex-1 px-4 py-12 md:px-8">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm text-gray-500 mb-2">Last Updated: February 2026</p>
            <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

            <div className="space-y-8">
              {/* Introduction */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <p className="text-gray-700 leading-relaxed">
                  This Privacy Policy explains how HostKeep Digital Ltd ("HostKeep", "we", "us", "our") collects, uses, stores, and protects personal data when you access or use the HostKeep platform ("Platform"). We are committed to complying with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
                </p>
                <p className="text-gray-700 leading-relaxed mt-4">
                  By using the Platform, you acknowledge that you have read and understood this Privacy Policy.
                </p>
              </section>

              {/* 1. Data Controller */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Data Controller</h2>
                <p className="text-gray-700 mb-4">
                  HostKeep Digital Ltd is the data controller for personal data processed through the Platform.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-1 mb-4">
                  <p><span className="font-medium">Company Name:</span> HostKeep Digital Ltd</p>
                  <p><span className="font-medium">Registered Address:</span> [Insert Address]</p>
                  <p><span className="font-medium">Company Number:</span> [Insert Number]</p>
                  <p><span className="font-medium">Email:</span> [Insert Contact Email]</p>
                </div>
                <p className="text-gray-700">
                  For data protection matters, you may contact our Data Protection Officer at: [Insert DPO Email]
                </p>
              </section>

              {/* 2. Personal Data We Collect */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">2. Personal Data We Collect</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">2.1 Information You Provide Directly</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                      <li>Account registration details (name, email, phone number, password)</li>
                      <li>Profile information (photo, biography, location)</li>
                      <li>Listing information (property details, pricing, availability)</li>
                      <li>Cleaning service information (rates, availability, service descriptions)</li>
                      <li>Communications sent through the Platform</li>
                      <li>Identity verification information (processed by Stripe)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">2.2 Information Collected Automatically</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                      <li>Device information (IP address, browser type, operating system)</li>
                      <li>Usage data (pages visited, features used, access times)</li>
                      <li>Cookies and tracking technologies (see Cookie Policy)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">2.3 Information from Third Parties</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                      <li>Payment and identity verification data from Stripe</li>
                      <li>Fraud prevention and AML/KYC data</li>
                      <li>Analytics data from service providers</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 3. Legal Basis for Processing */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">3. Legal Basis for Processing</h2>
                <p className="text-gray-700 mb-6">We process personal data under the following lawful bases:</p>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">3.1 Performance of Contract</h3>
                    <p className="text-gray-700 mb-2">To provide Platform functionality, including:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Account creation</li>
                      <li>Listing management</li>
                      <li>Booking facilitation</li>
                      <li>Communication tools</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">3.2 Legitimate Interests</h3>
                    <p className="text-gray-700 mb-2">For purposes such as:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Improving Platform performance</li>
                      <li>Fraud prevention</li>
                      <li>Security monitoring</li>
                      <li>Customer support</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">3.3 Legal Obligations</h3>
                    <p className="text-gray-700 mb-2">To comply with:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>AML/KYC requirements</li>
                      <li>Tax and accounting laws</li>
                      <li>Law enforcement requests</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">3.4 Consent</h3>
                    <p className="text-gray-700 mb-2">For:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Non-essential cookies</li>
                      <li>Marketing communications (if applicable)</li>
                    </ul>
                    <p className="text-gray-700 mt-2">You may withdraw consent at any time.</p>
                  </div>
                </div>
              </section>

              {/* 4. How We Use Personal Data */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. How We Use Personal Data</h2>
                <p className="text-gray-700 mb-4">We use personal data to:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Operate and maintain the Platform</li>
                  <li>Enable Hosts, Guests, and Cleaners to connect and contract</li>
                  <li>Process payments via Stripe</li>
                  <li>Provide customer support</li>
                  <li>Enforce Platform rules</li>
                  <li>Detect and prevent fraud</li>
                  <li>Comply with legal obligations</li>
                  <li>Improve Platform functionality</li>
                </ul>
                <p className="text-gray-700 mt-4">
                  We do not use personal data for automated decision-making that produces legal or significant effects.
                </p>
              </section>

              {/* 5. Data Sharing */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">5. Data Sharing</h2>
                <p className="text-gray-700 mb-6">We share personal data only when necessary and lawful.</p>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">5.1 Stripe (Payment Provider)</h3>
                    <p className="text-gray-700 mb-2">We share data with Stripe for:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Payment processing</li>
                      <li>Identity verification</li>
                      <li>AML/KYC compliance</li>
                      <li>Fraud prevention</li>
                    </ul>
                    <p className="text-gray-700 mt-2">Stripe acts as an independent data controller for these purposes.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">5.2 Service Providers</h3>
                    <p className="text-gray-700 mb-2">We may share data with:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Hosting providers</li>
                      <li>Analytics providers</li>
                      <li>Communication tools</li>
                      <li>Customer support systems</li>
                    </ul>
                    <p className="text-gray-700 mt-2">All providers are bound by data processing agreements.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">5.3 Legal and Regulatory Authorities</h3>
                    <p className="text-gray-700">We may disclose data when required by law enforcement, courts, or regulatory bodies.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">5.4 User-to-User Sharing</h3>
                    <p className="text-gray-700">Certain information is shared between Users as necessary for bookings, communication, and service arrangements.</p>
                  </div>

                  <p className="text-gray-700 font-medium">We do not sell personal data.</p>
                </div>
              </section>

              {/* 6. International Data Transfers */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. International Data Transfers</h2>
                <p className="text-gray-700 mb-4">
                  Where personal data is transferred outside the UK, we ensure appropriate safeguards, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Adequacy regulations</li>
                  <li>International Data Transfer Agreements (IDTAs)</li>
                  <li>Standard Contractual Clauses (SCCs)</li>
                </ul>
              </section>

              {/* 7. Data Retention */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
                <p className="text-gray-700 mb-4">
                  We retain personal data only as long as necessary for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Providing Platform services</li>
                  <li>Legal and regulatory compliance</li>
                  <li>Resolving disputes</li>
                  <li>Enforcing agreements</li>
                </ul>
                <p className="text-gray-700 mt-4">Retention periods vary depending on data type and legal requirements.</p>
              </section>

              {/* 8. Data Security */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Security</h2>
                <p className="text-gray-700 mb-4">
                  We implement technical and organisational measures to protect personal data, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Encryption</li>
                  <li>Access controls</li>
                  <li>Secure hosting</li>
                  <li>Monitoring and logging</li>
                  <li>Regular security reviews</li>
                </ul>
                <p className="text-gray-700 mt-4">
                  However, no system is completely secure, and we cannot guarantee absolute security.
                </p>
              </section>

              {/* 9. Your Rights Under UK GDPR */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">9. Your Rights Under UK GDPR</h2>
                <p className="text-gray-700 mb-6">You have the following rights:</p>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">9.1 Right of Access</h3>
                    <p className="text-gray-700">Request a copy of your personal data.</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">9.2 Right to Rectification</h3>
                    <p className="text-gray-700">Correct inaccurate or incomplete data.</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">9.3 Right to Erasure</h3>
                    <p className="text-gray-700">Request deletion of your data (subject to legal exceptions).</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">9.4 Right to Restrict Processing</h3>
                    <p className="text-gray-700">Limit how your data is used.</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">9.5 Right to Data Portability</h3>
                    <p className="text-gray-700">Receive your data in a structured, machine-readable format.</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">9.6 Right to Object</h3>
                    <p className="text-gray-700">Object to processing based on legitimate interests.</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">9.7 Right to Withdraw Consent</h3>
                    <p className="text-gray-700">Withdraw consent at any time.</p>
                  </div>
                </div>

                <p className="text-gray-700 mt-6">
                  To exercise your rights, contact: [Insert Contact Email]
                </p>
              </section>

              {/* 10. Complaints */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Complaints</h2>
                <p className="text-gray-700 mb-4">
                  If you believe your data has been mishandled, you may lodge a complaint with:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 mb-4">
                  <p className="font-medium">Information Commissioner's Office (ICO)</p>
                  <p>Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF</p>
                  <p className="mt-2"><span className="font-medium">Website:</span> ico.org.uk</p>
                </div>
                <p className="text-gray-700">
                  We encourage you to contact us first so we can resolve the issue.
                </p>
              </section>

              {/* 11. Children's Data */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Children's Data</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>The Platform is not intended for individuals under 18 years old.</li>
                  <li>We do not knowingly collect data from minors.</li>
                </ul>
              </section>

              {/* 12. Changes to This Privacy Policy */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>We may update this Privacy Policy from time to time.</li>
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
                  <p>[Contact Email]</p>
                  <p className="mt-4"><span className="font-medium">Data Protection Officer:</span> [Insert Email]</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}