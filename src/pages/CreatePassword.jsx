import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

const CORNWALL_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/vecteezy_cornwall-coast-in-england_2524414.jpg";
const LOGO_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/HostKeep_Digital_Navy_Background.png";

export default function CreatePassword() {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch("/functions/validateOnboardingToken", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!data.valid) {
          setError("This onboarding link is invalid or has expired.");
          setLoading(false);
          return;
        }
        setEmail(data.email);
        setValid(true);
        setLoading(false);
      } catch {
        setError("Unable to validate onboarding link.");
        setLoading(false);
      }
    }
    validate();
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/functions/setOnboardingPassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError("Unable to create your account. Please try again.");
        return;
      }

      localStorage.setItem("session_token", data.session_token);
      if (data.expires_at) {
        localStorage.setItem("session_expires_at", data.expires_at);
      }
      window.location.href = "/";
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const passwordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 8) return { label: "Too short", color: "bg-red-400", width: "w-1/4" };
    if (password.length < 12) return { label: "Fair", color: "bg-amber-400", width: "w-2/4" };
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { label: "Good", color: "bg-[#0d9488]", width: "w-3/4" };
    return { label: "Strong", color: "bg-green-500", width: "w-full" };
  };
  const strength = passwordStrength();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#0d9488] rounded-full animate-spin" />
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Link expired</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <p className="text-sm text-gray-400">
            Contact us at{" "}
            <a href="mailto:hello@hostkeepdigital.co.uk" className="text-[#0d9488]">
              hello@hostkeepdigital.co.uk
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={CORNWALL_IMG}
          alt="Cornwall coast"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F]/90 via-[#1E3A5F]/70 to-[#0d9488]/50" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <img src={LOGO_IMG} alt="HostKeep Digital" className="h-60 w-auto" />
          </div>
          <div>
            <p className="text-white/60 text-sm font-medium tracking-[0.2em] uppercase mb-4">
              Cornwall · Summer 2026
            </p>
            <h1 className="text-white text-4xl font-bold leading-tight mb-6">
              Your property.<br />
              Your price.<br />
              <span className="text-[#0d9488]">Zero commission.</span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              HostKeep gives Cornwall hosts everything Airbnb offers at a flat monthly rate — not a cut of every booking.
            </p>
          </div>
          <div className="flex gap-8">
            {[
              { value: "0%", label: "Commission" },
              { value: "£29", label: "From /month" },
              { value: "50", label: "Founding spots" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-white text-2xl font-bold">{s.value}</p>
                <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white dark:bg-gray-900">
        <div className="w-full max-w-sm">

          <div className="lg:hidden flex justify-center mb-8">
            <img
              src={LOGO_IMG}
              alt="HostKeep Digital"
              className="h-20 w-auto"
            />
          </div>

          <h2 className="text-2xl font-bold text-[#111827] dark:text-white mb-1">Create your password</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Setting up account for
          </p>
          <p className="text-sm font-semibold text-[#1E3A5F] mb-8 bg-blue-50 px-3 py-2 rounded-lg inline-block">
            {email}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 tracking-wide uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a secure password"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 pr-11 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {strength && (
                <div className="mt-2">
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{strength.label}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 tracking-wide uppercase">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retype your password"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 pr-11 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition-colors"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle size={12} /> Passwords match
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#0d9488] hover:bg-[#0f766e] disabled:opacity-60 text-white font-semibold text-sm rounded-xl py-3.5 transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : "Activate my account"}
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