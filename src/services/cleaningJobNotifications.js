import { base44 } from "@/api/base44Client";

async function notify(user_id, type, title, body, link = null) {
  try {
    await base44.functions.invoke("sendNotification", { user_id, type, title, body, link });
  } catch (err) {
    console.error(`[cleaningJobNotifications] Failed to send ${type} to ${user_id}:`, err);
  }
}

// 1. Notify host when cleaner submits a move request
export async function notifyHostOfMoveRequest(request, job) {
  await notify(
    job.host_id,
    "cleaning_job_move_requested",
    "Move request received",
    `Your cleaner has requested to reschedule cleaning job to ${formatDate(request.requested_new_date)}.`,
    "/HostBookings"
  );
}

// 2. Notify cleaner when host approves their move request
export async function notifyCleanerMoveApproved(request, job) {
  await notify(
    request.cleaner_id,
    "cleaning_job_move_approved",
    "Move request approved",
    `Your request to reschedule cleaning job has been approved.`,
    "/CleanerDashboard"
  );
}

// 3. Notify cleaner when host denies their move request
export async function notifyCleanerMoveDenied(request, job) {
  await notify(
    request.cleaner_id,
    "cleaning_job_move_denied",
    "Move request declined",
    `Your request to reschedule cleaning job was declined by the host.`,
    "/CleanerDashboard"
  );
}

// 4. Notify cleaner when host submits a move request
export async function notifyCleanerOfHostMoveRequest(request, job) {
  await notify(
    request.cleaner_id,
    "cleaning_job_move_requested_by_host",
    "Reschedule requested",
    `The host has requested to reschedule your cleaning job to ${formatDate(request.requested_new_date)}.`,
    "/CleanerDashboard"
  );
}

// 5. Notify host when cleaner approves host's move request
export async function notifyHostMoveApprovedByCleaner(request, job) {
  await notify(
    job.host_id,
    "cleaning_job_move_approved_by_cleaner",
    "Reschedule accepted",
    `Your cleaner has accepted the reschedule request for the cleaning job.`,
    "/HostBookings"
  );
}

// 6. Notify host when cleaner denies host's move request
export async function notifyHostMoveDeniedByCleaner(request, job) {
  await notify(
    job.host_id,
    "cleaning_job_move_denied_by_cleaner",
    "Reschedule declined",
    `Your cleaner has declined the reschedule request for the cleaning job.`,
    "/HostBookings"
  );
}

// 7. Notify host when cleaner cancels a job
export async function notifyHostCleanerCancelled(job, late) {
  await notify(
    job.host_id,
    "cleaning_job_cancelled_by_cleaner",
    late ? "Late cancellation — cleaner cancelled" : "Cleaner cancelled job",
    late
      ? `Your cleaner cancelled less than 24 hours before the scheduled start.`
      : `Your cleaner has cancelled the cleaning job.`,
    "/HostBookings"
  );
}

// 8. Notify cleaner when host cancels a job
export async function notifyCleanerHostCancelled(job) {
  await notify(
    job.cleaner_id,
    "cleaning_job_cancelled_by_host",
    "Job cancelled by host",
    `The host has cancelled your cleaning job.`,
    "/CleanerDashboard"
  );
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}