import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LegalNavigation from "@/components/legal/LegalNavigation";

export default function LegalCentre() {
  const documents = [
    { title: "Terms & Conditions", description: "The master agreement governing access to and use of the Platform.", page: "TermsAndConditions" },
    { title: "Privacy Policy", description: "Explains how HostKeep collects, uses, stores, and protects personal data in accordance with UK GDPR and the Data Protection Act 2018.", page: "PrivacyPolicy" },
    { title: "Cookie Policy", description: "Describes the cookies and tracking technologies used on the Platform and how users can manage their preferences.", page: "CookiePolicy" },
    { title: "Payment Policy", description: "Sets out how payments are processed by Stripe, including escrow holding, payout scheduling, chargebacks, and HostKeep's non-liability for payment disputes.", page: "PaymentPolicy" },
    { title: "Refund Policy", description: "Explains subscription refund rules and clarifies that service-related refunds are handled directly between Users.", page: "RefundPolicy" },
    { title: "Dispute Policy", description: "Describes HostKeep's optional mediation role, evidence handling, fund holds, and jurisdiction rules.", page: "DisputePolicy" },
    { title: "Host Terms", description: "Additional obligations and responsibilities for Hosts listing accommodation on the Platform.", page: "HostTerms" },
    { title: "Cleaner Terms", description: "Additional obligations and responsibilities for Cleaners offering services through the Platform.", page: "CleanerTerms" },
    { title: "Guest Terms", description: "Additional obligations and responsibilities for Guests booking accommodation.", page: "GuestTerms" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto flex">
        <div className="hidden lg:block w-64">
          <LegalNavigation currentPage="LegalCentre" />
        </div>
        
        <div className="flex-1 px-4 py-12 md:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">HostKeep Digital Ltd</h1>
            <p className="text-lg text-gray-600 mb-8">Legal Centre</p>

            <section className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Welcome to the HostKeep Legal Centre</h2>
              <p className="text-gray-700 mb-4">
                This page provides access to all legal documents governing the use of the HostKeep platform ("Platform"). These documents are designed to ensure transparency, compliance with UK law, and clarity regarding the rights and responsibilities of all users of the Platform.
              </p>
              <p className="text-gray-700">
                HostKeep Digital Ltd ("HostKeep", "we", "us", "our") operates the Platform as a digital infrastructure provider, enabling Hosts, Guests, and Cleaners to connect, communicate, and contract directly with one another. HostKeep does not act as a letting agent, travel agent, property manager, employer, or financial services provider.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Legal Documents</h2>
              <div className="grid gap-4">
                {documents.map((doc) => (
                  <Link
                    key={doc.page}
                    to={createPageUrl(doc.page)}
                    className="block p-6 bg-white rounded-xl border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all"
                  >
                    <h3 className="text-lg font-semibold text-teal-700 mb-2">{doc.title}</h3>
                    <p className="text-gray-600">{doc.description}</p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="bg-blue-50 rounded-xl p-8 border border-blue-200 shadow-sm mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About CleanKeep</h2>
              <p className="text-gray-700">
                CleanKeep is the cleaner-facing section of the HostKeep Platform. It is a brand layer only and not a separate legal entity. All services, terms, and legal obligations related to CleanKeep are governed by the same legal documents and operate under HostKeep Digital Ltd.
              </p>
            </section>

            <section className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Updates to Legal Documents</h2>
              <p className="text-gray-700 mb-4">HostKeep may update these documents from time to time to reflect:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                <li>Changes in law</li>
                <li>Changes in Platform functionality</li>
                <li>Regulatory requirements</li>
                <li>Operational improvements</li>
              </ul>
              <p className="text-gray-700">The "Last Updated" date will appear at the top of each document. Continued use of the Platform constitutes acceptance of updated terms.</p>
            </section>

            <section className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Regulatory Compliance</h2>
              <p className="text-gray-700 mb-4">HostKeep Digital Ltd complies with:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                <li>UK GDPR</li>
                <li>Data Protection Act 2018</li>
                <li>Consumer Rights Act 2015</li>
                <li>Consumer Contracts Regulations 2013</li>
                <li>Electronic Commerce Regulations 2002</li>
                <li>Proceeds of Crime Act 2002</li>
                <li>UK Money Laundering Regulations</li>
              </ul>
              <p className="text-gray-700 text-sm font-medium">HostKeep Digital Ltd is not a letting agent, property manager, travel agent, or financial institution.</p>
            </section>

            <section className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  <span className="font-medium">HostKeep Digital Ltd</span><br />
                  [Registered Address]<br />
                  [Company Number]<br />
                  [Contact Email]
                </p>
                <p>
                  <span className="font-medium">Data Protection Officer</span><br />
                  HostKeep Digital Ltd<br />
                  [Email Address]
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}