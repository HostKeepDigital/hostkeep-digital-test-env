import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Home, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("form"); // form | success

  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset link. Please request a new one.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid or missing reset link. Please request a new one.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await base44.auth.updatePassword(password);

      // Send confirmation email
      try {
        const user = await base44.auth.me();
        if (user?.email) {
          await base44.functions.invoke("sendEmail", {
            to: user.email,
            subject: "Your HostKeep password has been changed",
            html: `
              <p>Your password has been successfully updated.</p>
              <p>If this wasn't you, please contact <a href="mailto:admin@hostkeepdigital.co.uk">admin@hostkeepdigital.co.uk</a> immediately.</p>
            `,
          });
        }
      } catch (_) {
        // Non-fatal — proceed to success even if email fails
      }

      setStep("success");
    } catch (err) {
      setError(err?.message || "Failed to reset your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HostKeep</span>
          </div>
          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Password reset</h1>
          <p className="text-gray-500 text-sm mb-8">
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
          <Link
            to="/SignIn"
            className="inline-block w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-xl h-11 leading-[44px] transition-colors"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">HostKeep</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset your password</h1>
        <p className="text-sm text-gray-500 mb-6">Enter a new password for your account.</p>

        {!token ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            Invalid or missing reset link. Please request a new one.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  placeholder="Choose a secure password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  placeholder="Retype your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white h-11 text-sm font-semibold rounded-xl transition-colors"
            >
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/SignIn" className="text-sm text-teal-600 hover:text-teal-700">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}