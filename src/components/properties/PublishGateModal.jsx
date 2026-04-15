import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { XCircle, FileText, CreditCard, Receipt } from "lucide-react";
import { differenceInHours } from "date-fns";

export default function PublishGateModal({ open, onClose, foundingMember }) {
  if (!foundingMember) return null;

  const { documents_verified, stripe_verified, subscription_active, documents_submitted_at, approval_status } = foundingMember;

  // Gates that are incomplete
  const gates = [];

  // 1. Documents
  if (!documents_verified) {
    const submittedAt = documents_submitted_at ? new Date(documents_submitted_at) : null;
    const hoursSince = submittedAt ? differenceInHours(new Date(), submittedAt) : null;
    gates.push({
      key: "docs",
      icon: FileText,
      title: "Identity Documents Not Yet Verified",
      body: submittedAt ? (
        <>
          <p className="text-sm text-gray-600">Your identity documents are still under review.</p>
          {hoursSince > 24 && (
            <p className="text-sm text-gray-600 mt-1">
              If you have not heard back, please contact us at{" "}
              <a href="mailto:hello@hostkeepdigital.co.uk" className="text-teal-600 underline font-medium">
                hello@hostkeepdigital.co.uk
              </a>.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">You haven't submitted your identity documents yet.</p>
          <Link to="/HostVerification" onClick={onClose} className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-teal-600 underline">
            Submit your documents →
          </Link>
        </>
      ),
    });
  }

  // 2. Stripe
  if (!stripe_verified) {
    gates.push({
      key: "stripe",
      icon: CreditCard,
      title: "Bank Account Not Connected",
      body: (
        <>
          <p className="text-sm text-gray-600">You need to connect your bank account to receive payments from guests.</p>
          <Link to="/Settings" onClick={onClose} className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-teal-600 underline">
            Connect your Stripe account →
          </Link>
        </>
      ),
    });
  }

  // 3. Subscription
  if (!subscription_active) {
    gates.push({
      key: "subscription",
      icon: Receipt,
      title: "No Active Subscription",
      body: (
        <>
          <p className="text-sm text-gray-600">You need an active subscription to publish your property.</p>
          <Link to="/Subscription" onClick={onClose} className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-teal-600 underline">
            View subscription plans →
          </Link>
        </>
      ),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            Your listing isn't ready to publish yet
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500 -mt-1">
          Complete the following before your property can go live:
        </p>

        <div className="space-y-4 mt-2">
          {gates.map(({ key, icon: Icon, title, body }) => (
            <div key={key} className="flex gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">{title}</p>
                {body}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}