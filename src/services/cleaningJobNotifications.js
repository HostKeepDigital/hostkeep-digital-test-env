/**
 * Centralised notification service for cleaning job move requests.
 *
 * This file ensures:
 * - Cleaner and host notifications are consistent
 * - All messages are in one place
 * - No duplication across actions
 */

import { base44 } from "@/api/base44Client";

// 1. Notify host when cleaner submits a move request
export async function notifyHostOfMoveRequest(request, job) {
  await base44.services.Notifications.send({
    to_host_id: job.host_id,
    type: "cleaning_job_move_requested",
    message: `Cleaner ${request.cleaner_id} has requested to move cleaning job ${job.id} to ${formatDate(
      request.requested_new_date
    )}.`,
    metadata: {
      cleaning_job_id: job.id,
      request_id: request.id,
    },
  });
}

// 2. Notify cleaner when host approves
export async function notifyCleanerMoveApproved(request, job) {
  await base44.services.Notifications.send({
    to_cleaner_id: request.cleaner_id,
    type: "cleaning_job_move_approved",
    message: `Your request to move cleaning job ${job.id} has been approved.`,
    metadata: {
      cleaning_job_id: job.id,
      request_id: request.id,
    },
  });
}

// 3. Notify cleaner when host denies
export async function notifyCleanerMoveDenied(request, job) {
  await base44.services.Notifications.send({
    to_cleaner_id: request.cleaner_id,
    type: "cleaning_job_move_denied",
    message: `Your request to move cleaning job ${job.id} was denied by the host.`,
    metadata: {
      cleaning_job_id: job.id,
      request_id: request.id,
    },
  });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}