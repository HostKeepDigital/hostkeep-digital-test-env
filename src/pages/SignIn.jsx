import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CORNWALL_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/vecteezy_cornwall-coast-in-england_2524414.jpg";
const LOGO_IMG = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/HostKeep_Digital_Navy_Background.png";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const isApp = localStorage.getItem("is_app") === "true";

      const res = await base44.functions.invoke("customSignIn", { email, password, is_app: isApp });
      const data = res.data;

      if (!data.success) {
        const messages = {
          invalid_credentials: "Incorrect email or password.",
          missing_fields: "Please enter your email and password.",
          server_error: "Something went wrong. Please try again.",
        };
        const newAttempts = data.error === "invalid_credentials" ? failedAttempts + 1 : failedAttempts;
        if (data.error === "invalid_credentials") setFailedAttempts(newAttempts);
        setError(messages[data.error] || "Unable to sign in. Please try again.");
        return;
      }

      localStorage.setItem("session_token", data.session_token);
      if (data.expires_at) {
        localStorage.setItem("session_expires_at", data.expires_at);
      }

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      window.location.href = next || "/";
    } catch (err) {
      console.error("SignIn error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* Left panel — Cornwall photography */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={CORNWALL_IMG}
          alt="Cornwall coast"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Navy gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F]/90 via-[#1E3A5F]/70 to-[#0d9488]/50" />

        {/* Content over image */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src={LOGO_IMG}
              alt="HostKeep Digital"
              className="h-60 w-auto"
            />
          </div>

          {/* Centre quote */}
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

          {/* Bottom stats */}
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

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src={LOGO_IMG}
              alt="HostKeep Digital"
              className="h-20 w-auto"
            />
          </div>

          <h2 className="text-2xl font-bold text-[#111827] dark:text-white mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Sign in to your HostKeep account</p>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 tracking-wide uppercase">
                Email address
              </label>
              <input
                type="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 tracking-wide uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  inputMode="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 pr-11 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition-colors"
                />
                <button
                 type="button"
                 tabIndex={-1}
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <Link
                  to="/ResetPassword"
                  className="text-xs text-[#0d9488] hover:text-[#0f766e] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 flex flex-col gap-1.5">
                <p className="text-sm font-semibold text-red-700">
                  {failedAttempts >= 3
                    ? "Still having trouble? Your password may need resetting."
                    : error}
                </p>
                {failedAttempts >= 3 ? (
                  <p className="text-xs text-red-600">
                    You've entered an incorrect password {failedAttempts} times.{" "}
                    <Link to="/ResetPassword" className="underline font-semibold hover:text-red-800">
                      Click here to reset your password
                    </Link>.
                  </p>
                ) : failedAttempts > 0 ? (
                  <p className="text-xs text-red-500">
                    Double-check your password or{" "}
                    <Link to="/ResetPassword" className="underline font-medium hover:text-red-700">
                      reset it here
                    </Link>.
                  </p>
                ) : null}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1E3A5F] hover:bg-[#162d4a] disabled:opacity-60 text-white font-semibold text-sm rounded-xl py-3.5 transition-colors min-h-[52px]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : "Sign In"}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Looking to book a stay?{" "}
              <Link to="/GuestSignUp" className="text-[#0d9488] font-semibold hover:text-[#0f766e] transition-colors">
                Create a guest account
              </Link>
            </p>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Want to host?{" "}
              <Link to="/founding" className="text-[#0d9488] font-semibold hover:text-[#0f766e] transition-colors">
                Apply for a founding spot
              </Link>
            </p>
            <div className="text-center">
              <Link to="/" className="inline-block text-sm font-semibold text-white bg-[#0d9488] hover:bg-[#0f766e] rounded-xl px-5 py-2.5 transition-colors">
                ← Back to Home
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © 2026 HostKeep Digital Ltd · Cornwall, UK
          </p>
        </div>
      </div>
    </div>
  );
}