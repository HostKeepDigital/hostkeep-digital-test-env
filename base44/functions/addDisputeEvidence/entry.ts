/**
 * addDisputeEvidence — lets a host or guest add additional evidence/notes
 * to an open or under_review complaint they are party to.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { session_token, complaint_id, note, evidence_urls } = body;

    if (!session_token) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const sessions = await serviceRole.entities.UserSession.filter({ session_token });
    const session = sessions?.[0];
    if (!session || new Date(session.expires_at) < new Date()) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!complaint_id) {
      return Response.json({ error: "complaint_id required" }, { status: 400 });
    }

    const complaint = await serviceRole.entities.Complaint.get(complaint_id);
    if (!complaint) {
      return Response.json({ error: "Complaint not found" }, { status: 404 });
    }

    if (!["open", "under_review"].includes(complaint.status)) {
      return Response.json({ error: "Complaint is already resolved" }, { status: 400 });
    }

    const booking = await serviceRole.entities.Booking.get(complaint.booking_id);
    if (!booking) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only the guest or host on this booking can add evidence
    if (session.user_id !== booking.guest_id && session.user_id !== booking.host_id && session.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const party = session.user_id === booking.host_id ? "host" : session.user_id === booking.guest_id ? "guest" : "admin";

    // Append new evidence URLs
    const existingUrls = complaint.evidence_urls || [];
    const newUrls = evidence_urls || [];
    const mergedUrls = [...existingUrls, ...newUrls];

    // Append note to admin_notes style log (stored as JSON array in a new field)
    const existingResponses = complaint.party_responses || [];
    const updatedResponses = note
      ? [...existingResponses, { party, note, submitted_at: new Date().toISOString() }]
      : existingResponses;

    await serviceRole.entities.Complaint.update(complaint_id, {
      evidence_urls: mergedUrls,
      party_responses: updatedResponses,
      status: "under_review",
    });

    // Notify admin
    try {
      const adminEmail = Deno.env.get("ADMIN_EMAIL") || "hello@hostkeepdigital.co.uk";
      await serviceRole.functions.invoke("sendEmail", {
        to: adminEmail,
        subject: `New Evidence Added — Complaint ${complaint_id}`,
        body: `The ${party} has added new evidence to complaint ${complaint_id} (booking ${complaint.booking_id}).\n\nNote: ${note || "No note"}\nNew files: ${newUrls.length}`,
      });
    } catch (_) {}

    return Response.json({ success: true });
  } catch (err) {
    console.error("addDisputeEvidence error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});