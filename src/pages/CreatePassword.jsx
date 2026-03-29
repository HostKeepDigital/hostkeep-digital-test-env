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
          setError("This onboarding link is invalid or expired.");
          setLoading(false);
          return;
        }

        // Email returned from backend
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

  // 2) Submit onboarding password
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
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

// Use the password they already entered — no redirect needed
const resetRes = await fetch("/functions/verifyPasswordReset", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token: data.resetToken, newPassword: password }),
});

const resetData = await resetRes.json();

if (!resetData.success) {
  setError("Unable to set your password. Please try again.");
  return;
}

window.location.href = "/SignIn";


  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading…</p>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10">

        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">HostKeep</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Create your password
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm border-gray-200"
              placeholder="Enter your email"
            />
          </div>

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
                className="w-full border rounded-lg px-3 py-2 text-sm border-gray-200"
                placeholder="Choose a secure password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Retype password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm border-gray-200"
                placeholder="Retype your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
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
          <Link
            to="/SignIn"
            className="text-sm text-teal-600 hover:text-teal-700"
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}