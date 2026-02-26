import LegalNavigation from "@/components/legal/LegalNavigation";
import LegalBackButton from "@/components/legal/LegalBackButton";

export default function Accessibility() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto flex">
        <div className="hidden lg:block w-64">
          <LegalNavigation currentPage="Accessibility" />
        </div>
        
        <div className="flex-1 px-4 py-12 md:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="lg:hidden mb-4">
              <LegalBackButton />
            </div>
            <p className="text-sm text-gray-500 mb-2">Last Updated: February 2026</p>
            <h1 className="text-4xl font-bold text-gray-900 mb-8">Accessibility Statement</h1>

            <div className="space-y-8">
              {/* Introduction */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <p className="text-gray-700 leading-relaxed">
                  HostKeep Digital Ltd ("HostKeep", "we", "us", "our") is committed to ensuring digital accessibility for all individuals, including people with disabilities. We are continuously working to improve the usability of the HostKeep platform ("Platform") to conform with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards and relevant accessibility legislation, including the Equality Act 2010.
                </p>
              </section>

              {/* Our Commitment */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Commitment to Accessibility</h2>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    We believe that digital accessibility is essential for an inclusive web. HostKeep is committed to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
                    <li>Providing a Platform that is perceivable, operable, understandable, and robust</li>
                    <li>Ensuring keyboard navigation is fully supported</li>
                    <li>Providing alternative text for images and visual content</li>
                    <li>Maintaining clear colour contrast for readability</li>
                    <li>Offering flexible text sizing and font options</li>
                    <li>Ensuring compatibility with screen readers and assistive technologies</li>
                    <li>Continuously testing and improving accessibility features</li>
                  </ul>
                </div>
              </section>

              {/* Current Accessibility Features */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Current Accessibility Features</h2>
                <div className="space-y-4">
                  <p className="text-gray-700 mb-4">The Platform currently includes:</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
                    <li>Semantic HTML structure for proper document navigation</li>
                    <li>ARIA labels and roles to assist screen readers</li>
                    <li>Keyboard-accessible navigation and interactive elements</li>
                    <li>Alt text for all meaningful images</li>
                    <li>Focus indicators for keyboard users</li>
                    <li>Resizable text and responsive design</li>
                    <li>Captions and transcripts where applicable</li>
                    <li>Clear language and simplified terminology</li>
                  </ul>
                </div>
              </section>

              {/* Known Limitations */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Known Limitations</h2>
                <p className="text-gray-700 mb-4">
                  While we strive for full accessibility, some features may have limitations:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
                  <li>User-uploaded content (such as property photos or descriptions) may not meet accessibility standards if not formatted correctly by Users</li>
                  <li>Third-party integrations (such as payment processors) may have varying accessibility standards</li>
                  <li>Some interactive maps and calendars may have limited screen reader support</li>
                </ul>
              </section>

              {/* Third-Party Services */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
                <p className="text-gray-700">
                  The Platform integrates with third-party services, including Stripe for payments and other infrastructure providers. These services have their own accessibility policies. HostKeep is not responsible for the accessibility of third-party platforms, but we work with providers who prioritise accessibility standards.
                </p>
              </section>

              {/* Accessibility Testing */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Accessibility Testing and Improvements</h2>
                <p className="text-gray-700 mb-4">
                  HostKeep regularly conducts accessibility testing, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
                  <li>Automated accessibility audits</li>
                  <li>Manual testing with assistive technologies</li>
                  <li>User testing with individuals with disabilities</li>
                  <li>Regular WCAG 2.1 compliance reviews</li>
                </ul>
              </section>

              {/* Reporting Accessibility Issues */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Reporting Accessibility Issues</h2>
                <p className="text-gray-700 mb-4">
                  If you experience accessibility barriers or have suggestions for improving the Platform's accessibility, please contact us. We welcome feedback and will work to address accessibility issues promptly.
                </p>
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mt-4">
                  <p className="text-gray-900 font-medium mb-2">Contact Information:</p>
                  <p className="text-gray-700">[Contact Email]</p>
                  <p className="text-gray-700">[Contact Phone]</p>
                  <p className="text-gray-700 text-sm mt-3">Please include details about the accessibility issue and, if possible, the device or assistive technology you are using.</p>
                </div>
              </section>

              {/* Accommodations */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Accommodations and Support</h2>
                <p className="text-gray-700">
                  If you require specific accommodations to use the Platform, please contact us. We are committed to providing reasonable adjustments to ensure you can access our services. Examples of accommodations may include:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2 mt-4">
                  <li>Alternative formats for information</li>
                  <li>Assistance with account setup</li>
                  <li>Customised interface options</li>
                  <li>Technical support for accessibility tools</li>
                </ul>
              </section>

              {/* Legal Basis */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Legal Basis</h2>
                <p className="text-gray-700 mb-4">
                  This Accessibility Statement is provided in accordance with the Equality Act 2010 and the UK Accessibility Regulations 2018. HostKeep is committed to complying with these legal requirements.
                </p>
              </section>

              {/* Continuous Improvement */}
              <section className="bg-white rounded-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Continuous Improvement</h2>
                <p className="text-gray-700">
                  Accessibility is an ongoing process. HostKeep regularly reviews and updates the Platform to enhance accessibility features. We are committed to maintaining and improving our accessibility standards as technology evolves and best practices develop.
                </p>
              </section>

              {/* Last Updated */}
              <section className="bg-blue-50 border border-blue-200 rounded-xl p-8">
                <p className="text-gray-700">
                  This Accessibility Statement was last reviewed in February 2026. We will update this statement if significant changes are made to the Platform's accessibility features.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}