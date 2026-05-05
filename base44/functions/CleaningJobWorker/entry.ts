import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const LOCK = Deno.env.get("LOCK_ACCESS_TOKEN");
    if (LOCK && body?.lock_token !== LOCK) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    const now = new Date();
    const updates = [];

    // Fetch cleaning jobs that need time-based processing
    const jobs = await base44.entities.CleaningJob.filter({
      status: "accepted",
    });

    for (const job of jobs) {
      const startTime = new Date(job.scheduled_date + "T" + (job.scheduled_time || "09:00"));

      // 0. Handle proposed time changes
      if (job.proposed_start && job.proposed_end) {
        await base44.entities.CleaningJob.update(job.id, {
          scheduled_date: job.proposed_start.split("T")[0],
          scheduled_time: job.proposed_start.split("T")[1],
          proposed_start: null,
          proposed_end: null,
          alert_15_sent: false,
          alert_30_sent: false,
        });

        updates.push(
          `Job ${job.id}: applied proposed time ${job.proposed_start}`
        );
        continue;
      }

      // 1. 15-minute alert (Delayed – Awaiting Start)
      const fifteenMinutesAfterStart = new Date(startTime.getTime() + 15 * 60 * 1000);
      if (
        now >= fifteenMinutesAfterStart &&
        job.status === "accepted" &&
        !job.alert_15_sent
      ) {
        await base44.entities.CleaningJob.update(job.id, {
          alert_15_sent: true,
        });

        updates.push(`Job ${job.id}: 15-min alert flagged`);
      }

      // 2. 30-minute escalation (Delayed – 30 mins late)
      const thirtyMinutesAfterStart = new Date(startTime.getTime() + 30 * 60 * 1000);
      if (
        now >= thirtyMinutesAfterStart &&
        job.status === "accepted" &&
        !job.alert_30_sent
      ) {
        // Strike logic — only if cleaner did NOT report delay
        if (!job.delay_reported) {
          const cleaner = await base44.entities.Cleaner.get(job.cleaner_id);
          const currentStrikes = cleaner.strikes || 0;

          await base44.entities.Cleaner.update(job.cleaner_id, {
            strikes: currentStrikes + 1,
          });

          updates.push(
            `Job ${job.id}: cleaner ${job.cleaner_id} strike incremented to ${currentStrikes + 1}`
          );
        }

        await base44.entities.CleaningJob.update(job.id, {
          alert_30_sent: true,
        });

        updates.push(`Job ${job.id}: 30-min escalation processed`);
      }
    }

    return Response.json({
      ok: true,
      processed: jobs.length,
      updates,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});