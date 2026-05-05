import { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Plus, Trash2, CheckCircle, Upload, X } from "lucide-react";
import { toast } from "sonner";

const DAMAGE_CATEGORIES = [
  { id: "minor", label: "Minor damage", desc: "Scratches, small breakage" },
  { id: "major", label: "Major damage", desc: "Furniture or appliances" },
  { id: "exceptional", label: "Exceptional damage", desc: "Exceeds deposit amount" },
  { id: "cleaning", label: "Cleaning", desc: "Property left in unacceptable condition" },
];

export default function DamageClaimModal({ isOpen, onClose, booking, onSuccess }) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const depositAmount = booking.security_deposit || 0;
  const totalClaimed = items.reduce((sum, item) => sum + (item.cost || 0), 0);
  const claimableAmount = Math.min(totalClaimed, depositAmount);

  const canProceed =
    step === 1
      ? category
      : step === 2
      ? description.length >= 50
      : step === 3
      ? items.length > 0
      : true;

  const handleAddItem = () => {
    setItems([...items, { item_name: "", cost: 0 }]);
  };

  const handleUpdateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const handleRemoveItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleUploadEvidence = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingEvidence(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setEvidenceUrls([...evidenceUrls, res.file_url]);
    } catch (err) {
      toast.error("Failed to upload evidence");
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const categoryLabel = DAMAGE_CATEGORIES.find((c) => c.id === category)?.label || category;
      await base44.functions.invoke("raiseComplaint", {
        session_token: localStorage.getItem("session_token"),
        booking_id: booking.id,
        raised_by: "host",
        raised_by_user_id: booking.host_id,
        complaint_type: "damage_claim",
        category: "damage",
        specific_issue: categoryLabel,
        description,
        evidence_urls: evidenceUrls,
        damage_items: items,
        damage_total_claimed: claimableAmount,
        requested_resolution: claimableAmount === depositAmount ? "full_refund" : "partial_refund",
        requested_amount: claimableAmount,
      });

      setSubmitted(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err?.response?.data?.error || "Failed to submit claim");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-white border-0">
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Damage Claim Submitted
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Your damage claim has been submitted. Our team will review it within 24 hours.
              The security deposit is now frozen.
            </p>
            <Button
              onClick={onClose}
              className="bg-emerald-600 hover:bg-emerald-700 w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white border-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#1E3A5F]">
            Raise a Damage Claim
          </DialogTitle>
          <DialogDescription>
            Step {step} of 4 — {
              step === 1 ? "Select damage category" :
              step === 2 ? "Describe the damage" :
              step === 3 ? "Itemise your claim" :
              "Review and confirm"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* STEP 1 — Category */}
          {step === 1 && (
            <div className="space-y-3">
              {DAMAGE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    category === cat.id
                      ? "border-[#0d9488] bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-semibold text-gray-900">{cat.label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{cat.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* STEP 2 — Description */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Describe the damage (minimum 50 characters)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What damage occurred and how..."
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488]"
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {description.length} / 50 characters minimum
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload evidence (photos, videos, receipts)
                </label>
                <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {uploadingEvidence ? "Uploading..." : "Click to upload"}
                  </span>
                  <input
                    type="file"
                    onChange={handleUploadEvidence}
                    disabled={uploadingEvidence}
                    className="hidden"
                  />
                </label>

                {evidenceUrls.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {evidenceUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-gray-50 p-3 rounded-lg text-sm"
                      >
                        <span className="text-gray-600 truncate">File {idx + 1}</span>
                        <button
                          onClick={() =>
                            setEvidenceUrls(
                              evidenceUrls.filter((_, i) => i !== idx)
                            )
                          }
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — Itemise */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Security deposit held: <span className="font-bold">£{depositAmount}</span>
                </p>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) =>
                          handleUpdateItem(idx, "item_name", e.target.value)
                        }
                        placeholder="Item name (e.g., Broken window)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40"
                      />
                    </div>
                    <div className="w-28">
                      <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2">
                        <span className="text-gray-500 text-sm">£</span>
                        <input
                          type="number"
                          value={item.cost || ""}
                          onChange={(e) =>
                            handleUpdateItem(idx, "cost", parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="flex-1 ml-1 border-0 outline-none text-sm focus:ring-0"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleAddItem}
                variant="outline"
                className="w-full border-dashed border-gray-300 hover:border-gray-400"
              >
                <Plus className="w-4 h-4 mr-2" /> Add another item
              </Button>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600">
                  Total claimed: <span className="font-bold text-lg text-gray-900">£{totalClaimed.toFixed(2)}</span>
                </p>
              </div>

              {totalClaimed > depositAmount && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-900">
                    Your claim exceeds the deposit amount of £{depositAmount}. You can only claim up to
                    £{depositAmount} through this process. For amounts above this you will need to pursue the
                    guest separately.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">Claim Summary</h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>
                    <span className="font-medium">Category:</span>{" "}
                    {DAMAGE_CATEGORIES.find((c) => c.id === category)?.label}
                  </p>
                  <p>
                    <span className="font-medium">Description:</span> {description.substring(0, 100)}
                    {description.length > 100 ? "..." : ""}
                  </p>
                  <p>
                    <span className="font-medium">Evidence:</span> {evidenceUrls.length} file
                    {evidenceUrls.length !== 1 ? "s" : ""} uploaded
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-semibold mb-2">Items claimed:</p>
                <div className="text-sm text-blue-900 space-y-1">
                  {items.map((item, idx) => (
                    <p key={idx}>
                      {item.item_name} — <span className="font-semibold">£{item.cost.toFixed(2)}</span>
                    </p>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-lg font-bold text-emerald-900">
                  Total claimed: £{claimableAmount.toFixed(2)}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900">
                  <strong>Warning:</strong> Once submitted your damage claim cannot be withdrawn. The security
                  deposit will be frozen until HostKeep admin has reviewed your case. The guest will be notified.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-6 border-t border-gray-200">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
              className="bg-[#0d9488] hover:bg-[#0d9488]/90"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? "Submitting..." : "Submit Claim"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}