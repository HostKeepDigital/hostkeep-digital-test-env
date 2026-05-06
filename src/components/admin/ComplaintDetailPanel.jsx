import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, AlertTriangle, ExternalLink, Clock, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DisputeEvidencePanel from "./DisputeEvidencePanel";

const RESOLUTION_OPTIONS_DAMAGE = [
  { value: "deposit_full_to_host", label: "Full deposit → host" },
  { value: "deposit_partial_to_host", label: "Partial deposit → host" },
  { value: "deposit_returned_to_guest", label: "Return deposit → guest" },
  { value: "dismissed", label: "Dismiss claim" },
];

const RESOLUTION_OPTIONS_RENTAL = [
  { value: "full_refund_to_guest", label: "Full refund → guest" },
  { value: "partial_refund_to_guest", label: "Partial refund → guest" },
  { value: "released_to_host", label: "Release full amount → host" },
  { value: "dismissed", label: "Dismiss complaint" },
];

const STATUS_BADGE = {
  open: "bg-amber-100 text-amber-800",
  under_review: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-600",
};

export default function ComplaintDetailPanel({ complaint, booking, property, host, guest, onClose, onResolved }) {
  const [resolution, setResolution] = useState(complaint.admin_resolution || "");
  const [amount, setAmount] = useState(complaint.admin_resolution_amount || 0);
  const [notes, setNotes] = useState(complaint.admin_notes || "");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isDamage = complaint.complaint_type === "damage_claim";
  const isResolved = ["resolved", "dismissed"].includes(complaint.status);

  const deposit = booking?.security_deposit || 0;
  const totalRental = booking?.total_amount || 0;
  const nights = booking?.nights || 0;
  const nightsStayed = complaint.nights_stayed || 0;

  const getMaxAward = () => {
    if (isDamage) return { text: `Max: £${deposit.toFixed(2)} (full deposit)`, amount: deposit };
    switch (complaint.guest_situation) {
      case "never_got_in":
      case "left_same_day":
        return { text: `Max: £${totalRental.toFixed(2)} (full refund)`, amount: totalRental };
      case "left_early":
        const prorata = nights > 0 ? ((nights - nightsStayed) / nights) * totalRental : 0;
        return { text: `Max: £${prorata.toFixed(2)} (pro-rata unused nights)`, amount: prorata };
      case "completed_stay":
        return { text: `Max: £${(totalRental * 0.5).toFixed(2)} (50% goodwill)`, amount: totalRental * 0.5 };
      default:
        return { text: "Partial refund only", amount: 0 };
    }
  };

  const maxAward = getMaxAward();

  const getBreakdown = () => {
    if (isDamage) {
      const hostAmt = Math.min(amount, deposit);
      return { host: hostAmt, guest: deposit - hostAmt };
    }
    return { guest: amount, host: totalRental - amount };
  };
  const breakdown = getBreakdown();

  const handleResolve = async () => {
    if (!resolution) { toast.error("Select a resolution type"); return; }
    setLoading(true);
    try {
      await base44.functions.invoke("resolveComplaint", {
        session_token: localStorage.getItem("session_token"),
        complaint_id: complaint.id,
        status: "resolved",
        admin_resolution: resolution,
        admin_resolution_amount: amount,
        admin_notes: notes,
      });
      toast.success("Resolution confirmed — Stripe payments triggered, parties notified.");
      onResolved?.();
      onClose();
    } catch (e) {
      toast.error(`Failed: ${e.message}`);
    }
    setLoading(false);
  };

  const handleMarkUnderReview = async () => {
    try {
      await base44.entities.Complaint.update(complaint.id, { status: "under_review" });
      toast.success("Marked as under review");
      onResolved?.();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const resolutionOptions = isDamage ? RESOLUTION_OPTIONS_DAMAGE : RESOLUTION_OPTIONS_RENTAL;
  const showAmount = ["deposit_partial_to_host", "partial_refund_to_guest"].includes(resolution);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-end overflow-y-auto">
      <div className="bg-white w-full max-w-2xl min-h-screen flex flex-col shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {isDamage ? "Damage Claim" : "Rental Dispute"}
            </h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[complaint.status] || "bg-gray-100 text-gray-600"}`}>
              {complaint.status?.replace("_", " ")}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${complaint.raised_by === "host" ? "bg-teal-100 text-teal-800" : "bg-blue-100 text-blue-800"}`}>
              by {complaint.raised_by}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {complaint.status === "open" && (
              <Button size="sm" variant="outline" onClick={handleMarkUnderReview} className="text-xs h-8">
                <Clock className="w-3.5 h-3.5 mr-1" /> Mark Under Review
              </Button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* Booking Summary */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Booking Facts</h3>
              <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Row label="Property" value={property?.title || "—"} />
                <Row label="Guest" value={`${guest?.full_name || booking?.guest_name || "—"} · ${guest?.email || booking?.guest_email || "—"}`} />
                <Row label="Host" value={`${host?.full_name || "—"} · ${host?.email || "—"}`} />
                <Row label="Dates" value={booking ? `${fmt(booking.check_in)} – ${fmt(booking.check_out)}` : "—"} />
                <Row label="Nights" value={booking?.nights ?? "—"} />
                <Row label="Nights Stayed" value={complaint.nights_stayed ?? "—"} />
                <Row label="Rental Total" value={booking ? `£${booking.total_amount?.toFixed(2)}` : "—"} />
                <Row label="Security Deposit" value={`£${deposit.toFixed(2)}`} />
                {complaint.guest_situation && (
                  <Row label="Guest Situation" value={complaint.guest_situation.replace(/_/g, " ")} />
                )}
              </div>
            </section>

            {/* Claim Details */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Claim Details</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                {complaint.category && <Row label="Category" value={complaint.category.replace(/_/g, " ")} />}
                {complaint.specific_issue && <Row label="Specific Issue" value={complaint.specific_issue} />}
                {complaint.description && (
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Description</p>
                    <p className="bg-white border border-gray-200 rounded-lg p-3 text-gray-800 leading-relaxed">
                      {complaint.description}
                    </p>
                  </div>
                )}
                {complaint.requested_resolution && (
                  <Row
                    label="Claimant Requests"
                    value={`${complaint.requested_resolution.replace(/_/g, " ")}${complaint.requested_amount ? ` · £${complaint.requested_amount?.toFixed(2)}` : ""}`}
                  />
                )}
                {/* Damage items */}
                {isDamage && complaint.damage_items?.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Itemised Damage</p>
                    <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                      {complaint.damage_items.map((item, i) => (
                        <div key={i} className="flex justify-between px-3 py-2 text-sm">
                          <span className="text-gray-700">{item.item_name}</span>
                          <span className="font-medium text-gray-900">£{item.cost?.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-3 py-2 text-sm font-semibold bg-gray-50">
                        <span>Total Claimed</span>
                        <span>£{complaint.damage_total_claimed?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Evidence & Party Responses */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Evidence & Responses</h3>
              <DisputeEvidencePanel
                key={refreshKey}
                complaint={complaint}
                bookingGuestId={booking?.guest_id}
                bookingHostId={booking?.host_id}
                currentUserId={null}
                isAdmin={true}
                onUpdated={() => setRefreshKey(k => k + 1)}
              />
            </section>

            {/* Max award guidance */}
            {!isResolved && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-900">{maxAward.text}</p>
              </div>
            )}

            {/* Resolution */}
            {!isResolved ? (
              <section className="border-t border-gray-200 pt-6 space-y-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin Resolution</h3>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Resolution Type</label>
                  <select
                    value={resolution}
                    onChange={e => setResolution(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    <option value="">— Select resolution —</option>
                    {resolutionOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {showAmount && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Amount (£) — max £{maxAward.amount.toFixed(2)}
                    </label>
                    <input
                      type="number"
                      value={amount}
                      min={0}
                      max={maxAward.amount}
                      step={0.01}
                      onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                )}

                {/* Breakdown preview */}
                {resolution && resolution !== "dismissed" && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Payment Preview</p>
                    {isDamage ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Host receives</span>
                          <span className="font-semibold text-gray-900">£{breakdown.host.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Guest receives (deposit remainder)</span>
                          <span className="font-semibold text-gray-900">£{breakdown.guest.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Guest receives</span>
                          <span className="font-semibold text-gray-900">£{breakdown.guest.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Host receives</span>
                          <span className="font-semibold text-gray-900">£{Math.max(0, breakdown.host).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Internal Admin Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Notes for internal use only — not shown to parties"
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">
                    This action is <strong>irreversible</strong>. Stripe payments fire immediately. Both parties will be notified by email.
                  </p>
                </div>

                <Button
                  onClick={handleResolve}
                  disabled={loading || !resolution}
                  className="w-full h-10 bg-[#0d9488] hover:bg-[#0f766e] text-white font-semibold"
                >
                  {loading ? "Processing…" : "Confirm Resolution"}
                </Button>
              </section>
            ) : (
              <section className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">
                      Resolved: {complaint.admin_resolution?.replace(/_/g, " ")}
                    </p>
                    {complaint.admin_resolution_amount > 0 && (
                      <p className="text-xs text-green-700">Amount: £{complaint.admin_resolution_amount?.toFixed(2)}</p>
                    )}
                    {complaint.admin_notes && (
                      <p className="text-xs text-green-700 mt-1">Notes: {complaint.admin_notes}</p>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="col-span-1">
      <span className="text-gray-500">{label}: </span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}