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
  password_protected: "bg-indigo-100 text-indigo-800",
  awaiting_document_verification: "bg-purple-100 text-purple-800",
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

  const setMemberLoading = (id, val) =>
    setActionLoading((prev) => ({ ...prev, [id]: val }));

  // ACTIONS
  const handleApprove = async (member) => {
    setMemberLoading(member.id, "approve");

    await base44.entities.FoundingMember.update(member.id, {
      approval_status: "invited",
    });

    try {
      await base44.functions.invoke("sendPasswordReset", {
        email: member.email,
      });
    } catch (e) {
      console.error("Password email failed", e);
    }

    setMemberLoading(member.id, null);
    fetchMembers();
  };

  const handleWaitlist = async (member) => {
    setMemberLoading(member.id, "waitlist");

    const roleLabel = member.role === "host" ? "Host" : "Cleaner";

    await base44.entities.FoundingMember.update(member.id, {
      approval_status: "waitlist",
    });

    await base44.functions.invoke("sendEmail", {
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

    const note = window.prompt(
      `Please enter a rejection reason for ${member.full_name}:`
    );

    if (!note || !note.trim()) {
      setMemberLoading(member.id, null);
      return;
    }

    await base44.entities.FoundingMember.update(member.id, {
      approval_status: "rejected",
      rejection_note: note.trim(),
    });

    await base44.functions.invoke("sendEmail", {
      to: member.email,
      subject: "Your HostKeep Application",
      html: buildEmail({
        heading: "Your HostKeep Application",
        body: `Thank you for applying to join HostKeep as a Founding ${roleLabel}.<br><br>After reviewing your application, we're unable to approve it at this time.<br><br><strong>Reason:</strong><br>${note.trim()}<br><br>If you have any questions please don't hesitate to