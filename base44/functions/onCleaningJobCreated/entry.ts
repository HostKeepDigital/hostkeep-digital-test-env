/**
 * Automation handler: fires when a CleaningJob is created or its status changes.
 * Notifies the cleaner of new jobs and the host of status updates.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;
    const payload = await req.json();

    const { event, data } = payload;
    if (!data) return Response.json({ ok: true });

    const job = data;
    const eventType = event?.type;

    const notify = async (user_id, type, title, body, link) => {
      await serviceRole.functions.invoke("sendNotification", {
        user_id, type, title, body, link,
      });
    };

    if (eventType === "create") {
      // Auto-select rate from cleaner's rate card based on property bedroom count
      if (job.cleaner_id && job.property_id) {
        try {
          const [cleanerRecords, propertyRecords] = await Promise.all([
            serviceRole.entities.Cleaner.filter({ id: job.cleaner_id }),
            serviceRole.entities.Property.filter({ id: job.property_id }),
          ]);
          const cleaner = cleanerRecords?.[0];
          const property = propertyRecords?.[0];

          if (cleaner && property) {
            const bedrooms = property.bedrooms ?? 0;
            const rc = cleaner.rate_card || {};
            let tierPrice = 0;
            if (bedrooms <= 1)      tierPrice = rc.studio_1bed   || 0;
            else if (bedrooms === 2) tierPrice = rc.two_bed       || 0;
            else if (bedrooms === 3) tierPrice = rc.three_bed     || 0;
            else                     tierPrice = rc.four_bed_plus || 0;

            const resolvedPrice = tierPrice > 0 ? tierPrice : (cleaner.base_price || 0);
            if (resolvedPrice > 0) {
              await serviceRole.entities.CleaningJob.update(job.id, { cleaner_price: resolvedPrice });
            }
          }
        } catch (e) {
          console.error("Rate card lookup failed:", e);
        }
      }
    }

    if (eventType === "create" && job.cleaner_user_id) {
      await notify(
        job.cleaner_user_id,
        "cleaning_job_assigned",
        "New Cleaning Job",
        `You have a new cleaning job on ${job.scheduled_date}${job.scheduled_time ? " at " + job.scheduled_time : ""}. Please accept or decline.`,
        "/CleanerDashboard"
      );
    }

    if (eventType === "update" && job.host_id) {
      const changed = payload.changed_fields || [];
      if (changed.includes("status")) {
        if (job.status === "accepted") {
          await notify(
            job.host_id,
            "cleaning_job_accepted",
            "Cleaner Accepted the Job",
            `Your cleaning job for ${job.scheduled_date} has been accepted.`,
            "/HostBookings"
          );
        }
        if (job.status === "declined") {
          await notify(
            job.host_id,
            "cleaning_job_declined",
            "Cleaner Declined the Job",
            `Your cleaner has declined the job for ${job.scheduled_date}. You may need to assign another cleaner.`,
            "/HostBookings"
          );
        }
        if (job.status === "completed" && job.cleaner_user_id) {
          await notify(
            job.host_id,
            "cleaning_job_completed",
            "Cleaning Job Completed",
            `The cleaning job for ${job.scheduled_date} has been marked as complete.`,
            "/HostBookings"
          );
        }
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("onCleaningJobCreated error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});