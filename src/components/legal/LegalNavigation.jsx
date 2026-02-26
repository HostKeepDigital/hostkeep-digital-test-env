import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";

const legalPages = [
  { name: "Legal Centre", page: "LegalCentre" },
  { name: "Terms & Conditions", page: "TermsAndConditions" },
  { name: "Privacy Policy", page: "PrivacyPolicy" },
  { name: "Cookie Policy", page: "CookiePolicy" },
  { name: "Payment Policy", page: "PaymentPolicy" },
  { name: "Refund Policy", page: "RefundPolicy" },
  { name: "Dispute Policy", page: "DisputePolicy" },
  { name: "Host Terms", page: "HostTerms" },
  { name: "Cleaner Terms", page: "CleanerTerms" },
  { name: "Guest Terms", page: "GuestTerms" },
  { name: "Accessibility Statement", page: "Accessibility" },
];

export default function LegalNavigation({ currentPage }) {
  return (
    <>
      {/* Mobile back button */}
      {currentPage !== "LegalCentre" && (
        <div className="lg:hidden px-4 pt-4">
          <Link
            to={createPageUrl("LegalCentre")}
            className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Legal Centre
          </Link>
        </div>
      )}

      {/* Desktop sidebar */}
      <nav className="hidden lg:block bg-white border-r border-gray-200 p-6 h-full sticky top-0">
        <h3 className="font-semibold text-gray-900 mb-4">Legal Centre</h3>
        <div className="space-y-2">
          {legalPages.map(({ name, page }) => (
            <Link
              key={page}
              to={createPageUrl(page)}
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? "bg-teal-50 text-teal-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {name}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}