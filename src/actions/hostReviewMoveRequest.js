/**
 * Host Approval Flow for Cleaner Move Requests
 *
 * This file handles the host pressing:
 *   - "Approve Move"
 *   - "Deny Move"
 *
 * It DOES:
 * - Move the cleaning job ONLY if approved
 * - Notify the cleaner of the decision
 * - Mark the request as resolved
 *
 * It DOES NOT:
 * - Touch bookings
 * - Change booking dates
 * - Override turnover rules (those were enforced in Step 3)
 */

import { base44 } from "@/api/base44Client";
import { notifyCleanerMoveApproved, notifyCleanerMoveDenied } from "@/services/cleaningJobNotifications";

/**
 * Host reviews a cleaner move request.
 *
 * @param {string|number} requestId
 * @param {"approved"|"denied"} decision
 * @returns {{
 *   success: boolean,
 *   message: string
 * }}
 */
export async function hostReviewMoveRequest(requestId, decision) {
  // 1. Fetch the move request
  const request = await base44.entities.CleaningJobMoveRequest.get(requestId);

  if (!request) {
    return {
      success: false,
      message: "Move request not found.",
    };
  }

  // 2. Ensure request is still pending
  if (request.status !== "pending") {
    return {
      success: false,
      message: "This request has already been processed.",
    };
  }

  // 3. Fetch the cleaning job
  const job = await base44.entities.CleaningJob.get(request.cleaning_job_id);

  if (!job) {
    return {
      success: false,
      message: "Cleaning job not found.",
    };
  }

  // 4. If host DENIES the request
  if (decision === "denied") {
    await base44.entities.CleaningJobMoveRequest.update(requestId, {
      status: "denied",
      resolved_at: new Date().toISOString(),
    });

    // Notify cleaner
    await notifyCleanerMoveDenied(request, job);

    return {
      success: true,
      message: "Move request denied.",
    };
  }

  // 5. If host APPROVES the request
  if (decision === "approved") {
    // Move the cleaning job to the requested date
    const newStart = new Date(request.requested_new_date);
    const newEnd = new Date(job.scheduled_end);

    // Shift end time by same delta
    const durationMs =
      new Date(job.scheduled_end).getTime() -
      new Date(job.scheduled_start).getTime();
    newEnd.setTime(newStart.getTime() + durationMs);

    await base44.entities.CleaningJob.update(job.id, {
      scheduled_start: newStart.toISOString(),
      scheduled_end: newEnd.toISOString(),
    });

    // Mark request as approved
    await base44.entities.CleaningJobMoveRequest.update(requestId, {
      status: "approved",
      resolved_at: new Date().toISOString(),
    });

    // Notify cleaner
    await notifyCleanerMoveApproved(request, job);

    return {
      success: true,
      message: "Move request approved and job updated.",
    };
  }

  return {
    success: false,
    message: "Invalid decision.",
  };
}