import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, X, MessageSquare, Send, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Displays existing party_responses (notes) and evidence_urls.
 * Also allows the current party (host/guest/admin) to add more evidence.
 */
export default function DisputeEvidencePanel({ complaint, bookingGuestId, bookingHostId, currentUserId, isAdmin = false, onUpdated }) {
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingUrls, setPendingUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const canAddEvidence = isAdmin || currentUserId === bookingGuestId || currentUserId === bookingHostId;
  const isResolved = ["resolved", "dismissed"].includes(complaint.status);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const res = await base44.integrations.Core.UploadFile({ file });
        setPendingUrls(prev => [...prev, res.file_url]);
      } catch {
        toast.error("Failed to upload file");
      }
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!note.trim() && pendingUrls.length === 0) {
      toast.error("Please add a note or upload at least one file");
      return;
    }
    setSubmitting(true);
    try {
      await base44.functions.invoke("addDisputeEvidence", {
        session_token: localStorage.getItem("session_token"),
        complaint_id: complaint.id,
        note: note.trim() || undefined,
        evidence_urls: pendingUrls,
      });
      toast.success("Evidence added — admin has been notified");
      setNote("");
      setPendingUrls([]);
      onUpdated?.();
    } catch (e) {
      toast.error(e.message || "Failed to submit evidence");
    }
    setSubmitting(false);
  };

  const partyLabel = (party) => {
    if (party === "host") return { label: "Host", cls: "bg-teal-100 text-teal-800" };
    if (party === "guest") return { label: "Guest", cls: "bg-blue-100 text-blue-800" };
    return { label: "Admin", cls: "bg-purple-100 text-purple-800" };
  };

  const responses = complaint.party_responses || [];
  const evidenceUrls = complaint.evidence_urls || [];

  return (
    <div className="space-y-5">
      {/* Evidence Gallery */}
      {evidenceUrls.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Image className="w-3.5 h-3.5" /> Evidence Files ({evidenceUrls.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {evidenceUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-20 h-20 rounded-lg border border-gray-200 overflow-hidden hover:opacity-80 transition-opacity flex-shrink-0 bg-gray-100 flex items-center justify-center"
              >
                <img
                  src={url}
                  alt={`Evidence ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentNode.classList.add("flex", "items-center", "justify-center");
                  }}
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Party Response Timeline */}
      {responses.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Response Timeline
          </p>
          <div className="space-y-2">
            {responses.map((r, i) => {
              const { label, cls } = partyLabel(r.party);
              return (
                <div key={i} className="flex gap-2.5 items-start">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${cls}`}>
                    {label}
                  </span>
                  <div className="flex-1 bg-gray-50 rounded-lg p-2.5 text-sm text-gray-700">
                    {r.note}
                    <p className="text-xs text-gray-400 mt-1">
                      {r.submitted_at ? new Date(r.submitted_at).toLocaleString("en-GB") : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add More Evidence */}
      {canAddEvidence && !isResolved && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Add Evidence / Response</p>

          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note or response to this dispute..."
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
          />

          {/* Upload */}
          <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors w-full">
            <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-500">{uploading ? "Uploading…" : "Upload photos or documents"}</span>
            <input type="file" multiple accept="image/*,application/pdf" onChange={handleUpload} disabled={uploading} className="hidden" />
          </label>

          {pendingUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendingUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-md px-2 py-1 text-xs text-green-700">
                  <Image className="w-3 h-3" />
                  File {i + 1}
                  <button onClick={() => setPendingUrls(prev => prev.filter((_, j) => j !== i))}>
                    <X className="w-3 h-3 text-green-500 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            size="sm"
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white w-full"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {submitting ? "Submitting…" : "Submit Evidence"}
          </Button>
        </div>
      )}
    </div>
  );
}