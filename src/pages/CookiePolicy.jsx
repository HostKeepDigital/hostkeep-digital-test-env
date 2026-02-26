import LegalNavigation from "@/components/legal/LegalNavigation";
import LegalBackButton from "@/components/legal/LegalBackButton";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto flex">
        <div className="hidden lg:block w-64">
          <LegalNavigation currentPage="CookiePolicy" />
        </div>
        
        <div className="flex-1 px-4 py-12 md:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="lg:hidden mb-4">
              <LegalBackButton />
            </div>
            <p className="text-sm text-gray-500 mb-2">Last Updated: February 2026</p>
            <h1 className="text-4xl font-bold text-gray-900 mb-8">Cookie Policy</h1>

            <div className="space-y-8">
              {/* Introduction */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <p className="text-gray-700 leading-relaxed">
                  This Cookie Policy explains how HostKeep Digital Ltd ("HostKeep", "we", "us", "our") uses cookies and similar tracking technologies when you access or use the HostKeep platform ("Platform"). This Policy should be read together with our Privacy Policy.
                </p>
                <p className="text-gray-700 leading-relaxed mt-4">
                  By continuing to use the Platform, you consent to the use of cookies in accordance with this Policy, unless you disable them using the controls described below.
                </p>
              </section>

              {/* 1. What Are Cookies? */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. What Are Cookies?</h2>
                <p className="text-gray-700 mb-4">
                  Cookies are small text files placed on your device when you visit a website or use an application. They help us:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  <li>Recognise your device</li>
                  <li>Remember your preferences</li>
                  <li>Improve Platform performance</li>
                  <li>Analyse usage patterns</li>
                  <li>Provide secure login functionality</li>
                </ul>
                <p className="text-gray-700 mb-4">Cookies may be:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Session cookies (deleted when you close your browser)</li>
                  <li>Persistent cookies (stored until they expire or are deleted)</li>
                  <li>First-party cookies (set by HostKeep)</li>
                  <li>Third-party cookies (set by external providers such as Stripe or analytics tools)</li>
                </ul>
              </section>

              {/* 2. Legal Framework */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Legal Framework</h2>
                <p className="text-gray-700 mb-4">Our use of cookies complies with:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  <li>Privacy and Electronic Communications Regulations (PECR)</li>
                  <li>UK GDPR</li>
                  <li>Data Protection Act 2018</li>
                </ul>
                <p className="text-gray-700 mb-4">Under these laws:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Essential cookies do not require consent</li>
                  <li>Non-essential cookies do require explicit consent</li>
                </ul>
                <p className="text-gray-700 mt-4">We provide a cookie banner to obtain consent where required.</p>
              </section>

              {/* 3. Types of Cookies We Use */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">3. Types of Cookies We Use</h2>
                <p className="text-gray-700 mb-6">We use the following categories of cookies:</p>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.1 Strictly Necessary Cookies (Essential)</h3>
                    <p className="text-gray-700 mb-3">
                      These cookies are required for the Platform to function. They enable:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 mb-3">
                      <li>Secure login</li>
                      <li>Account authentication</li>
                      <li>Navigation</li>
                      <li>Fraud prevention</li>
                      <li>Payment processing</li>
                      <li>Core Platform features</li>
                    </ul>
                    <p className="text-gray-700 mb-3">You cannot disable these cookies through our cookie banner.</p>
                    <p className="text-gray-700 mb-2">Examples include:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Session identifiers</li>
                      <li>Security tokens</li>
                      <li>Stripe payment session cookies</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.2 Functional Cookies</h3>
                    <p className="text-gray-700 mb-3">
                      These cookies enable enhanced functionality and personalisation, such as:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 mb-3">
                      <li>Remembering your preferences</li>
                      <li>Saving language settings</li>
                      <li>Storing listing filters</li>
                    </ul>
                    <p className="text-gray-700">Disabling these may reduce Platform usability.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.3 Performance & Analytics Cookies</h3>
                    <p className="text-gray-700 mb-3">
                      These cookies help us understand how Users interact with the Platform, including:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 mb-3">
                      <li>Pages visited</li>
                      <li>Time spent on pages</li>
                      <li>Features used</li>
                      <li>Error reports</li>
                    </ul>
                    <p className="text-gray-700 mb-3">We use this information to improve Platform performance.</p>
                    <p className="text-gray-700 mb-2">Examples include:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 mb-3">
                      <li>Analytics tools (e.g., Google Analytics, if implemented)</li>
                      <li>Internal performance tracking</li>
                    </ul>
                    <p className="text-gray-700">These cookies require consent.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.4 Advertising & Marketing Cookies</h3>
                    <p className="text-gray-700 mb-3">HostKeep does not currently use advertising cookies.</p>
                    <p className="text-gray-700">If this changes, we will update this Policy and request fresh consent.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">3.5 Third-Party Cookies</h3>
                    <p className="text-gray-700 mb-4">Third-party providers may set cookies when you use the Platform, including:</p>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium text-gray-900">Stripe</p>
                        <p className="text-gray-700 text-sm mb-2">Used for:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-2">
                          <li>Payment processing</li>
                          <li>Fraud detection</li>
                          <li>Identity verification</li>
                          <li>Secure checkout</li>
                        </ul>
                      </div>

                      <div>
                        <p className="font-medium text-gray-900">Analytics Providers</p>
                        <p className="text-gray-700 text-sm mb-2">Used for:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-2">
                          <li>Performance monitoring</li>
                          <li>Usage analysis</li>
                        </ul>
                      </div>

                      <div>
                        <p className="font-medium text-gray-900">Hosting & Infrastructure Providers</p>
                        <p className="text-gray-700 text-sm mb-2">Used for:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-2">
                          <li>Load balancing</li>
                          <li>Security</li>
                          <li>Uptime monitoring</li>
                        </ul>
                      </div>
                    </div>

                    <p className="text-gray-700 mt-4">These providers may act as independent controllers.</p>
                  </div>
                </div>
              </section>

              {/* 4. Cookie Consent */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Cookie Consent</h2>
                <p className="text-gray-700 mb-4">When you first visit the Platform, you will see a cookie banner that:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Explains our use of cookies</li>
                  <li>Allows you to accept or reject non-essential cookies</li>
                  <li>Links to this Cookie Policy</li>
                </ul>
                <p className="text-gray-700 mt-4">You may change your preferences at any time.</p>
              </section>

              {/* 5. How to Manage Cookies */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">5. How to Manage Cookies</h2>
                <p className="text-gray-700 mb-6">You can manage or disable cookies through:</p>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">5.1 Browser Settings</h3>
                    <p className="text-gray-700 mb-2">Most browsers allow you to:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Block all cookies</li>
                      <li>Block third-party cookies</li>
                      <li>Delete existing cookies</li>
                      <li>Receive alerts before cookies are stored</li>
                    </ul>
                    <p className="text-gray-700 mt-2 text-sm">Instructions vary by browser (Chrome, Safari, Firefox, Edge, etc.).</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">5.2 Cookie Banner</h3>
                    <p className="text-gray-700">You may adjust your preferences using the cookie settings tool on the Platform.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">5.3 Third-Party Opt-Out Tools</h3>
                    <p className="text-gray-700">Some providers offer their own opt-out mechanisms.</p>
                  </div>
                </div>
              </section>

              {/* 6. Consequences of Disabling Cookies */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Consequences of Disabling Cookies</h2>
                <p className="text-gray-700 mb-4">If you disable essential or functional cookies:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>You may not be able to log in</li>
                  <li>Some features may not work</li>
                  <li>Listings may not display correctly</li>
                  <li>Payments may fail</li>
                  <li>The Platform may become unstable</li>
                </ul>
                <p className="text-gray-700">
                  HostKeep is not responsible for reduced functionality caused by cookie restrictions.
                </p>
              </section>

              {/* 7. Changes to This Cookie Policy */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Changes to This Cookie Policy</h2>
                <p className="text-gray-700 mb-4">We may update this Policy from time to time to reflect:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>Changes in law</li>
                  <li>Changes in cookie usage</li>
                  <li>Changes in Platform functionality</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  The "Last Updated" date will indicate the latest version.
                </p>
                <p className="text-gray-700">
                  Continued use of the Platform constitutes acceptance of updated terms.
                </p>
              </section>

              {/* 8. Contact Information */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Contact Information</h2>
                <p className="text-gray-700 mb-4">If you have questions about this Cookie Policy, contact:</p>
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