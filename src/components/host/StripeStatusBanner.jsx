import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Clock, Loader2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function StripeStatusBanner({ user }) {
  const [status, setStatus] = useState(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const session_token = localStorage.getItem("session_token");
    base44.functions.invoke('getStripeConnectStatus', { session_token })
      .then(res => setStatus(res.data?.status || 'not_connected'))
      .catch(() => setStatus('not_connected'));
  }, [user?.id]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const session_token = localStorage.getItem("session_token");
      const res = await base44.functions.invoke('createStripeConnectLink', { session_token });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error(res.data?.error || 'Failed to start Stripe onboarding');
      }
    } catch {
      toast.error('Failed to connect to Stripe.');
    } finally {
      setConnecting(false);
    }
  };

  if (status === null || status === 'verified') {
    // If verified, show a small green indicator (not a full banner)
    if (status === 'verified') {
      return (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 mb-6">
          <CheckCircle className="w-4 h-4 text-green-600" />
          Bank account connected ✓
        </div>
      );
    }
    return null;
  }

  if (status === 'pending_verification') {
    return (
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-amber-900">Stripe is verifying your account — this usually takes 1–2 business days</p>
          <p className="text-sm text-amber-700 mt-0.5">You'll be notified once your account is approved and you can start accepting bookings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-yellow-900">You need to connect your bank account before you can receive payments.</p>
          <p className="text-sm text-yellow-700 mt-0.5">
            This takes about 5 minutes.{" "}
            <Link to="/HowPaymentsWork" className="underline">Learn how payments work →</Link>
          </p>
        </div>
      </div>
      <Button
        className="bg-teal-600 hover:bg-teal-700 gap-2 flex-shrink-0"
        onClick={handleConnect}
        disabled={connecting}
        size="sm"
      >
        {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
        Connect with Stripe
      </Button>
    </div>
  );
}