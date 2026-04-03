import { base44 } from "@/api/base44Client";

/**
 * Start a cleaning job
 */
export async function startCleaningJob(jobId) {
  return base44.entities.CleaningJob.update(jobId, {
    status: "in_progress",
    started_at: new Date().toISOString(),
  });
}

/**
 * Complete a cleaning job
 */
export async function completeCleaningJob(jobId) {
  return base44.entities.CleaningJob.update(jobId, {
    status: "completed",
    completed_at: new Date().toISOString(),
  });
}

/**
 * Cleaner reports a delay (prevents strike)
 */
export async function reportCleaningDelay(jobId) {
  return base44.entities.CleaningJob.update(jobId, {
    delay_reported: true,
  });
}

/**
 * Cleaner proposes a new time window
 */
export async function proposeNewCleaningTime(jobId, newStart, newEnd) {
  return base44.entities.CleaningJob.update(jobId, {
    proposed_start: newStart,
    proposed_end: newEnd,
  });
}

/**
 * Host approves the proposed time window
 */
export async function approveProposedCleaningTime(jobId) {
  const job = await base44.entities.CleaningJob.get(jobId);

  if (!job.proposed_start || !job.proposed_end) {
    throw new Error("No proposed time to approve");
  }

  return base44.entities.CleaningJob.update(jobId, {
    scheduled_start: job.proposed_start,
    scheduled_end: job.proposed_end,
    proposed_start: null,
    proposed_end: null,
    alert_15_sent: false,
    alert_30_sent: false,
  });
}