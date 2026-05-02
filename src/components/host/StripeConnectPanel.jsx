import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Clock, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const APP_ID = "698eee4108bd1d9467648326";

export default function StripeConnectPanel({ user }) {
  const [status, setStatus] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = async () => {
    if (!user) return;
    try {
      const session_token = localStorage.getItem("session_token");
      const res = await fetch(`/api/apps/${APP_ID}/functions/getStripeConnectStatus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token }),
      });
      const data = await res.json();
      setStatus(data.status || "not_connected");
    } catch {
      setStatus("not_connected");
    }
  };

  useEffect(() => {
    loadStatus();
  }, [user?.id]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const session_token = localStorage.getItem("session_token");
      const res = await fetch(`/api/apps/${APP_ID}/functions/createStripeConnectLink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start Stripe setup. Please try again.");
        setConnecting(false);
      }
    } catch (err) {
      console.error("Stripe Connect error:", err);
      toast.error("Failed to connect to Stripe. Please try again.");
      setConnecting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
    toast.success("Status refreshed");
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Bank Account & Payments</CardTitle>
            <CardDescription className="mt-1">
              Connect your bank account to receive guest payments directly via Stripe.
            </CardDescription>
          </div>
          {status !== null && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-gray-400 hover:text-gray-600 transition-colors mt-1"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">

        {status === null ? (
          <div className="flex items-center gap-2 text-gray-400 py-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Checking connection status...</span>
          </div>

        ) : status === "verified" ? (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">Bank account connected ✓</p>
              <p className="text-sm text-green-700 mt-0.5">
                Your account is verified. Guest payments will be transferred to your bank account automatically after check-in.
              </p>
            </div>
          </div>

        ) : status === "pending_verification" ? (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">Verification in progress</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Stripe is reviewing your details. This usually takes a few minutes to a few hours.
                If you haven't finished the setup yet, click below to continue.
              </p>
            </div>
          </div>

        ) : (
          <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900">Not connected yet</p>
              <p className="text-sm text-gray-600 mt-0.5">
                Connect your bank account so you can receive payments from guests. Takes around 5 minutes to complete.
              </p>
            </div>
          </div>
        )}

        {status !== "verified" && (
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide">How it works</p>
            <ul className="space-y-1.5">
              {[
                "Click below — you'll be taken to Stripe's secure onboarding",
                "Enter your bank account details and verify your identity",
                "Once verified, guest payments transfer to your account automatically",
                "HostKeep holds payment until 24 hours after check-in, then releases it",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-teal-800">
                  <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {status !== "verified" && (
          <Button
            className="w-full bg-[#1E3A5F] hover:bg-[#16304f] gap-2"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Stripe...</>
            ) : (
              <><ExternalLink className="w-4 h-4" />
                {status === "pending_verification" ? "Continue Stripe Setup" : "Connect Bank Account"}
              </>
            )}
          </Button>
        )}

        <div className="pt-1 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Powered by <strong>Stripe</strong> — your bank details are never stored by HostKeep.
          </p>
        </div>

      </CardContent>
    </Card>
  );
}
