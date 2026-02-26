import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

export default function LockScreen({ onAuthenticated }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await base44.functions.invoke('validateAccess', {
        token: token.trim(),
        challenge: 'human'
      });

      if (response.data.success) {
        sessionStorage.setItem('app_access_token', response.data.sessionToken);
        sessionStorage.setItem('app_access_time', Date.now().toString());
        onAuthenticated();
      } else {
        setAttempts(prev => prev + 1);
        setError('Access denied');
        setToken("");
      }
    } catch (err) {
      setAttempts(prev => prev + 1);
      if (err.response?.status === 429) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Access denied');
      }
      setToken("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
         <div className="text-center mb-8">
           <img 
             src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698eee4108bd1d9467648326/f825bc2e7_HostKeepLogo.png"
             alt="HostKeep Logo"
             className="h-24 mx-auto mb-6"
           />
           <h1 className="text-2xl font-bold text-white mb-2">Access Restricted</h1>
           <p className="text-gray-400">Authorized Users Only</p>
         </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter access token"
              disabled={loading || attempts >= 5}
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 border border-red-900/50 rounded px-3 py-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !token || attempts >= 5}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white"
          >
            {loading ? "Verifying..." : "Authenticate"}
          </Button>

          {attempts >= 5 && (
            <p className="text-center text-sm text-gray-500">
              Maximum attempts exceeded
            </p>
          )}
        </form>
      </div>
    </div>
  );
}