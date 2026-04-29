import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function PublishGateModal({ open, onClose, foundingMember }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !foundingMember?.user_id) {
      setLoading(true);
      return;
    }

    const fetchUser = async () => {
      try {
        const users = await base44.entities.User.filter({ id: foundingMember.user_id });
        setUser(users?.[0] || null);
      } catch (e) {
        console.error("Failed to fetch user:", e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [open, foundingMember?.user_id]);

  if (!open) return null;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Determine which gates are incomplete
  const gatesIncomplete = [];

  if (!user?.documents_verified) {
    gatesIncomplete.push("documents");
  }
  if (!user?.stripe_verified) {
    gatesIncomplete.push("stripe");
  }
  if (!user?.subscription_active) {
    gatesIncomplete.push("subscription");
  }

  // If no incomplete gates, this shouldn't happen, but close the modal
  if (gatesIncomplete.length === 0) {
    return null;
  }

  const hoursElapsed = user?.documents_submitted_at
    ? Math.floor((Date.now() - new Date(user.documents_submitted_at).getTime()) / (1000 * 60 * 60))
    : null;
  const over24Hours = hoursElapsed && hoursElapsed > 24;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Complete Setup to Publish
          </DialogTitle>
          <DialogDescription>
            Before you can publish your property, please complete the following requirements:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {/* Documents Gate */}
          {gatesIncomplete.includes("documents") && (
            <div className="p-4 rounded-lg bg-teal-50 border border-teal-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-teal-900 text-sm">Identity Documents</h3>
                  <p className="text-sm text-teal-800 mt-1">
                    Your identity documents are still under review.
                  </p>
                  {over24Hours && (
                    <p className="text-sm text-red-700 mt-2">
                      If you have not heard back, please contact us at{" "}
                      <a href="mailto:hello@hostkeepdigital.co.uk" className="font-semibold hover:underline">
                        hello@hostkeepdigital.co.uk
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stripe Gate */}
          {gatesIncomplete.includes("stripe") && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 text-sm">Bank Account Connection</h3>
                  <p className="text-sm text-amber-800 mt-1">
                    You need to connect your bank account to receive payments from guests.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const session_token = localStorage.getItem("session_token");
                        const res = await base44.functions.invoke("createStripeConnectLink", { session_token });
                        if (res.data?.url) {
                          window.location.href = res.data.url;
                        }
                      } catch (e) {
                        console.error("Failed to get Stripe link:", e);
                      }
                    }}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Connect Stripe Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Gate */}
          {gatesIncomplete.includes("subscription") && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 text-sm">Active Subscription</h3>
                  <p className="text-sm text-blue-800 mt-1">
                    You need an active subscription to publish your property.
                  </p>
                  <Link to={createPageUrl("Subscription")} className="mt-3 inline-block">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      View Subscription Plans
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}