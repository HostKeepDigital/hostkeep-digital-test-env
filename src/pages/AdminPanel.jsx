import { useState, useEffect } from "react";
import { buildEmail } from "@/lib/emailTemplate";
import { Shield, Check, X, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

const HOST_LIMIT = 50;
const CLEANER_LIMIT = 30;

const STATUS_COLORS = {
  interest: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-800",
  invited: "bg-blue-100 text-blue-800",
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
    const data = await base44.entities.FoundingMember.list("-signup_timestamp", 500);
    setMembers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const setMemberLoading = (id, val) => setActionLoading(p => ({ ...p, [id]: val }));

  const handleApprove = async (member) => {
    setMemberLoading(member.id, "approve");
    const roleLabel = member.role === "host" ? "Host" : "Cleaner";

    await base44.entities.FoundingMember.update(member.id, { approval_status: "approved" });

    try {
      await base44.functions.invoke('sendEmail', {
        from_name: "HostKeep",
        to: member.email,
        subject: "You're approved — Welcome to HostKeep",
        html: buildEmail({
          heading: "Welcome to HostKeep!",
          body: `Congratulations! Your application to join HostKeep as a Founding ${roleLabel} has been approved.<br><br>You can now sign in and get started.`,
        }),
      });
    } catch (e) {
      console.error("Approval email failed", e);
    }

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

    const note = window.prompt(`Please enter a rejection reason for ${member.full_name}:`);
    if (!note || !note.trim()) {
      setMemberLoading(member.id, null);
      return;
    }

    await base44.entities.FoundingMember.update(member.id, { approval_status: "rejected" });

    await base44.functions.invoke('sendEmail', {
      to: member.email,
      subject: "Your HostKeep Application",
      html: buildEmail({
        heading: "Your HostKeep Application",
        body: `Thank you for applying to join HostKeep as a Founding ${roleLabel}.<br><br>After reviewing your application, we are unable to approve it at this time.<br><br><strong>Reason:</strong><br>${note.trim()}<br><br>If you have any questions please contact us at hello@hostkeepdigital.co.uk.`,
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
  const approvedMembers = members.filter(m => m.approval_status === "approved");
  const waitlistMembers = members.filter(m => m.approval_status === "waitlist");
  const rejectedMembers = members.filter(m => m.approval_status === "rejected");

  const hostCount = approvedMembers.filter(m => m.role === "host").length;
  const cleanerCount = approvedMembers.filter(m => m.role === "cleaner").length;

  const MemberTable = ({ members: rows, showActions = false }) => (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {["Full Name", "Email", "Role", "Postcode", "Status", "Signed Up", showActions ? "Actions" : null]
              .filter(Boolean)
              .map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map(m => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{m.full_name}</td>
              <td className="px-4 py-3 text-gray-600">{m.email}</td>
              <td className="px-4 py-3">
                <span className="capitalize text-gray-700">{m.role}</span>
              </td>
              <td className="px-4 py-3 text-gray-600">{m.postcode}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[m.approval_status] || "bg-gray-100 text-gray-600"}`}>
                  {m.approval_status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {m.signup_timestamp ? new Date(m.signup_timestamp).toLocaleDateString("en-GB") : "—"}
              </td>
              {showActions && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
                      disabled={!!actionLoading[m.id]}
                      onClick={() => handleApprove(m)}
                    >
                      {actionLoading[m.id] === "approve" ? "..." : <><Check className="w-3 h-3 mr-1" />Approve</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                      disabled={!!actionLoading[m.id]}
                      onClick={() => handleWaitlist(m)}
                    >
                      {actionLoading[m.id] === "waitlist" ? "..." : "Waitlist"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs border-red-300 text-red-600 hover:bg-red-50"
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
          {rows.length === 0 && (
            <tr>
              <td colSpan={showActions ? 7 : 6} className="px-4 py-8 text-center text-gray-400">No members found</td>
            </tr>
          )}
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-500">Founding member applications</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchMembers} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Pending", value: pendingMembers.length, color: "text-amber-600" },
            { label: `Hosts Approved (${HOST_LIMIT} max)`, value: hostCount, color: "text-green-600" },
            { label: `Cleaners Approved (${CLEANER_LIMIT} max)`, value: cleanerCount, color: "text-blue-600" },
            { label: "Waitlisted", value: waitlistMembers.length, color: "text-gray-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Pending Review ({pendingMembers.length})</h2>
              <MemberTable members={pendingMembers} showActions />
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Approved ({approvedMembers.length})</h2>
              <MemberTable members={approvedMembers} />
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Waitlisted ({waitlistMembers.length})</h2>
              <MemberTable members={waitlistMembers} />
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Rejected ({rejectedMembers.length})</h2>
              <MemberTable members={rejectedMembers} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}