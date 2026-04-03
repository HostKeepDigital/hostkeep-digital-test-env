/**
 * Cleaner Cancellation Flow (Full File)
 *
 * Cleaners can cancel a job at ANY time.
 * - If >24 hours before start → normal cancellation
 * - If <24 hours → allowed, but reliability flag applied
 *
 * System DOES:
 * - Notify host
 * - Mark job as unassigned
 *
 * System DOES NOT:
 * - Move the job
 * - Change booking dates
 * - Block cancellation
 */

import { base44 } from "@/api/base44Client";
import { notifyHostCleanerCancelled } from "@/services/cleaningJobNotifications";

/**
 * Cleaner cancels a cleaning job.
 *
 * @param {string|number} cleaningJobId
 * @param {string|number} cleanerId
 * @returns {{
 *   success: boolean,
 *   late: boolean,
 *   message: string
 * }}
 */
export async function cleanerCancelJob(cleaningJobId, cleanerId) {
  // 1. Fetch job
  const job = await base44.entities.CleaningJob.get(cleaningJobId);

  if (!job) {
    return {
      success: false,
      late: false,
      message: "Cleaning job not found.",
    };
  }

  // 2. Ensure cleaner is assigned
  if (String(job.cleaner_id) !== String(cleanerId)) {
    return {
      success: false,
      late: false,
      message: "You are not assigned to this job.",
    };
  }

  // 3. Determine if cancellation is <24 hours
  const now = new Date();
  const start = new Date(job.scheduled_start);
  const hoursUntilStart = (start - now) / (1000 * 60 * 60);

  const late = hoursUntilStart < 24;

  // 4. Mark job as unassigned
  await base44.entities.CleaningJob.update(job.id, {
    cleaner_id: null,
    status: "unassigned",
    cancelled_by_cleaner_at: new Date().toISOString(),
    cleaner_cancellation_late: late,
  });

  // 5. Notify host
  await notifyHostCleanerCancelled(job, late);

  return {
    success: true,
    late,
    message: late
      ? "Job cancelled. Host has been notified (late cancellation)."
      : "Job cancelled. Host has been notified.",
  };
}