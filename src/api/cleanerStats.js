import { base44 } from "@/api/base44Client";

/**
 * Fetch all cleaning jobs for a cleaner and compute reliability metrics.
 */
export async function getCleanerStats(cleanerId) {
  const jobs = await base44.entities.CleaningJob.filter({
    cleaner_id: cleanerId,
  });

  if (!jobs || jobs.length === 0) {
    return {
      totalJobs: 0,
      completedJobs: 0,
      onTimeStarts: 0,
      lateStarts: 0,
      delaysReported: 0,
      strikes: 0,
      reliabilityScore: 100,
      averageLatenessMinutes: 0,
    };
  }

  let completedJobs = 0;
  let onTimeStarts = 0;
  let lateStarts = 0;
  let delaysReported = 0;
  let totalLatenessMinutes = 0;

  for (const job of jobs) {
    const scheduled = new Date(job.scheduled_start);
    const started = job.started_at ? new Date(job.started_at) : null;

    if (job.status === "completed") {
      completedJobs++;
    }

    if (job.delay_reported) {
      delaysReported++;
    }

    if (started) {
      const diffMinutes = (started - scheduled) / (1000 * 60);

      if (diffMinutes <= 5) {
        onTimeStarts++;
      } else {
        lateStarts++;
        totalLatenessMinutes += diffMinutes;
      }
    }
  }

  const totalJobs = jobs.length;
  const strikes = jobs.reduce((sum, j) => sum + (j.strikes || 0), 0);

  const reliabilityScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        lateStarts * 3 -
        strikes * 10 -
        delaysReported * 1 +
        onTimeStarts * 1.5
    )
  );

  const averageLatenessMinutes =
    lateStarts > 0 ? totalLatenessMinutes / lateStarts : 0;

  return {
    totalJobs,
    completedJobs,
    onTimeStarts,
    lateStarts,
    delaysReported,
    strikes,
    reliabilityScore: Math.round(reliabilityScore),
    averageLatenessMinutes: Math.round(averageLatenessMinutes),
  };
}