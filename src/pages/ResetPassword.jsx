import { useState } from "react";
import { buildEmail } from "@/lib/emailTemplate";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Lock, Loader2 } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [expired, setExpired] = useState(false);
  const navigate = useNavigate();

  const token = new URLSearchParams(window.location.search).get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await base44.functions.invoke(
        'verifyPasswordReset',
        { token, newPassword: password }
      );
      if (result?.error === 'expired_token') {
        setExpired(true);
      } else if (result?.error === 'invalid_token') {
        setExpired(true);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden shadow-2xl bg-white/95 rounded-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-400" />
            <div className="p-8 sm:p-10 flex flex-col items-center text-center space-y-5">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-slate-900">HostKeep</span>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">This link has expired</h1>
              <p className="text-slate-500 text-sm">Password reset links expire after 1 hour. Please request a new one.</p>
              <Button onClick={() => navigate("/ForgotPassword")} className="bg-teal-600 hover:bg-teal-700 rounded-xl">
                Request New Link
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden shadow-2xl bg-white/95 rounded-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-400" />
            <div className="p-8 sm:p-10 flex flex-col items-center text-center space-y-5">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-slate-900">HostKeep</span>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">Password updated!</h1>
              <p className="text-slate-500 text-sm">Your password has been changed successfully.</p>
              <Button onClick={() => navigate("/SignIn")} className="bg-teal-600 hover:bg-teal-700 rounded-xl">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden shadow-2xl bg-white/95 rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-400" />
          <div className="p-8 sm:p-10">
            <div className="flex flex-col items-center text-center space-y-6">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-slate-900">HostKeep</span>
              </Link>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">Create a new password</h1>
                <p className="text-slate-500 text-sm">Choose a strong password for your HostKeep account.</p>
              </div>

              <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-sm font-medium text-slate-700" htmlFor="password">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:border-teal-400 focus:ring-teal-400 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-sm font-medium text-slate-700" htmlFor="confirm">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="confirm"
                      type="password"
                      placeholder="Repeat your password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:border-teal-400 focus:ring-teal-400 rounded-xl"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}