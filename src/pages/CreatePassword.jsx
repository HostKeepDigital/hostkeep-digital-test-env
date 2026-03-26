import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Home, Eye, EyeOff } from "lucide-react";

export default function CreatePassword() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [emailValid, setEmailValid] = useState(null); // null = untouched, true/false = checked // null = untouched, true/false = checked
  const [step, setStep] = useState("form"); // form → success // form → success

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check if email exists via Base44 SDK
  const checkEmailExists = async (email) => {
    try {
      const res = await base44.functions.invoke("checkUserExists", { email });
      return res.data?.exists === true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 1. Passwords must match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // 2. Email must exist in HostKeep
    const exists = await checkEmailExists(email);
    if (!exists) {
      setEmailValid(false);
      setError("This email is not registered with HostKeep.");
      return;
    }

    setEmailValid(true);

    // 3. Move to success screen (next brick will call Base44)
    setStep("success");
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Password created successfully
          </h1>
          <p className="text-gray-600 mb-6 text-sm">
            Your password has been accepted.  
            Next brick: we will redirect you into onboarding.
          </p>
          <Link to="/SignIn" className="text-teal-600 font-medium">
            Go to Sign In →
          </Link>
        </div>
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
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailValid(null);
              }}
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                emailValid === false ? "border-red-500" : "border-gray-200"
              }`}
              placeholder="you@example.com"
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
                className={`w-full border rounded-lg px-3 py-2 text-sm ${
                  error && password !== confirmPassword
                    ? "border-red-500"
                    : "border-gray-200"
                }`}
                placeholder="Choose a secure password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
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
                className={`w-full border rounded-lg px-3 py-2 text-sm ${
                  error && password !== confirmPassword
                    ? "border-red-500"
                    : "border-gray-200"
                }`}
                placeholder="Retype your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
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