// src/actions/hostRequestMove.js

/**
 * Host Request Move Action (Full File)
 *
 * This file handles the host pressing:
 *    "Request New Cleaning Date"
 *
 * It DOES:
 * - Validate turnover rules
 * - Validate 24-hour lockout
 * - Validate job state
 * - Create a pending move request
 * - Notify the cleaner
 *
 * It DOES NOT:
 * - Move the job
 * - Change job status
 * - Touch bookings
 * - Override turnover rules
 */

import { base44 } from "@/api/base44Client";
import { hasSameDayTurnover } from "@/utils/turnover";
import { notifyCleanerOfHostMoveRequest } from "@/services/cleaningJobNotifications";

/**
 * Host requests to move a cleaning job to a new date.
 *
 * @param {string|number} cleaningJobId
 * @param {string|number} hostId
 * @param {Date|string} newDate
 * @returns {{
 *   success: boolean,
 *   allowed: boolean,
 *   reason: string|null,
 *   requestId: string|null
 * }}
 */
export async function hostRequestMove(cleaningJobId, hostId, newDate) {
  const targetDate = new Date(newDate);

  // 1. Fetch the cleaning job
  const job = await base44.entities.CleaningJob.get(cleaningJobId);

  if (!job) {
    return {
      success: false,
      allowed: false,
      reason: "Cleaning job not found.",
      requestId: null,
    };
  }

  // 2. Ensure the host owns this property
  if (String(job.host_id) !== String(hostId)) {
    return {
      success: false,
      allowed: false,
      reason: "You do not have permission to modify this job.",
      requestId: null,
    };
  }

  // 3. 24-hour lockout
  const now = new Date();
  const jobStart = new Date(job.scheduled_start);
  const hoursUntilJob = (jobStart - now) / (1000 * 60 * 60);

  if (hoursUntilJob < 24) {
    return {
      success: true,
      allowed: false,
      reason: "This job cannot be moved within 24 hours of its start time.",
      requestId: null,
    };
  }

  // 4. Turnover rule
  const bookings = await base44.entities.Booking.filter({
    property_id: job.property_id,
  });

  const turnover = hasSameDayTurnover(bookings, job.property_id, targetDate);

  if (turnover) {
    return {
      success: true,
      allowed: false,
      reason:
        "This job cannot be moved to the selected date due to same-day turnover.",
      requestId: null,
    };
  }

  // 5. Create a move request (host → cleaner)
  const moveRequest = await base44.entities.CleaningJobMoveRequest.create({
    cleaning_job_id: job.id,
    property_id: job.property_id,
    requested_by: "host",
    host_id: hostId,
    cleaner_id: job.cleaner_id,
    requested_new_date: targetDate.toISOString(),
    status: "pending",
    created_at: new Date().toISOString(),
  });

  // 6. Notify the cleaner
  await notifyCleanerOfHostMoveRequest(moveRequest, job);

  return {
    success: true,
    allowed: true,
    reason: null,
    requestId: moveRequest.id,
  };
}