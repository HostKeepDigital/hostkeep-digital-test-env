// src/actions/cleanerReviewHostMoveRequest.js

/**
 * Cleaner Review of Host Move Request (Full File)
 *
 * This file handles the cleaner pressing:
 *   - "Accept New Date"
 *   - "Decline Request"
 *
 * It DOES:
 * - Move the job ONLY if cleaner approves
 * - Notify the host of the decision
 * - Mark the request as resolved
 *
 * It DOES NOT:
 * - Touch bookings
 * - Override turnover rules
 * - Allow movement inside 24 hours
 */

import { base44 } from "@/api/base44Client";
import {
  notifyHostMoveApprovedByCleaner,
  notifyHostMoveDeniedByCleaner,
} from "@/services/cleaningJobNotifications";

/**
 * Cleaner reviews a host move request.
 *
 * @param {string|number} requestId
 * @param {"approved"|"denied"} decision
 * @param {string|number} cleanerId
 * @returns {{
 *   success: boolean,
 *   message: string
 * }}
 */
export async function cleanerReviewHostMoveRequest(requestId, decision, cleanerId) {
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

  // 3. Ensure the cleaner is the assigned cleaner
  if (String(request.cleaner_id) !== String(cleanerId)) {
    return {
      success: false,
      message: "You are not assigned to this cleaning job.",
    };
  }

  // 4. Fetch the cleaning job
  const job = await base44.entities.CleaningJob.get(request.cleaning_job_id);

  if (!job) {
    return {
      success: false,
      message: "Cleaning job not found.",
    };
  }

  // 5. If cleaner DENIES the request
  if (decision === "denied") {
    await base44.entities.CleaningJobMoveRequest.update(requestId, {
      status: "denied",
      resolved_at: new Date().toISOString(),
    });

    // Notify host
    await notifyHostMoveDeniedByCleaner(request, job);

    return {
      success: true,
      message: "You have declined the host's request.",
    };
  }

  // 6. If cleaner APPROVES the request
  if (decision === "approved") {
    const newStart = new Date(request.requested_new_date);

    // Preserve duration
    const originalStart = new Date(job.scheduled_start);
    const originalEnd = new Date(job.scheduled_end);
    const durationMs = originalEnd.getTime() - originalStart.getTime();

    const newEnd = new Date(newStart.getTime() + durationMs);

    // Update the cleaning job schedule
    await base44.entities.CleaningJob.update(job.id, {
      scheduled_start: newStart.toISOString(),
      scheduled_end: newEnd.toISOString(),
    });

    // Mark request as approved
    await base44.entities.CleaningJobMoveRequest.update(requestId, {
      status: "approved",
      resolved_at: new Date().toISOString(),
    });

    // Notify host
    await notifyHostMoveApprovedByCleaner(request, job);

    return {
      success: true,
      message: "You have accepted the new cleaning date.",
    };
  }

  return {
    success: false,
    message: "Invalid decision.",
  };
}