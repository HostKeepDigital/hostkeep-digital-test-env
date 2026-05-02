import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Clock, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const APP_ID = "698eee4108bd1d9467648326";
const CONNECT_URL = `/api/apps/${APP_ID}/functions/createStripeConnectLink`;
const STATUS_URL = `/api/apps/${APP_ID}/functions/getStripeConnectStatus`;

export default function StripeStatusBanner({ user }) {
  const [status, setStatus] = useState(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const session_token = localStorage.getItem("session_token");
    fetch(STATUS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_token }),
    })
      .then(r => r.json())
      .then(d => setStatus(d.status || "not_connected"))
      .catch(() => setStatus("not_connected"));
  }, [user?.id]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch(CONNECT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_token: localStorage.getItem("session_token"),
          return_url: `${window.location.origin}/HostDashboard?stripe_connect_return=success`,
          refresh_url: `${window.location.origin}/HostDashboard?stripe_connect_return=refresh`,
        }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error(data?.error || "Failed to start Stripe onboarding");
        setConnecting(false);
      }
    } catch {
      toast.error("Failed to connect to Stripe. Please try again.");
      setConnecting(false);
    }
  };

  if (status === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 mb-6">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        Checking payment account status...
      </div>
    );
  }

  if (status === "verified") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 mb-6">
        <CheckCircle className="w-4 h-4 text-green-600" />
        Bank account connected ✓
      </div>
    );
  }

  if (status === "pending_verification") {
    return (
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-amber-900">Stripe is verifying your account</p>
          <p className="text-sm text-amber-700 mt-0.5">This usually takes a few minutes to a few hours. You can continue setting up your property in the meantime.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-yellow-900">Connect your bank account to receive guest payments</p>
          <p className="text-sm text-yellow-700 mt-0.5">Takes around 5 minutes via Stripe's secure onboarding.</p>
        </div>
      </div>
      <Button
        className="bg-teal-600 hover:bg-teal-700 gap-2 flex-shrink-0"
        onClick={handleConnect}
        disabled={connecting}
        size="sm"
      >
        {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
        {connecting ? "Redirecting..." : "Connect Bank Account"}
      </Button>
    </div>
  );
}
