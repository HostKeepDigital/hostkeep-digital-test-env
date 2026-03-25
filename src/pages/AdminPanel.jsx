import { useState, useEffect } from "react";
import { buildEmail } from "@/lib/emailTemplate";
import { Shield, Check, X, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HOST_LIMIT = 50;
const CLEANER_LIMIT = 30;

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-800",
  invited: "bg-blue-100 text-blue-800",
  doc_review: "bg-purple-100 text-purple-800",
  approved: "bg-green-100 text-green-800",
  waitlist: "bg-gray-100 text-gray-600",
  rejected: "bg-red-100 text-red-800",
  out_of_area: "bg-gray-100 text-gray-700",
};

export default function AdminPanel() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const fetchMembers = async () => {
    setLoading(true);
    const data = await base44.entities.FoundingMember.list("-signup_timestamp", 200);
    setMembers(data);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const approvedHosts = members.filter(m => m.role === "host" && m.approval_status === "approved").length;
  const approvedCleaners = members.filter(m => m.role === "cleaner" && m.approval_status === "approved").length;
  const pending = members.filter(m => m.approval_status === "pending").length;
  const outOfArea = members.filter(m => m.approval_status === "out_of_area").length;

  const setMemberLoading = (id, val) => setActionLoading(p => ({ ...p, [id]: val }));

  const handleApprove = async (member) => {
    setMemberLoading(member.id, "approve");
    const roleLabel = member.role === "host" ? "Host" : "Cleaner";

    await base44.entities.FoundingMember.update(
      member.id,
      { approval_status: "invited" }
    );

    const handleApprove = async (member) => {
  setMemberLoading(member.id, "approve");

  // 1. Update founding member status
  await base44.entities.FoundingMember.update(
    member.id,
    { approval_status: "approved" }
  );

  // 2. Trigger password setup email
  try {
    await base44.functions.invoke("sendpasswordsreset", {
      email: member.email
    });
  } catch (e) {
    console.error("Password setup email failed", e);
  }

  setMemberLoading(member.id, null);
  fetchMembers();
};

await base44.functions.invoke("sendpasswordsreset", {
  email: member.email
});

    setMemberLoading(member.id, null);
    fetchMembers();
  };

  const handleWaitlist = async (member) => {
    setMemberLoading(member.id, "waitlist");
    const roleLabel = member.role === "host" ? "Host" : "Cleaner";

    await base44.entities.FoundingMember.update(member.id, { approval_status: "waitlist" });

await base44.functions.invoke('sendEmail', {
      to: member.email,
      subject: "HostKeep — You're on our waitlist",
      html: buildEmail({
        heading: "You're on our waitlist",
        body: `Thank you for applying to join HostKeep as a Founding ${roleLabel}.<br><br>Our founding spots are currently full, but we've added you to our waitlist. You'll be among the first to know when a spot opens up.<br><br>Thank you for your patience.`,
      }),
    });

    setMemberLoading(member.id, null);
    fetchMembers();
  };

  const handleReject = async (member) => {
    setMemberLoading(member.id, "reject");
    const roleLabel = member.role === "host" ? "Host" : "Cleaner";

    await base44.entities.FoundingMember.update(member.id, { approval_status: "rejected" });

await base44.functions.invoke('sendEmail', {
      to: member.email,
      subject: "Your HostKeep Application",
      html: buildEmail({
        heading: "Your HostKeep Application",
        body: `Thank you for applying to join HostKeep as a Founding ${roleLabel}.<br><br>After reviewing your application, we're unable to approve it at this time.<br><br>If you have any questions please don't hesitate to get in touch.`,
      }),
    });

    setMemberLoading(member.id, null);
    fetchMembers();
  };

  const handleDelete = async (member) => {
  if (!window.confirm('Delete ' + member.full_name + '? This cannot be undone.')) return;
  setMemberLoading(member.id, "delete");
  await base44.entities.FoundingMember.delete(member.id);
  setMemberLoading(member.id, null);
  fetchMembers();
};

  const pendingMembers = members.filter(m => m.approval_status === "pending");
  const invitedMembers = members.filter(m => ["invited", "doc_review"].includes(m.approval_status));
  const approvedMembers = members.filter(m => m.approval_status === "approved");
  const otherMembers = members.filter(m => !["pending", "invited", "doc_review", "approved"].includes(m.approval_status));

  const MemberTable = ({ rows, showActions }) => (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {["Full Name", "Email", "Role", "Postcode", "Status", "Signed Up", showActions ? "Actions" : null].filter(Boolean).map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.length === 0 ? (
            <tr><td colSpan={showActions ? 7 : 6} className="px-4 py-8 text-center text-gray-400">No records</td></tr>
          ) : rows.map(m => (
            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{m.full_name}</td>
              <td className="px-4 py-3 text-gray-600">{m.email}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.role === "host" ? "bg-teal-100 text-teal-700" : "bg-purple-100 text-purple-700"}`}>
                  {m.role === "host" ? "Host" : "Cleaner"}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600 uppercase">{m.postcode}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[m.approval_status] || "bg-gray-100 text-gray-600"}`}>
                  {m.approval_status?.replace("_", " ")}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {m.signup_timestamp ? new Date(m.signup_timestamp).toLocaleDateString("en-GB") : "—"}
              </td>
              {showActions && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white h-7 px-3 text-xs"
                      disabled={!!actionLoading[m.id]}
                      onClick={() => handleApprove(m)}
                    >
                      {actionLoading[m.id] === "approve" ? "..." : <><Check className="w-3 h-3 mr-1" />Approve</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs border-amber-400 text-amber-700 hover:bg-amber-50"
                      disabled={!!actionLoading[m.id]}
                      onClick={() => handleWaitlist(m)}
                    >
                      {actionLoading[m.id] === "waitlist" ? "..." : "Waitlist"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 px-3 text-xs"
                      disabled={!!actionLoading[m.id]}
                      onClick={() => handleReject(m)}
                    >
                      {actionLoading[m.id] === "reject" ? "..." : <><X className="w-3 h-3 mr-1" />Reject</>}
                    </Button>
                    <Button
                       size="sm"
                       variant="outline"
                       className="h-7 px-3 text-xs border-gray-300 text-gray-500 hover:bg-gray-50"
                       disabled={!!actionLoading[m.id]}
                       onClick={() => handleDelete(m)}
                    >
                       {actionLoading[m.id] === "delete" ? "..." : "Delete"}
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-rose-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel — Founding Members</h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMembers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>

        {/* Summary counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Founding Hosts", value: `${approvedHosts} of ${HOST_LIMIT}`, color: "text-teal-600" },
            { label: "Founding Cleaners", value: `${approvedCleaners} of ${CLEANER_LIMIT}`, color: "text-purple-600" },
            { label: "Pending", value: pending, color: "text-yellow-600" },
            { label: "Out of Area", value: outOfArea, color: "text-gray-500" },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Pending section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Pending Applications <span className="text-yellow-600 ml-1">({pendingMembers.length})</span>
          </h2>
          <MemberTable rows={pendingMembers} showActions={true} />
        </div>

        {invitedMembers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Invited / In Progress <span className="text-blue-600 ml-1">({invitedMembers.length})</span>
            </h2>
            <MemberTable rows={invitedMembers} showActions={true} />
          </div>
        )}

        {/* Approved section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Approved <span className="text-green-600 ml-1">({approvedMembers.length})</span>
          </h2>
          <MemberTable rows={approvedMembers} showActions={true} />
        </div>

        {/* Other (rejected / waitlist / out of area) */}
        {otherMembers.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Rejected / Waitlist / Out of Area <span className="text-gray-500 ml-1">({otherMembers.length})</span>
            </h2>
            <MemberTable rows={otherMembers} showActions={true} />
          </div>
        )}
      </div>
    </div>
  );
}