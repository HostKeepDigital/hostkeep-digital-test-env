import { useState, useEffect } from "react";
import { buildEmail } from "@/lib/emailTemplate";
import {
  Shield,
  Check,
  X,
  RefreshCw,
  Clock,
  UserCheck,
  Hourglass,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

const HOST_LIMIT = 50;
const CLEANER_LIMIT = 30;

const STATUS_COLORS = {
  interest: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-800",
  invited: "bg-blue-100 text-blue-800",
  password_protected: "bg-indigo-100 text-indigo-700",
  awaiting_document_verification: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  waitlist: "bg-orange-100 text-orange-700",
  rejected: "bg-red-100 text-red-700",
  out_of_area: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS = {
  interest: "Interest",
  pending: "Pending",
  invited: "Invited",
  password_protected: "Password Protected",
  awaiting_document_verification: "Awaiting Docs",
  approved: "Approved",
  waitlist: "Waitlist",
  rejected: "Rejected",
  out_of_area: "Out of Area",
};

export default function AdminPanel() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const fetchMembers = async () => {
    setLoading(true);
    const data = await base44.entities.FoundingMember.list(
      "-signup_timestamp",
      500
    );
    setMembers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const setMemberLoading = (id, val) =>
    setActionLoading((p) => ({ ...p, [id]: val }));

  // APPROVE — NEW FLOW
  const handleApprove = async (member) => {
    setMemberLoading(member.id, "approve");

    try {
      // Update FoundingMember status
      await base44.entities.FoundingMember.update(member.id, {
        approval_status: "approved",
      });

      // Call your new backend approval function
      await base44.functions.invoke("approveUsers", {
        member_id: member.id,
      });
    } catch (e) {
      console.error("Approval failed", e);
    }

    setMemberLoading(member.id, null);
    fetchMembers();
  };

  // WAITLIST
  const handleWaitlist = async (member) => {
    setMemberLoading(member.id, "waitlist");

    await base44.entities.FoundingMember.update(member.id, {
      approval_status: "waitlist",
    });

    await base44.functions.invoke("sendEmail", {
      to: member.email,
      subject: "HostKeep — You're on our waitlist",
      html: buildEmail({
        heading: "You're on our waitlist",
        body: `
          Thank you for applying to join HostKeep.<br><br>
          Our founding spots are currently full, but we've added you to our waitlist.<br><br>
          You'll be among the first to know when a spot opens up.
        `,
      }),
    });

    setMemberLoading(member.id, null);
    fetchMembers();
  };

  // REJECT
  const handleReject = async (member) => {
    setMemberLoading(member.id, "reject");

    const note = window.prompt(
      `Please enter a rejection reason for ${member.full_name}:`
    );
    if (!note || !note.trim()) {
      setMemberLoading(member.id, null);
      return;
    }

    await base44.entities.FoundingMember.update(member.id, {
      approval_status: "rejected",
    });

    await base44.functions.invoke("sendEmail", {
      to: member.email,
      subject: "Your HostKeep Application",
      html: buildEmail({
        heading: "Your HostKeep Application",
        body: `
          Thank you for applying to join HostKeep.<br><br>
          After reviewing your application, we are unable to approve it at this time.<br><br>
          <strong>Reason:</strong><br>
          ${note.trim()}<br><br>
          If you have any questions, please contact us at
          <a href="mailto:hello@hostkeepdigital.co.uk" style="color:#0d9488;">hello@hostkeepdigital.co.uk</a>.
        `,
      }),
    });

    setMemberLoading(member.id, null);
    fetchMembers();
  };

  // DELETE
  const handleDelete = async (member) => {
    if (
      !window.confirm(
        "Delete " + member.full_name + "? This cannot be undone."
      )
    )
      return;

    setMemberLoading(member.id, "delete");
    await base44.entities.FoundingMember.delete(member.id);
    setMemberLoading(member.id, null);
    fetchMembers();
  };

  // FILTERS
  const interestMembers = members.filter(
    (m) => m.approval_status === "interest"
  );
  const pendingMembers = members.filter(
    (m) => m.approval_status === "pending"
  );
  const invitedMembers = members.filter(
    (m) => m.approval_status === "invited"
  );
  const passwordProtectedMembers = members.filter(
    (m) => m.approval_status === "password_protected"
  );
  const awaitingDocMembers = members.filter(
    (m) => m.approval_status === "awaiting_document_verification"
  );
  const approvedMembers = members.filter(
    (m) => m.approval_status === "approved"
  );
  const waitlistMembers = members.filter(
    (m) => m.approval_status === "waitlist"
  );
  const rejectedMembers = members.filter(
    (m) => m.approval_status === "rejected"
  );
  const outOfAreaMembers = members.filter(
    (m) => m.approval_status === "out_of_area"
  );

  const hostCount = approvedMembers.filter((m) => m.role === "host").length;
  const cleanerCount = approvedMembers.filter(
    (m) => m.role === "cleaner"
  ).length;

  // MEMBER TABLE
  const MemberTable = ({ members: rows, showActions = false }) => (
    <div className="max-h-[200px] overflow-y-auto scroll-area rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {[
              "Full Name",
              "Email",
              "Role",
              "Postcode",
              "Status",
              "Signed Up",
              showActions ? "Actions" : null,
            ]
              .filter(Boolean)
              .map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">
                {m.full_name}
              </td>
              <td className="px-4 py-3 text-gray-500">{m.email}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    m.role === "host"
                      ? "bg-teal-50 text-teal-700"
                      : "bg-purple-50 text-purple-700"
                  }`}
                >
                  {m.role === "host" ? "Host" : "Cleaner"}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500 uppercase tracking-wide text-xs">
                {m.postcode}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_COLORS[m.approval_status] ||
                    "bg-gray-100 text-gray-600"
                  }`}
                >
                  {STATUS_LABELS[m.approval_status] || m.approval_status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {m.signup_timestamp
                  ? new Date(m.signup_timestamp).toLocaleDateString("en-GB")
                  : "—"}
              </td>

              {showActions && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
                      disabled={!!actionLoading[m.id]}
                      onClick={() => handleApprove(m)}
                    >
                      {actionLoading[m.id] === "approve" ? (
                        "..."
                      ) : (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Approve
                        </>
                      )}
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
                      {actionLoading[m.id] === "reject" ? (
                        "..."
                      ) : (
                        <>
                          <X className="w-3 h-3 mr-1" />
                          Reject
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs border-gray-200 text-gray-400 hover:bg-gray-50"
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
              <td
                colSpan={showActions ? 7 : 6}
                className="px-4 py-10 text-center text-gray-300 text-sm"
              >
                No records in this section
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // SECTION WRAPPER
  const Section = ({ title, count, children, accent = "gray" }) => {
    const dotColors = {
      gray: "bg-gray-300",
      amber: "bg-amber-400",
      blue: "bg-blue-400",
      indigo: "bg-indigo-400",
      purple: "bg-purple-400",
      green: "bg-green-500",
      orange: "bg-orange-400",
      red: "bg-red-400",
    };

    return (
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              dotColors[accent] || dotColors.gray
            }`}
          />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {title}
          </h2>
          <span className="ml-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
            {count}
          </span>
        </div>
        {children}
      </section>
    );
  };

  // RENDER
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1E3A5F] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                Admin Panel
              </h1>
              <p className="text-xs text-gray-400">
                Founding member management
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchMembers}
            disabled={loading}
            className="gap-2 text-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-300 text-sm">
            Loading members...
          </div>
        ) : (
          <div className="space-y-8">
            <Section
              title="Interest / Sign-Ups"
              count={interestMembers.length}
              accent="gray"
            >
              <MemberTable members={interestMembers} showActions />
            </Section>

            <Section
              title="Pending Applications"
              count={pendingMembers.length}
              accent="amber"
            >
              <MemberTable members={pendingMembers} showActions />
            </Section>

            <Section
              title="Invited"
              count={invitedMembers.length}
              accent="blue"
            >
              <MemberTable members={invitedMembers} showActions />
            </Section>

            <Section
              title="Password Protected"
              count={passwordProtectedMembers.length}
              accent="indigo"
            >
              <MemberTable members={passwordProtectedMembers} showActions />
            </Section>

            <Section
              title="Awaiting Document Verification"
              count={awaitingDocMembers.length}
              accent="purple"
            >
              <MemberTable members={awaitingDocMembers} showActions />
            </Section>

            <Section
              title="Approved"
              count={approvedMembers.length}
              accent="green"
            >
              <MemberTable members={approvedMembers} showActions />
            </Section>

            <Section
              title="Waitlist"
              count={waitlistMembers.length}
              accent="orange"
            >
              <MemberTable members={waitlistMembers} showActions />
            </Section>

            <Section
              title="Rejected"
              count={rejectedMembers.length}
              accent="red"
            >
              <MemberTable members={rejectedMembers} showActions />
            </Section>

            <Section
              title="Out of Area"
              count={outOfAreaMembers.length}
              accent="gray"
            >
              <MemberTable members={outOfAreaMembers} showActions />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}