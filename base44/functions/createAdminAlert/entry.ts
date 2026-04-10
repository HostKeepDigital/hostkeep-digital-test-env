import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data } = body;

    let alertPayload = null;

    // ── Failed / overdue balance payment ─────────────────────────────────────
    if (event?.entity_name === "Booking" && event?.type === "update") {
      const newStatus = data?.balance_payment_status;
      const oldStatus = old_data?.balance_payment_status;

      if (newStatus === "failed" && oldStatus !== "failed") {
        alertPayload = {
          alert_type: "failed_payment",
          severity: "critical",
          title: "Balance Payment Failed",
          message: `Balance payment failed for booking by ${data.guest_name || "unknown guest"} (check-in: ${data.check_in}). Amount: £${data.total_amount || 0}.`,
          entity_id: data.id,
          entity_type: "Booking",
          metadata: {
            guest_name: data.guest_name,
            guest_email: data.guest_email,
            check_in: data.check_in,
            total_amount: data.total_amount,
          },
        };
      } else if (newStatus === "overdue" && oldStatus !== "overdue") {
        alertPayload = {
          alert_type: "payment_overdue",
          severity: "critical",
          title: "Balance Payment Overdue",
          message: `Balance payment is overdue for booking by ${data.guest_name || "unknown guest"} (check-in: ${data.check_in}). Amount: £${data.total_amount || 0}.`,
          entity_id: data.id,
          entity_type: "Booking",
          metadata: {
            guest_name: data.guest_name,
            guest_email: data.guest_email,
            check_in: data.check_in,
            total_amount: data.total_amount,
          },
        };
      }
    }

    // ── High risk user registered ─────────────────────────────────────────────
    if (event?.entity_name === "RiskScores" && event?.type === "create") {
      if (data?.risk_level === "high") {
        alertPayload = {
          alert_type: "high_risk_user",
          severity: "critical",
          title: "High-Risk User Registration",
          message: `A new user has been flagged as high-risk (score: ${data.score || "unknown"}). User ID: ${data.user_id}.`,
          entity_id: data.id,
          entity_type: "RiskScores",
          metadata: {
            user_id: data.user_id,
            score: data.score,
            risk_level: data.risk_level,
          },
        };
      }
    }

    // Also catch high-risk updates if it escalates from non-high → high
    if (event?.entity_name === "RiskScores" && event?.type === "update") {
      if (data?.risk_level === "high" && old_data?.risk_level !== "high") {
        alertPayload = {
          alert_type: "high_risk_user",
          severity: "critical",
          title: "User Escalated to High Risk",
          message: `A user has been escalated to high-risk status (score: ${data.score || "unknown"}). User ID: ${data.user_id}.`,
          entity_id: data.id,
          entity_type: "RiskScores",
          metadata: {
            user_id: data.user_id,
            score: data.score,
            risk_level: data.risk_level,
          },
        };
      }
    }

    // ── New complaint raised ──────────────────────────────────────────────────
    if (event?.entity_name === "Complaint" && event?.type === "create") {
      const typeLabel = data.complaint_type === "damage_claim" ? "Damage Claim" : "Rental Dispute";
      alertPayload = {
        alert_type: "new_complaint",
        severity: "warning",
        title: `New ${typeLabel} Raised`,
        message: `A ${typeLabel.toLowerCase()} has been raised by a ${data.raised_by || "user"} on booking ID: ${data.booking_id}. Category: ${data.category || "unspecified"}.`,
        entity_id: data.id,
        entity_type: "Complaint",
        metadata: {
          booking_id: data.booking_id,
          raised_by: data.raised_by,
          complaint_type: data.complaint_type,
          category: data.category,
        },
      };
    }

    // ── Document verification failed (2nd attempt) ────────────────────────────
    if (event?.entity_name === "FoundingMember" && event?.type === "update") {
      if (data?.approval_status === "documentation_failed_attempt_2" && old_data?.approval_status !== "documentation_failed_attempt_2") {
        alertPayload = {
          alert_type: "document_failed",
          severity: "warning",
          title: "Document Verification Failed — 2nd Attempt",
          message: `${data.full_name || "A member"} (${data.email}) has failed document verification for the second time. Manual review required.`,
          entity_id: data.id,
          entity_type: "FoundingMember",
          metadata: {
            full_name: data.full_name,
            email: data.email,
            role: data.role,
            postcode: data.postcode,
          },
        };
      }
    }

    if (!alertPayload) {
      return Response.json({ skipped: true, reason: "No matching alert condition" });
    }

    const created = await base44.asServiceRole.entities.AdminAlert.create({
      ...alertPayload,
      status: "unread",
    });

    return Response.json({ success: true, alert_id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});