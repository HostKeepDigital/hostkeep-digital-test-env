import { useState } from "react";
import { ExternalLink, Check, Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import GateChecklist from "./GateChecklist";

const DOC_TYPES = [
  { key: "government_id", label: "Government ID" },
  { key: "selfie",        label: "Selfie with ID" },
  { key: "utility_bill", label: "Proof of Property" },
];

const STATUS_STYLES = {
  pending:  "bg-gray-100 text-gray-600",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function DocRow({ label, attempts, decision, onDecide, showDecisionButtons }) {
  // Most recent attempt determines if this doc type is already actioned
  const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  const alreadyActioned = latestAttempt && latestAttempt.verification_status !== "pending";
  const showButtons = showDecisionButtons && !alreadyActioned;

  return (
    <div className="py-1 border-b border-gray-100 last:border-0">

      {/* Row 1: Label + decision badge */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-gray-500 w-28 flex-shrink-0">{label}</span>
        {decision && !alreadyActioned && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${decision === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {decision === "approved" ? "Passed" : "Failed"}
            <button onClick={() => onDecide(null)} className="ml-0.5 hover:opacity-70">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>

      {/* Row 2: Attempt links */}
      <div className="flex flex-wrap gap-2 mb-1.5">
        {attempts.length === 0 ? (
          <span className="text-xs text-gray-300">No uploads yet</span>
        ) : (
          attempts.map((doc, i) => (
            <a
              key={doc.id || i}
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
            >
              Attempt {i + 1}
              <ExternalLink className="w-2.5 h-2.5" />
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[doc.verification_status] || STATUS_STYLES.pending}`}>
                {doc.verification_status || "pending"}
              </span>
            </a>
          ))
        )}
      </div>

      {/* Row 3: Pass / Fail buttons — only for pending docs */}
      {showButtons && (
        <div className="flex gap-1.5">
          <button
            onClick={() => onDecide("approved")}
            className={`px-2.5 py-0.5 rounded text-xs font-medium transition-all border ${
              decision === "approved"
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-green-700 border-green-300 hover:bg-green-50"
            }`}
          >
            Pass
          </button>
          <button
            onClick={() => onDecide("rejected")}
            className={`px-2.5 py-0.5 rounded text-xs font-medium transition-all border ${
              decision === "rejected"
                ? "bg-red-600 text-white border-red-600"
                : "bg-white text-red-700 border-red-300 hover:bg-red-50"
            }`}
          >
            Fail
          </button>
        </div>
      )}
    </div>
  );
}

export default function DocMemberTable({
  members,
  properties = [],
  verificationDocs = [],
  showApproveButton = false,
  showFailButton = false,
  onSubmitDecision,
  showDeleteButton = false,
  onDelete,
  actionLoading = {},
}) {
  const [decisions, setDecisions] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [submitted, setSubmitted] = useState({});

  const getProperty = (userId) => properties.find(p => p.owner_id === userId);

  const getDocsByType = (userId, typeKey) =>
    verificationDocs
      .filter(d => d.user_id === userId && d.document_type === typeKey)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const setDocDecision = (memberId, docKey, value) => {
    setDecisions(prev => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || {}),
        [docKey]: value,
      },
    }));
    // Clear submitted state when admin changes a decision
    setSubmitted(prev => ({ ...prev, [memberId]: false }));
  };

  const getMemberDecisions = (memberId) => decisions[memberId] || {};

  // A doc type counts as decided if:
  // - admin has set a local decision, OR
  // - the most recent attempt is already actioned (not pending)
  const allDecided = (memberId, userId) => {
    const d = getMemberDecisions(memberId);
    return DOC_TYPES.every(({ key }) => {
      if (d[key] === "approved" || d[key] === "rejected") return true;
      const attempts = getDocsByType(userId, key);
      const latest = attempts[attempts.length - 1];
      return latest && latest.verification_status !== "pending";
    });
  };

  const handleSubmit = async (member) => {
    if (!onSubmitDecision) return;
    setSubmitting(prev => ({ ...prev, [member.id]: true }));
    try {
      await onSubmitDecision(member, getMemberDecisions(member.id));
      setSubmitted(prev => ({ ...prev, [member.id]: true }));
      // Keep decisions in state so they remain visible after submit
    } finally {
      setSubmitting(prev => ({ ...prev, [member.id]: false }));
    }
  };

  const showDecisionButtons = showApproveButton || showFailButton;

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-300 text-sm">
        No records in this section
      </div>
    );
  }

  return (
    <div className="max-h-[560px] overflow-y-auto space-y-2">
      {members.map(m => {
        const prop = getProperty(m.user_id);
        const memberDecisions = getMemberDecisions(m.id);
        const canSubmit = allDecided(m.id, m.user_id);
        const isSubmitting = !!submitting[m.id];
        const isSubmitted = !!submitted[m.id];
        // Only show submit button when there are actually pending docs needing a decision
        const hasAnythingToDecide = DOC_TYPES.some(({ key }) => {
          const attempts = getDocsByType(m.user_id, key);
          const latest = attempts[attempts.length - 1];
          return !latest || latest.verification_status === "pending";
        });

        return (
          <div key={m.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="flex flex-col md:flex-row">

              {/* LEFT — Member info */}
              <div className="md:w-48 flex-shrink-0 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 p-3 flex flex-col justify-between gap-2">

                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-gray-900 leading-tight">{m.full_name}</p>
                  <p className="text-xs text-gray-400 break-all">{m.email}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${m.role === "host" ? "bg-teal-50 text-teal-700" : "bg-purple-50 text-purple-700"}`}>
                    {m.role === "host" ? "Host" : "Cleaner"}
                  </span>
                </div>

                <div className="text-xs text-gray-500 space-y-0">
                  {prop?.location?.street && <p>{prop.location.street}</p>}
                  {prop?.county && <p>{prop.county}</p>}
                  {!prop?.location?.street && !prop?.county && (
                    <p className="text-gray-300">No property on file</p>
                  )}
                  <p className="text-gray-400 pt-0.5">
                    Signed up: {m.signup_timestamp ? new Date(m.signup_timestamp).toLocaleDateString("en-GB") : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Gates</p>
                  <GateChecklist member={m} />
                </div>

                {/* Submit Decision / Submitted state */}
                {showDecisionButtons && hasAnythingToDecide && canSubmit && (
                  isSubmitted ? (
                    <div className="w-full text-center py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded border border-green-200">
                      Decision submitted ✓
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs"
                      disabled={isSubmitting}
                      onClick={() => handleSubmit(m)}
                    >
                      {isSubmitting
                        ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Submitting…</>
                        : <><Check className="w-3 h-3 mr-1" />Submit Decision</>}
                    </Button>
                  )
                )}

                {/* Delete */}
                {showDeleteButton && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 px-3 text-xs border-red-400 text-red-700 hover:bg-red-50"
                    disabled={!!actionLoading[m.id]}
                    onClick={() => onDelete && onDelete(m)}
                  >
                    {actionLoading[m.id] === "delete"
                      ? "..."
                      : <><Trash2 className="w-3 h-3 mr-1" />Delete</>}
                  </Button>
                )}
              </div>

              {/* RIGHT — Documents */}
              <div className="flex-1 p-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Verification Documents
                </p>
                <div>
                  {DOC_TYPES.map(({ key, label }) => (
                    <DocRow
                      key={key}
                      label={label}
                      attempts={getDocsByType(m.user_id, key)}
                      decision={memberDecisions[key] || null}
                      onDecide={(val) => setDocDecision(m.id, key, val)}
                      showDecisionButtons={showDecisionButtons}
                    />
                  ))}
                </div>
                {showDecisionButtons && hasAnythingToDecide && !canSubmit && (
                  <p className="text-xs text-gray-400 mt-2 italic">
                    Pass or Fail all pending documents to submit a decision.
                  </p>
                )}
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}
