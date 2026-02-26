import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";

export default function LegalBackButton() {
  return (
    <Link
      to={createPageUrl("LegalCentre")}
      className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-lg transition-colors mb-6"
    >
      <ArrowLeft className="w-4 h-4" />
      Return to Legal Centre
    </Link>
  );
}