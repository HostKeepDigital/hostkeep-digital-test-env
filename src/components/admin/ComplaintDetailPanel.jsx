import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ComplaintDetailPanel({
  complaint,
  booking,
  property,
  host,
  guest,
  onClose,
}) {
  const [status, setStatus] = useState(complaint.status);
  const [resolution, setResolution] = useState(complaint.admin_resolution || "");
  const [amount, setAmount] = useState(complaint.admin_resolution_amount || 0);
  const [notes, setNotes] = useState(complaint.admin_notes || "");
  const [loading, setLoading] = useState(false);

  const isDamageClaimRequest = complaint.complaint_type === "damage_claim";

  // Calculate max award based on guest_situation
  const getMaxAward = () => {
    const totalRental = booking?.total_amount || 0;
    const deposit = booking?.security_deposit || 0;
    const nights = booking?.nights || 0;
    const nightsStayed = complaint.nights_stayed || 0;

    if (isDamageClaimRequest) {
      return {
        text: `Maximum award: £${deposit.toFixed(2)} (security deposit amount)`,
        amount: deposit,
      };
    }

    switch (complaint.guest_situation) {
      case "never_got_in":
      case "left_same_day":
        return {
          text: `Maximum award: Full refund (£${totalRental.toFixed(2)})`,
          amount: totalRental,
        };
      case "left_early":
        const prorata = ((nights - nightsStayed) / nights) * totalRental;
        return {
          text: `Maximum award: Pro-rata for unused nights (£${prorata.toFixed(2)})`,
          amount: prorata,
        };
      case "still_in_property":
        return {
          text: "Maximum award: Partial refund only",
          amount: 0,
        };
      case "completed_stay":
        const halfRefund = totalRental * 0.5;
        return {
          text: `Maximum award: 50% of rental (£${halfRefund.toFixed(2)})`,
          amount: halfRefund,
        };
      default:
        return { text: "—", amount: 0 };
    }
  };

  const maxAward = getMaxAward();

  // Calculate breakdown
  const calculateBreakdown = () => {
    const depositAmount = booking?.security_deposit || 0;
    let guestAmount = 0;
    let hostAmount = 0;
    let remainingDeposit = depositAmount;

    if (isDamageClaimRequest) {
      // For damage claims, amount goes to host, remainder back to guest
      hostAmount = Math.min(amount, depositAmount);
      remainingDeposit = depositAmount - hostAmount;
    } else {
      // For rental disputes, amount goes to guest
      guestAmount = amount;
    }

    return { guestAmount, hostAmount, remainingDeposit };
  };

  const breakdown = calculateBreakdown();

  const getResolutionOptions = () => {
    if (isDamageClaimRequest) {
      return [
        { value: "deposit_full_to_host", label: "Full deposit to host" },
        { value: "deposit_partial_to_host", label: "Partial amount to host" },
        { value: "deposit_returned_to_guest", label: "Return deposit to guest" },
        { value: "dismissed", label: "Dismiss" },
      ];
    } else {
      return [
        { value: "full_refund_to_guest", label: "Full refund to guest" },
        { value: "partial_refund_to_guest", label: "Partial refund to guest" },
        { value: "released_to_host", label: "Release to host" },
        { value: "dismissed", label: "Dismiss" },
      ];
    }
  };

  const handleConfirmResolution = async () => {
    if (!resolution) {
      toast.error("Please select a resolution");
      return;
    }

    setLoading(true);
    try {
      await base44.functions.invoke("resolveComplaint", {
        complaint_id: complaint.id,
        status: "resolved",
        admin_resolution: resolution,
        admin_resolution_amount: amount,
        admin_notes: notes,
      });
      toast.success("Resolution confirmed. Stripe payments triggered and both parties notified.");
      onClose();
    } catch (e) {
      toast.error(`Resolution failed: ${e.message}`);
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end overflow-y-auto">
      <div className="bg-white w-full max-w-2xl min-h-screen flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Review Complaint</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Booking Facts Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Booking Facts
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Property:</span>
                  <span className="font-medium text-gray-900">
                    {property?.title || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Guest:</span>
                  <span className="font-medium text-gray-900">
                    {guest?.full_name || booking?.guest_name || "—"} (
                    {guest?.email || booking?.guest_email || "—"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Host:</span>
                  <span className="font-medium text-gray-900">
                    {host?.full_name || "—"} ({host?.email || "—"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Check-in / Check-out:</span>
                  <span className="font-medium text-gray-900">
                    {booking?.check_in && booking?.check_out
                      ? `${new Date(booking.check_in).toLocaleDateString(
                          "en-GB"
                        )} – ${new Date(booking.check_out).toLocaleDateString(
                          "en-GB"
                        )}`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Nights:</span>
                  <span className="font-medium text-gray-900">
                    {booking?.nights || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nights Stayed:</span>
                  <span className="font-medium text-gray-900">
                    {complaint.nights_stayed || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Guest Situation:</span>
                  <span className="font-medium text-gray-900">
                    {complaint.guest_situation
                      ?.replace(/_/g, " ")
                      .replace(/^./, c => c.toUpperCase()) || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Rental Amount:</span>
                  <span className="font-medium text-gray-900">
                    £{booking?.total_amount?.toFixed(2) || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Security Deposit:</span>
                  <span className="font-medium text-gray-900">
                    £{booking?.security_deposit?.toFixed(2) || "0.00"}
                  </span>
                </div>
                {booking?.cancellation_policy_snapshot && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cancellation Policy:</span>
                    <span className="font-medium text-gray-900">
                      {booking.cancellation_policy_snapshot.type ||
                        booking.cancellation_policy_snapshot || "—"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Claim Details */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Claim Details
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium text-gray-900 ml-2">
                    {complaint.category?.replace(/_/g, " ") || "—"}
                  </span>
                </div>
                {complaint.specific_issue && (
                  <div>
                    <span className="text-gray-600">Specific Issue:</span>
                    <span className="font-medium text-gray-900 ml-2">
                      {complaint.specific_issue}
                    </span>
                  </div>
                )}
                {complaint.description && (
                  <div>
                    <p className="text-gray-600 mb-1">Description:</p>
                    <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                      {complaint.description}
                    </p>
                  </div>
                )}
                {complaint.evidence_urls && complaint.evidence_urls.length > 0 && (
                  <div>
                    <p className="text-gray-600 mb-1">Evidence:</p>
                    <div className="flex flex-wrap gap-2">
                      {complaint.evidence_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-20 h-20 rounded border border-gray-300 overflow-hidden hover:opacity-80"
                        >
                          <img
                            src={url}
                            alt={`Evidence ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {isDamageClaimRequest && complaint.damage_items && (
                  <div>
                    <p className="text-gray-600 mb-1">Itemised Damage:</p>
                    <div className="bg-white p-2 rounded border border-gray-200 space-y-1">
                      {complaint.damage_items.map((item, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-sm"
                        >
                          <span>{item.item_name}</span>
                          <span className="font-medium">
                            £{item.cost?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 pt-1 mt-1 flex justify-between font-medium">
                        <span>Total Claimed</span>
                        <span>
                          £{complaint.damage_total_claimed?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {complaint.requested_resolution && (
                  <div>
                    <span className="text-gray-600">Claimant Requested:</span>
                    <span className="font-medium text-gray-900 ml-2">
                      {complaint.requested_resolution?.replace(/_/g, " ")}
                    </span>
                    {complaint.requested_amount > 0 && (
                      <span className="font-medium text-gray-900 ml-2">
                        £{complaint.requested_amount?.toFixed(2) || "0.00"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* System Max Award */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">
                {maxAward.text}
              </p>
            </div>

            {/* Resolution Panel */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Resolution
              </h3>

              <div className="space-y-4">
                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  >
                    <option value="open">Open</option>
                    <option value="under_review">Under Review</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>

                {/* Resolution Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Resolution Type
                  </label>
                  <select
                    value={resolution}
                    onChange={e => setResolution(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  >
                    <option value="">— Select resolution —</option>
                    {getResolutionOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount (if partial selected) */}
                {(resolution === "deposit_partial_to_host" ||
                  resolution === "partial_refund_to_guest") && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Amount (£)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                      max={maxAward.amount}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                    />
                  </div>
                )}

                {/* Breakdown */}
                {amount > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                    {isDamageClaimRequest ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Host receives:</span>
                          <span className="font-medium text-gray-900">
                            £{breakdown.hostAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Remaining deposit to guest:
                          </span>
                          <span className="font-medium text-gray-900">
                            £{breakdown.remainingDeposit.toFixed(2)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Guest receives:</span>
                        <span className="font-medium text-gray-900">
                          £{breakdown.guestAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Admin Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Internal Admin Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Internal notes only — not shown to parties"
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm h-20 resize-none"
                  />
                </div>

                {/* Warning */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">
                    This action is irreversible. Stripe payments will fire immediately upon confirmation.
                  </p>
                </div>

                {/* Confirm Button */}
                <Button
                  onClick={handleConfirmResolution}
                  disabled={loading || !resolution}
                  className="w-full h-10 bg-[#0d9488] hover:bg-[#0f766e] text-white font-medium"
                >
                  {loading ? "Processing..." : "Confirm Resolution"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}