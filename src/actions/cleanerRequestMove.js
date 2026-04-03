// src/actions/cleanerRequestMove.js

/**
 * Cleaner Move Request Action (Full Replacement)
 *
 * This file handles the cleaner pressing:
 *    "Request to Move Job"
 *
 * It DOES:
 * - Validate the request using turnover + job state rules
 * - Ensure the cleaner is assigned to the job
 * - Create a pending Move Request record
 * - Notify the host of the new request
 *
 * It DOES NOT:
 * - Move the job
 * - Change job status
 * - Change booking dates
 * - Override turnover rules
 */

import { base44 } from "@/api/base44Client";
import { evaluateCleanerMoveRequest } from "@/utils/cleanerMoveRequest";
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
  // 1. Fetch the cleaning job
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

  // 2. Ensure the cleaner is assigned to this job
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

  // 4. Evaluate the request using Step 3 logic
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

  // 5. Create a Move Request record (host will approve/deny later)
  const moveRequest = await base44.entities.CleaningJobMoveRequest.create({
    cleaning_job_id: job.id,
    cleaner_id: cleanerId,
    property_id: job.property_id,
    requested_new_date: evaluation.newDate.toISOString(),
    status: "pending",
    created_at: new Date().toISOString(),
  });

  // 6. Notify the host of the new request
  await notifyHostOfMoveRequest(moveRequest, job);

  // 7. Return success to the cleaner UI
  return {
    success: true,
    allowed: true,
    reason: null,
    newDate: evaluation.newDate,
    requestId: moveRequest.id,
  };
}