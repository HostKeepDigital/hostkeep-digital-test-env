import { Home } from "lucide-react";
import { Link } from "react-router-dom";

export default function Pending() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-6">
          <Home className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Application Under Review</h1>
        <p className="text-gray-600 leading-relaxed mb-6">
          Thanks for registering with HostKeep. We're reviewing your application and will be in touch shortly.
        </p>
        <p className="text-gray-500 text-sm">
          Questions? Email{" "}
          <a href="mailto:hello@hostkeepdigital.co.uk" className="text-teal-600 hover:underline font-medium">
            hello@hostkeepdigital.co.uk
          </a>
        </p>
      </div>
    </div>
  );
}