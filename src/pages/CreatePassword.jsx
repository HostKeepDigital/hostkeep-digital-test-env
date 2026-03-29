import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Home, Eye, EyeOff } from "lucide-react";

export default function CreatePassword() {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token");

  // 1) Validate onboarding token
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

      } catch (err) {
        setError("Unable to validate onboarding link.");
        setLoading(false);
      }
    }

    validate();
  }, [token]);

  // 2) Submit password
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

    const res = await fetch("/functions/createonboardingpassword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!data.success) {
      setError("Unable to create your account. Please try again.");
      return;
    }

    window.location.href = `/ResetPassword?token=${data.resetToken}`;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Validating your link...</p>
      </div>
    );
  }

  // Invalid token
  if (!valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HostKeep</span>
          </div>
          <p className="text-red-500 text-sm">{error}</p>
          <p className="text-gray-400 text-sm mt-3">
            Please contact us at{" "}
            <a href="mailto:hello@hostkeepdigital.co.uk" className="text-teal-600">
              hello@hostkeepdigital.co.uk
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Password form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10">

        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">HostKeep</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Create your password
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          Setting up account for <strong className="text-gray-600">{email}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm border-gray-200 pr-10"
                placeholder="Choose a secure password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Confirm password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm border-gray-200 pr-10"
                placeholder="Retype your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11 text-sm font-semibold rounded-lg"
          >
            Create password
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