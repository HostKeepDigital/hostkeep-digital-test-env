import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Mail, CheckCircle } from "lucide-react";

const CORNWALL_IMG = "https://drive.google.com/uc?export=view&id=1ZmljdO7m9HdHdT_KKSa0S-p2e9ctR5BU";
const LOGO_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/HostKeep_Digital_Navy_Background.png";

export default function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get("token");

  // Stage 1 — request reset
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Stage 2 — new password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [step, setStep] = useState("form"); // form | success | invalid | expired

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setEmailError("");
    if (!email) { setEmailError("Please enter your email address."); return; }
    setEmailLoading(true);
    try {
      await fetch("/functions/sendPasswordReset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setEmailSent(true);
    } catch (_) {
      setEmailSent(true);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSubmitNewPassword = async (e) => {
    e.preventDefault();
    setResetError("");

    if (!token) { setResetError("Invalid or missing reset link. Please request a new one."); return; }
    if (password !== confirmPassword) { setResetError("Passwords do not match."); return; }
    if (password.length < 8) { setResetError("Password must be at least 8 characters."); return; }

    setResetLoading(true);

    try {
      const res = await fetch("/functions/verifyPasswordReset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();

      if (!data.success) {
        if (data.error === "invalid_token") {
          setStep("invalid");
        } else if (data.error === "expired_token") {
          setStep("expired");
        } else {
          setResetError("Unable to reset password. Please try again.");
        }
        return;
      }

      setStep("success");
    } catch {
      setResetError("Something went wrong. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  const LeftPanel = () => (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
      <img
        src={CORNWALL_IMG}
        alt="Cornwall coast"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F]/90 via-[#1E3A5F]/70 to-[#0d9488]/50" />
      <div className="relative z-10 flex flex-col justify-between p-12 w-full">
        <img
          src={LOGO_IMG}
          alt="HostKeep Digital"
          className="h-12 w-auto"
        />
        <div>
          <p className="text-white/60 text-sm font-medium tracking-[0.2em] uppercase mb-4">
            We've got your back
          </p>
          <h1 className="text-white text-4xl font-bold leading-tight mb-6">
            Here to help,<br />
            every step<br />
            <span className="text-[#0d9488]">of the way.</span>
          </h1>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            HostKeep was built by people who understand the challenges small, independent hosts face. Whether it's a forgotten password or a tricky booking — we're always here.
          </p>
        </div>
        <p className="text-white/40 text-sm">
          Need help?{" "}
          <a href="mailto:hello@hostkeepdigital.co.uk" className="text-white/60 underline underline-offset-2">
            hello@hostkeepdigital.co.uk
          </a>
        </p>
      </div>
    </div>
  );

  const MobileLogo = () => (
    <div className="lg:hidden flex justify-center mb-8">
      <img src={LOGO_IMG} alt="HostKeep Digital" className="h-12 w-auto" />
    </div>
  );

  // Success
  if (step === "success") {
    return (
      <div className="min-h-screen flex">
        <LeftPanel />
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white">
          <div className="w-full max-w-sm text-center">
            <MobileLogo />
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-[#111827] mb-3">Password updated</h2>
            <p className="text-sm text-gray-500 mb-8">
              Your password has been successfully changed. You can now sign in with your new password.
            </p>
            <Link
              to="/SignIn"
              className="inline-block w-full bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold text-sm rounded-xl py-3.5 transition-colors text-center"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token
  if (step === "invalid") {
    return (
      <div className="min-h-screen flex">
        <LeftPanel />
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white">
          <div className="w-full max-w-sm text-center">
            <MobileLogo />
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#111827] mb-3">Link already used</h2>
            <p className="text-sm text-gray-500 mb-8">
              This reset link has already been used or is invalid. Reset links can only be used once — please request a new one if you need to change your password.
            </p>
            <div className="space-y-3">
              <Link
                to="/ResetPassword"
                className="inline-block w-full bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold text-sm rounded-xl py-3.5 transition-colors text-center"
              >
                Request a new link
              </Link>
              <Link
                to="/SignIn"
                className="inline-block w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-2 text-center"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expired token
  if (step === "expired") {
    return (
      <div className="min-h-screen flex">
        <LeftPanel />
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white">
          <div className="w-full max-w-sm text-center">
            <MobileLogo />
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#111827] mb-3">Link expired</h2>
            <p className="text-sm text-gray-500 mb-8">
              This reset link has expired — links are valid for 1 hour. Please request a new one and complete the process within that window.
            </p>
            <div className="space-y-3">
              <Link
                to="/ResetPassword"
                className="inline-block w-full bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold text-sm rounded-xl py-3.5 transition-colors text-center"
              >
                Request a new link
              </Link>
              <Link
                to="/SignIn"
                className="inline-block w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-2 text-center"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No token — email entry form
  if (!token) {
    return (
      <div className="min-h-screen flex">
        <LeftPanel />
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white">
          <div className="w-full max-w-sm">
            <MobileLogo />

            <h2 className="text-2xl font-bold text-[#111827] mb-1">Forgot your password?</h2>
            <p className="text-sm text-gray-500 mb-8">
              Enter your email and we'll send you a reset link.
            </p>

            {!emailSent ? (
              <form onSubmit={handleRequestReset} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide uppercase">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 pl-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition-colors"
                    />
                  </div>
                </div>

                {emailError && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <p className="text-sm text-red-600">{emailError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={emailLoading}
                  className="w-full bg-[#1E3A5F] hover:bg-[#162d4a] disabled:opacity-60 text-white font-semibold text-sm rounded-xl py-3.5 min-h-[52px] transition-colors"
                >
                  {emailLoading ? "Sending..." : "Send reset link"}
                </button>
              </form>
            ) : (
              <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#0d9488] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-teal-800">
                    If an account exists for <strong>{email}</strong>, a reset link has been sent. Check your inbox — and your junk or spam folder.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-8 text-center">
              <Link to="/SignIn" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                ← Back to Sign In
              </Link>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              © 2026 HostKeep Digital Ltd · Cornwall, UK
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Token present — new password form
  return (
    <div className="min-h-screen flex">
      <LeftPanel />
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <MobileLogo />

          <h2 className="text-2xl font-bold text-[#111827] mb-1">Set new password</h2>
          <p className="text-sm text-gray-500 mb-8">Choose a strong password for your account.</p>

          <form onSubmit={handleSubmitNewPassword} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide uppercase">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a secure password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 pr-11 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide uppercase">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retype your new password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 pr-11 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition-colors"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {resetError && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600">{resetError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={resetLoading}
              className="w-full bg-[#1E3A5F] hover:bg-[#162d4a] disabled:opacity-60 text-white font-semibold text-sm rounded-xl py-3.5 transition-colors"
            >
              {resetLoading ? "Updating..." : "Update password"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link to="/SignIn" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Back to Sign In
            </Link>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © 2026 HostKeep Digital Ltd · Cornwall, UK
          </p>
        </div>
      </div>
    </div>
  );
}