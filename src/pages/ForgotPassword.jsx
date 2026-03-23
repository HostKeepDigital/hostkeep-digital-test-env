import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Mail, Loader2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await base44.functions.invoke('sendPasswordReset', { email });
    } catch (_) {
      // Always show success for security
    }
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden border-0 shadow-2xl bg-white/95 backdrop-blur-sm rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-400" />
          <div className="p-8 sm:p-10">
            <div className="flex flex-col items-center text-center space-y-6">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-slate-900">HostKeep</span>
              </Link>

              {!submitted ? (
                <>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
                    <p className="text-slate-500 text-sm">Enter your email address and we'll send you a link to reset your password.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="w-full space-y-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-sm font-medium text-slate-700" htmlFor="email">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                          className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:border-teal-400 focus:ring-teal-400 rounded-xl"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
                    </Button>
                  </form>

                  <Link to="/SignIn" className="text-sm text-slate-400 hover:text-teal-600 transition-colors">
                    ← Back to Sign In
                  </Link>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto">
                      <Mail className="w-7 h-7 text-teal-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Check your inbox</h1>
                    <p className="text-slate-500 text-sm">
                      If an account exists for <span className="font-medium text-slate-700">{email}</span>, you'll receive a password reset link shortly. Please also check your spam folder.
                    </p>
                  </div>
                  <Link to="/SignIn" className="text-sm text-slate-400 hover:text-teal-600 transition-colors">
                    ← Back to Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}