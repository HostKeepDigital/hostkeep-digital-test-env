import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForgotPassword() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">HostKeep</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">Forgotten your password?</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          To reset your password, please email us at{" "}
          <a href="mailto:admin@hostkeepdigital.co.uk" className="text-teal-600 font-medium">
            admin@hostkeepdigital.co.uk
          </a>{" "}
          and we will send you a reset link within 24 hours.
        </p>

        <a href="mailto:admin@hostkeepdigital.co.uk">
          <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11 text-base font-semibold">
            Email Us
          </Button>
        </a>

        <div className="mt-6">
          <Link to="/SignIn" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}