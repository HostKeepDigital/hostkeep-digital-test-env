import { Link } from "react-router-dom";
import { Home } from "lucide-react";

export default function CreatePassword() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">HostKeep</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Create your password
        </h1>

        <p className="text-gray-600 mb-6 text-sm">
          This page has been created successfully.  
          Next brick: we will add the form.
        </p>

        <Link to="/SignIn" className="text-sm text-teal-600 hover:text-teal-700">
          ← Back to Sign In
        </Link>
      </div>
    </div>
  );
}