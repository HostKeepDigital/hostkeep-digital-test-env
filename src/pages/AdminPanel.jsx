import { useState, useEffect } from "react";
import { Shield, Check, X, Pause, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HOST_LIMIT = 50;
const CLEANER_LIMIT = 30;

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  out_of_area: "bg-gray-100 text-gray-700",
  waitlist: "bg-blue-100 text-blue-800",
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
    // 1. Update FoundingMember record
    await base44.entities.FoundingMember.update(member.id, { approval_status: "approved" });

    // 2. Find Base44 user and update/create UserRole
    try {
      const users = await base44.entities.User.list();
      const user = users.find(u => u.email?.toLowerCase() === member.email?.toLowerCase());
      if (user) {
        const existingRoles = await base44.entities.UserRole.filter({ user_id: user.id });
        if (existingRoles.length > 0) {
          await base44.entities.UserRole.update(existingRoles[0].id, { approval_status: "approved" });
        } else {
          await base44.entities.UserRole.create({ user_id: user.id, role: member.role, approval_status: "approved" });
        }
      }
    } catch (e) { console.error("UserRole update failed", e); }

    // 3. Send confirmation email
    const roleLabel = member.role === "host" ? "Host" : "Cleaner";
    await base44.integrations.Core.SendEmail({
      from_name: "HostKeep",
      to: member.email,
      subject: `🎉 You're approved as a Founding ${roleLabel}!`,
      body: `Hi ${member.full_name},\n\nGreat news — your application to become a Founding ${roleLabel} on HostKeep has been approved!\n\nYou can now log in and get started:\nhttps://hostkeepdigital.co.uk/login\n\nWelcome to the team!\n\nThe HostKeep Team\nHello@hostkeepdigital.co.uk`,
    });

    setMemberLoading(member.id, null);
    fetchMembers();
  };

  const handleReject = async (member) => {
    setMemberLoading(member.id, "reject");
    const approvedCount = member.role === "host" ? approvedHosts : approvedCleaners;
    const limit = member.role === "host" ? HOST_LIMIT : CLEANER_LIMIT;
    const isFull = approvedCount >= limit;
    const newStatus = isFull ? "waitlist" : "rejected";
    const roleLabel = member.role === "host" ? "Host" : "Cleaner";

    await base44.entities.FoundingMember.update(member.id, { approval_status: newStatus });

    if (isFull) {
      await base44.integrations.Core.SendEmail({
        from_name: "HostKeep",
        to: member.email,
        subject: `HostKeep Founding ${roleLabel} — You're on the waitlist`,
        body: `Hi ${member.full_name},\n\nThank you for applying to become a Founding ${roleLabel} on HostKeep.\n\nUnfortunately, our Founding ${roleLabel} spots are currently full. We've added you to our waitlist and will be in touch as soon as a spot becomes available.\n\nThank you for your patience.\n\nThe HostKeep Team\nHello@hostkeepdigital.co.uk`,
      });
    } else {
      await base44.integrations.Core.SendEmail({
        from_name: "HostKeep",
        to: member.email,
        subject: `Your HostKeep Founding ${roleLabel} Application`,
        body: `Hi ${member.full_name},\n\nThank you for applying to become a Founding ${roleLabel} on HostKeep.\n\nAfter careful review, we're unable to approve your application at this time. We appreciate your interest and hope to welcome you to HostKeep in the future.\n\nIf you have any questions, please don't hesitate to reach out at Hello@hostkeepdigital.co.uk.\n\nThe HostKeep Team`,
      });
    }

    setMemberLoading(member.id, null);
    fetchMembers();
  };

  const pendingMembers = members.filter(m => m.approval_status === "pending");
  const approvedMembers = members.filter(m => m.approval_status === "approved");
  const otherMembers = members.filter(m => !["pending", "approved"].includes(m.approval_status));

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
                      className="h-7 px-3 text-xs text-gray-600"
                      disabled={!!actionLoading[m.id]}
                    >
                      <Pause className="w-3 h-3 mr-1" />Hold
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

        {/* Approved section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Approved <span className="text-green-600 ml-1">({approvedMembers.length})</span>
          </h2>
          <MemberTable rows={approvedMembers} showActions={false} />
        </div>

        {/* Other (rejected / waitlist / out of area) */}
        {otherMembers.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Rejected / Waitlist / Out of Area <span className="text-gray-500 ml-1">({otherMembers.length})</span>
            </h2>
            <MemberTable rows={otherMembers} showActions={false} />
          </div>
        )}
      </div>
    </div>
  );
}