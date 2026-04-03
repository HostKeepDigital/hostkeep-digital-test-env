import { base44 } from "@/api/base44Client";

/**
 * hostCancelJob
 *
 * Allows a host to cancel a cleaning job assignment.
 *
 * @param {string} cleaningJobId - ID of the cleaning job to cancel
 * @param {string} hostId - ID of the host making the request
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function hostCancelJob(cleaningJobId, hostId) {
  try {
    // Fetch the cleaning job
    const job = await base44.entities.CleaningJob.filter(
      { id: cleaningJobId }
    );

    if (!job || job.length === 0) {
      return {
        success: false,
        message: "Cleaning job not found.",
      };
    }

    const cleaningJob = job[0];

    // Verify host owns the property
    if (cleaningJob.host_id !== hostId) {
      return {
        success: false,
        message: "You are not authorized to cancel this job.",
      };
    }

    // Update the job status to cancelled
    await base44.entities.CleaningJob.update(cleaningJobId, {
      status: "cancelled",
    });

    // Notify the cleaner (if assigned)
    if (cleaningJob.cleaner_id) {
      try {
        await base44.integrations.Core.SendEmail({
          to: cleaningJob.cleaner_id, // Assuming this is an email or will be resolved
          subject: "Cleaning Job Cancelled",
          body: `The host has cancelled the cleaning job scheduled for ${cleaningJob.scheduled_date}.`,
        });
      } catch (notifyError) {
        console.error("Failed to notify cleaner:", notifyError);
        // Don't fail the cancellation if notification fails
      }
    }

    return {
      success: true,
      message: "Cleaning job cancelled successfully.",
    };
  } catch (error) {
    console.error("Error cancelling cleaning job:", error);
    return {
      success: false,
      message: error.message || "Failed to cancel cleaning job.",
    };
  }
}