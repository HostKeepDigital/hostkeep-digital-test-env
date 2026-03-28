import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";

export default function CreatePassword() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
          setError("This onboarding link is invalid or expired.");
        } else {
          setEmail(data.email);
        }
      } catch {
        setError("Unable to validate onboarding link.");
      } finally {
        setLoading(false);
      }
    }
    validate();
  }, [token]);

  async function handleContinue() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/functions/createonboardingpassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) {
        setError("Unable to continue. Please contact support.");
        return;
      }
      window.location.href = `/ResetPassword?token=${data.resetToken}`;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading…</p></div>;
  }

  if (error && !email) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-red-500">{error}</p></div>;
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

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to HostKeep</h1>
        <p className="text-sm text-gray-500 mb-8">Click below to set your password and activate your account.</p>

        <p className="text-sm text-gray-700 mb-6">
          Setting up account for <span className="font-medium">{email}</span>
        </p>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <button
          onClick={handleContinue}
          disabled={submitting}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11 text-sm font-semibold rounded-lg disabled:opacity-50"
        >
          {submitting ? "Please wait…" : "Set my password →"}
        </button>

        <div className="mt-6 text-center">
          <Link to="/SignIn" className="text-sm text-teal-600 hover:text-teal-700">← Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}