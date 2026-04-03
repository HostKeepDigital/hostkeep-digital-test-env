/**
 * Cleaner Move Request Action
 *
 * This file handles the cleaner pressing:
 *    "Request to Move Job"
 *
 * It does NOT:
 * - update the cleaning job
 * - change status
 * - move the job
 * - notify the host (Step 5 will do that)
 *
 * It ONLY:
 * - validates the request using Step 3 logic
 * - creates a Move Request record for the host to review
 */

import { evaluateCleanerMoveRequest } from "@/utils/cleanerMoveRequest";
import { base44 } from "@/api/base44Client";
import { notifyHostOfMoveRequest } from "@/services/cleaningJobNotifications";

/**
 * Cleaner requests to move a cleaning job forward by 1 day.
 *
 * @param {string|number} cleaningJobId
 * @param {string|number} cleanerId
 * @returns {{
 *   success: boolean,
 *   allowed: boolean,
 *   reason: string|null,
 *   newDate: Date|null,
 *   requestId: string|null
 * }}
 */
export async function cleanerRequestMove(cleaningJobId, cleanerId) {
  // 1. Fetch job
  const job = await base44.entities.CleaningJob.get(cleaningJobId);

  if (!job) {
    return {
      success: false,
      allowed: false,
      reason: "Cleaning job not found.",
      newDate: null,
      requestId: null,
    };
  }

  // 2. Ensure the cleaner owns this job
  if (String(job.cleaner_id) !== String(cleanerId)) {
    return {
      success: false,
      allowed: false,
      reason: "You are not assigned to this cleaning job.",
      newDate: null,
      requestId: null,
    };
  }

  // 3. Fetch bookings for turnover logic
  const bookings = await base44.entities.Booking.filter({
    property_id: job.property_id,
  });

  // 4. Evaluate request using Step 3 logic
  const evaluation = evaluateCleanerMoveRequest(job, bookings);

  if (!evaluation.allowed) {
    return {
      success: true,
      allowed: false,
      reason: evaluation.reason,
      newDate: evaluation.newDate,
      requestId: null,
    };
  }

  // 5. Create a Move Request record for host approval
  const moveRequest = await base44.entities.CleaningJobMoveRequest.create({
    cleaning_job_id: job.id,
    cleaner_id: cleanerId,
    property_id: job.property_id,
    requested_new_date: evaluation.newDate.toISOString(),
    status: "pending", // host will approve/deny later
  });

  // 6. Notify the host about the new move request
  await notifyHostOfMoveRequest(moveRequest, job);

  return {
    success: true,
    allowed: true,
    reason: null,
    newDate: evaluation.newDate,
    requestId: moveRequest.id,
  };
}