import { useState } from "react";
import { Link } from "react-router-dom";
import { Home, Eye, EyeOff, Mail } from "lucide-react";

export default function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get("token");

  // Stage 1: Request reset email
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Stage 2: Reset password using token
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [step, setStep] = useState("form"); // form | success

  // -----------------------------
  // Stage 1 — Request Reset Email
  // -----------------------------
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setEmailError("");

    if (!email) {
      setEmailError("Please enter your email address.");
      return;
    }

    setEmailLoading(true);

    try {
      const res = await fetch("/api/functions/sendPasswordReset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // Always show success (security best practice)
      setEmailSent(true);
    } catch (_) {
      setEmailSent(true);
    } finally {
      setEmailLoading(false);
    }
  };

  // -----------------------------
  // Stage 2 — Reset Password
  // -----------------------------
  const handleSubmitNewPassword = async (e) => {
    e.preventDefault();
    setResetError("");

    if (!token) {
      setResetError("Invalid or missing reset link. Please request a new one.");
      return;
    }

    if (password !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }

    setResetLoading(true);

    try {
      const res = await fetch("/api/functions/verifyPasswordReset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        if (data.error === "invalid_token") {
          setResetError("This reset link is invalid or has already been used.");
        } else if (data.error === "expired_token") {
          setResetError("This reset link has expired. Please request a new one.");
        } else {
          setResetError("Unable to reset password. Please try again.");
        }
        return;
      }

      setStep("success");
    } catch (err) {
      setResetError("Something went wrong. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  // -----------------------------
  // Success Screen
  // -----------------------------
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

  // -----------------------------
  // Stage 1 — No Token → Email Entry
  // -----------------------------
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HostKeep</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot your password?</h1>
          <p className="text-sm text-gray-500 mb-6">
            Enter your email and we’ll send you a password reset link.
          </p>

          {!emailSent ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {emailError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {emailError}
                </p>
              )}

              <button
                type="submit"
                disabled={emailLoading}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white h-11 text-sm font-semibold rounded-xl transition-colors"
              >
                {emailLoading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-teal-600 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
              If an account exists for this email, a reset link has been sent.
            </p>
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

  // -----------------------------
  // Stage 2 — Token Present → Reset Password
  // -----------------------------
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">HostKeep</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset your password</h1>
        <p className="text-sm text-gray-500 mb-6">Enter a new password for your account.</p>

        <form onSubmit={handleSubmitNewPassword} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">New password</label>
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
            <label className="block text-xs font-medium text-gray-700 mb-1">Confirm new password</label>
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

          {resetError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {resetError}
            </p>
          )}

          <button
            type="submit"
            disabled={resetLoading}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white h-11 text-sm font-semibold rounded-xl transition-colors"
          >
            {resetLoading ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/SignIn" className="text-sm text-teal-600 hover:text-teal-700">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}