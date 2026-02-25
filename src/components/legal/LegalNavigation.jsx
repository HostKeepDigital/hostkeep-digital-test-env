import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

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
];

export default function LegalNavigation({ currentPage }) {
  return (
    <nav className="bg-white border-r border-gray-200 p-6 h-full sticky top-0">
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
  );
}