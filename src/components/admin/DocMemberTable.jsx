import { ExternalLink, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import GateChecklist from "./GateChecklist";

const DOC_TYPES = [
  { key: "government_id",   label: "Government ID" },
  { key: "selfie",          label: "Selfie with ID" },
  { key: "utility_bill",    label: "Proof of Property" },
];

const STATUS_STYLES = {
  pending:  "bg-gray-100 text-gray-600",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function DocRow({ label, attempts }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="w-36 flex-shrink-0 text-xs font-medium text-gray-500">{label}</span>
      <div className="flex flex-wrap gap-2">
        {attempts.length === 0 ? (
          <span className="text-xs text-gray-300">—</span>
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
    </div>
  );
}

export default function DocMemberTable({
  members,
  properties = [],
  verificationDocs = [],
  showApproveButton = false,
  onApprove,
  actionLoading = {},
  showFailButton = false,
  failIsAttempt2 = false,
  onFail,
  showDeleteButton = false,
  onDelete,
}) {
  const getProperty = (userId) => properties.find(p => p.owner_id === userId);

  const getDocsByType = (userId, typeKey) =>
    verificationDocs
      .filter(d => d.user_id === userId && d.document_type === typeKey)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-300 text-sm">
        No records in this section
      </div>
    );
  }

  return (
    <div className="max-h-[560px] overflow-y-auto space-y-4">
      {members.map(m => {
        const prop = getProperty(m.user_id);
        const allGatesPassed = m.documents_verified && m.stripe_verified && m.subscription_active;

        return (
          <div key={m.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="flex flex-col md:flex-row">

              {/* LEFT — Member info */}
              <div className="md:w-64 flex-shrink-0 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 p-4 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{m.full_name}</p>
                  <p className="text-xs text-gray-500 break-all">{m.email}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${m.role === "host" ? "bg-teal-50 text-teal-700" : "bg-purple-50 text-purple-700"}`}>
                    {m.role === "host" ? "Host" : "Cleaner"}
                  </span>
                </div>

                <div className="space-y-0.5 text-xs text-gray-500">
                  {prop?.location?.street && <p>{prop.location.street}</p>}
                  {prop?.county && <p>{prop.county}</p>}
                  {!prop?.location?.street && !prop?.county && <p className="text-gray-300">No property on file</p>}
                  <p className="text-gray-400 mt-1">
                    Signed up: {m.signup_timestamp ? new Date(m.signup_timestamp).toLocaleDateString("en-GB") : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Gates</p>
                  <GateChecklist member={m} />
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {showApproveButton && (
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
                      disabled={!!actionLoading[m.id]}
                      onClick={() => onApprove && onApprove(m)}
                    >
                      {actionLoading[m.id] === "doc_approve" ? "..." : <><Check className="w-3 h-3 mr-1" />Approve</>}
                    </Button>
                  )}
                  {allGatesPassed && (
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Auto-approving…</span>
                  )}
                  {showFailButton && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs border-orange-400 text-orange-700 hover:bg-orange-50"
                      disabled={!!actionLoading[m.id]}
                      onClick={() => onFail && onFail(m, failIsAttempt2)}
                    >
                      {actionLoading[m.id] === "doc_fail" || actionLoading[m.id] === "doc_ban" ? "..." : "Failed"}
                    </Button>
                  )}
                  {showDeleteButton && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs border-red-400 text-red-700 hover:bg-red-50"
                      disabled={!!actionLoading[m.id]}
                      onClick={() => onDelete && onDelete(m)}
                    >
                      {actionLoading[m.id] === "delete" ? "..." : <><Trash2 className="w-3 h-3 mr-1" />Delete</>}
                    </Button>
                  )}
                  {!showApproveButton && !showFailButton && !showDeleteButton && (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              </div>

              {/* RIGHT — Documents */}
              <div className="flex-1 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Verification Documents</p>
                <div className="divide-y divide-gray-100">
                  {DOC_TYPES.map(({ key, label }) => (
                    <DocRow
                      key={key}
                      label={label}
                      attempts={getDocsByType(m.user_id, key)}
                    />
                  ))}
                </div>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}