import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, X, Send, Image, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Lets a booking party (host or guest) add supplementary evidence or
 * a response note to an open complaint on their booking.
 * Renders only when there is an active complaint on the booking.
 */
export default function DisputeEvidenceUploader({ complaint, onUpdated }) {
  const [note, setNote] = useState("");
  const [pendingUrls, setPendingUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!complaint || ["resolved", "dismissed"].includes(complaint.status)) return null;

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const res = await base44.integrations.Core.UploadFile({ file });
        setPendingUrls(prev => [...prev, res.file_url]);
      } catch {
        toast.error("Upload failed");
      }
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!note.trim() && pendingUrls.length === 0) {
      toast.error("Add a note or upload a file first");
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
      toast.success("Evidence submitted — admin has been notified");
      setNote("");
      setPendingUrls([]);
      setExpanded(false);
      onUpdated?.();
    } catch (e) {
      toast.error(e.message || "Submission failed");
    }
    setSubmitting(false);
  };

  const existingResponses = complaint.party_responses || [];
  const existingEvidence = complaint.evidence_urls || [];

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-amber-900">
            Dispute Open — Add Evidence or Response
          </span>
          <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
            {complaint.status?.replace("_", " ")}
          </span>
        </div>
        <span className="text-xs text-amber-600">{expanded ? "Collapse ▲" : "Expand ▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-amber-200 pt-4">
          {/* Existing evidence */}
          {existingEvidence.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-800 mb-2">Evidence already submitted ({existingEvidence.length} file{existingEvidence.length !== 1 ? "s" : ""})</p>
              <div className="flex flex-wrap gap-2">
                {existingEvidence.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="w-16 h-16 rounded-lg border border-amber-200 overflow-hidden hover:opacity-80 bg-white flex-shrink-0">
                    <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Existing responses */}
          {existingResponses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-amber-800">Previous responses</p>
              {existingResponses.map((r, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                    r.party === "host" ? "bg-teal-100 text-teal-800" :
                    r.party === "guest" ? "bg-blue-100 text-blue-800" :
                    "bg-purple-100 text-purple-800"
                  }`}>
                    {r.party}
                  </span>
                  <p className="text-sm text-gray-700 bg-white border border-gray-100 rounded-lg px-3 py-2 flex-1">
                    {r.note}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* New submission */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-amber-900">Add your response or more evidence</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Describe what happened, add context, or respond to any claims…"
              rows={3}
              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-amber-300 rounded-lg bg-white cursor-pointer hover:border-amber-400 transition-colors">
              <Upload className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm text-amber-700">{uploading ? "Uploading…" : "Upload photos, receipts or documents"}</span>
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
              className="bg-amber-600 hover:bg-amber-700 text-white w-full"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {submitting ? "Submitting…" : "Submit Evidence"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}