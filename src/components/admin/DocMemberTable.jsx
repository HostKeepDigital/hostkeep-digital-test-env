import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function DocMemberTable({ members, properties = [], verificationDocs = [], showApproveButton = false, onApprove, actionLoading = {}, showFailButton = false, failIsAttempt2 = false, onFail }) {
  const getProperty = (userId) => properties.find(p => p.owner_id === userId);
  const getVerificationDoc = (userId) => verificationDocs.find(d => d.user_id === userId);

  return (
    <div className="max-h-[220px] overflow-y-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {["Full Name", "Email", "Role", "Street Name", "County", "Country", "Uploaded Document", "Status", "Signed Up", "Actions"]
              .map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {members.map(m => {
            const prop = getProperty(m.user_id);
            const doc = getVerificationDoc(m.user_id);
            return (
              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{m.full_name}</td>
                <td className="px-4 py-3 text-gray-500">{m.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.role === "host" ? "bg-teal-50 text-teal-700" : "bg-purple-50 text-purple-700"}`}>
                    {m.role === "host" ? "Host" : "Cleaner"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-sm">{prop?.location?.street || "—"}</td>
                <td className="px-4 py-3 text-gray-500 text-sm">{prop?.county || "—"}</td>
                <td className="px-4 py-3 text-gray-500 text-sm">{prop?.country || "—"}</td>
                <td className="px-4 py-3">
                  {doc?.file_url ? (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700 inline-flex items-center gap-1 text-sm font-medium">
                      View Document <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {doc?.verification_status || "pending"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {m.signup_timestamp ? new Date(m.signup_timestamp).toLocaleDateString("en-GB") : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
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
                    {showFailButton && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 text-xs border-orange-400 text-orange-700 hover:bg-orange-50"
                        disabled={!!actionLoading[m.id]}
                        onClick={() => onFail && onFail(m, failIsAttempt2)}
                      >
                        {actionLoading[m.id] === "doc_fail" ? "..." : "Failed"}
                      </Button>
                    )}
                    {!showApproveButton && !showFailButton && <span className="text-sm text-gray-400">—</span>}
                  </div>
                </td>
              </tr>
            );
          })}
          {members.length === 0 && (
            <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-300 text-sm">No records in this section</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}