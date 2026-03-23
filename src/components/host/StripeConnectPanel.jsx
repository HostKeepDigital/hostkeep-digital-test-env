import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock, Loader2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function StripeConnectPanel({ user }) {
  const [status, setStatus] = useState(null); // null=loading
  const [connecting, setConnecting] = useState(false);

  const checkStatus = async () => {
    if (!user?.id) return;
    // Handle Stripe return redirect
    const params = new URLSearchParams(window.location.search);
    const stripeReturn = params.get('stripe_return');
    if (stripeReturn) {
      window.history.replaceState({}, '', window.location.pathname + '?tab=payments');
      if (stripeReturn === 'success') {
        toast.success("Stripe setup submitted! We'll update your status once verified.");
      }
    }
    try {
      const res = await base44.functions.invoke('getStripeConnectStatus', {});
      setStatus(res.data?.status || 'not_connected');
    } catch {
      setStatus('not_connected');
    }
  };

  useEffect(() => {
    if (user?.id) checkStatus();
  }, [user?.id]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await base44.functions.invoke('createStripeConnectLink', {});
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error(res.data?.error || 'Failed to start Stripe onboarding');
      }
    } catch {
      toast.error('Failed to connect to Stripe. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank Account & Payments</CardTitle>
        <CardDescription>Connect your bank account to receive payments directly from guests via Stripe.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status indicator */}
        {status === null ? (
          <div className="flex items-center gap-2 text-gray-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Checking connection status...</span>
          </div>
        ) : status === 'verified' ? (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">Bank account connected ✓</p>
              <p className="text-sm text-green-700 mt-1">Your account is verified and you can receive guest payments.</p>
            </div>
          </div>
        ) : status === 'pending_verification' ? (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">Stripe is verifying your account</p>
              <p className="text-sm text-amber-700 mt-1">This usually takes 1–2 business days. You'll be notified once complete.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-900">Bank account not connected</p>
              <p className="text-sm text-yellow-700 mt-1">You need to connect your bank account before you can receive payments from guests.</p>
            </div>
          </div>
        )}

        {/* Connect button */}
        {status !== 'verified' && (
          <Button
            className="bg-teal-600 hover:bg-teal-700 gap-2"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Stripe...</>
            ) : (
              <><ExternalLink className="w-4 h-4" /> {status === 'pending_verification' ? 'Continue Stripe Setup' : 'Connect with Stripe'}</>
            )}
          </Button>
        )}

        <div className="pt-2 border-t border-gray-100">
          <Link to="/HowPaymentsWork" className="text-sm text-teal-600 hover:underline font-medium">
            How do payments work? →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}