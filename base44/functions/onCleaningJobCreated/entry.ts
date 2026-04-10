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