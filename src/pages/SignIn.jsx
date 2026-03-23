import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Mail, Lock, Loader2 } from "lucide-react";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const nextUrl = new URLSearchParams(window.location.search).get("next") || "/";

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = nextUrl;
    } catch (err) {
      setError(err?.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    base44.auth.loginWithProvider("google", nextUrl);
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img src="https://lh3.googleusercontent.com/d/1ZmljdO7m9HdHdT_KKSa0S-p2e9ctR5BU" alt="Looe Bridge, Cornwall" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="absolute bottom-8 left-8 text-white">
          <p className="text-sm font-medium opacity-80">Looe, Cornwall</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden border-0 shadow-2xl bg-white/95 backdrop-blur-sm rounded-2xl">
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-400" />

          <div className="p-8 sm:p-10 md:pt-12 md:pb-10 md:px-10">
            <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-3 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-slate-900">HostKeep</span>
              </Link>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
                <p className="text-slate-500 text-sm sm:text-base font-medium">Sign in to your account</p>
              </div>

              <div className="w-full space-y-4">
                {/* Email/password form */}
                <form onSubmit={handleEmailLogin} className="space-y-4">
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
                        className="pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-teal-400 focus:ring-teal-400 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-sm font-medium text-slate-700" htmlFor="password">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="pl-10 h-11 sm:h-12 bg-slate-50/50 border-slate-200 focus:border-teal-400 focus:ring-teal-400 rounded-xl"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || googleLoading}
                    className="w-full h-11 sm:h-12 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-all duration-200"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                  </Button>
                </form>

                {/* Footer links */}
                <div className="pt-3 text-center border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    Don't have an account?{" "}
                    <Link to="/founding" className="font-semibold text-teal-600 hover:text-teal-700 underline underline-offset-2">
                      Become a founding member
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}