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

// 4. Notify cleaner when host submits a move request
export async function notifyCleanerOfHostMoveRequest(request, job) {
  await base44.services.Notifications.send({
    to_cleaner_id: request.cleaner_id,
    type: "cleaning_job_move_requested_by_host",
    message: `The host has requested to move cleaning job ${job.id} to ${formatDate(
      request.requested_new_date
    )}.`,
    metadata: {
      cleaning_job_id: job.id,
      request_id: request.id,
    },
  });
}

// 5. Notify host when cleaner approves host's move request
export async function notifyHostMoveApprovedByCleaner(request, job) {
  await base44.services.Notifications.send({
    to_host_id: request.host_id,
    type: "cleaning_job_move_approved_by_cleaner",
    message: `The cleaner has accepted your request to move cleaning job ${job.id}.`,
    metadata: {
      cleaning_job_id: job.id,
      request_id: request.id,
    },
  });
}

// 6. Notify host when cleaner denies host's move request
export async function notifyHostMoveDeniedByCleaner(request, job) {
  await base44.services.Notifications.send({
    to_host_id: request.host_id,
    type: "cleaning_job_move_denied_by_cleaner",
    message: `The cleaner has declined your request to move cleaning job ${job.id}.`,
    metadata: {
      cleaning_job_id: job.id,
      request_id: request.id,
    },
  });
}

/* ---------------------------------------------------------
   NEW NOTIFICATIONS (Missing from your file)
--------------------------------------------------------- */

// 7. Notify host when cleaner cancels a job
export async function notifyHostCleanerCancelled(job, late) {
  await base44.services.Notifications.send({
    to_host_id: job.host_id,
    type: "cleaning_job_cancelled_by_cleaner",
    message: late
      ? `Cleaner cancelled job ${job.id} less than 24 hours before start.`
      : `Cleaner cancelled job ${job.id}.`,
    metadata: {
      cleaning_job_id: job.id,
      late_cancellation: late,
    },
  });
}

// 8. Notify cleaner when host cancels a job
export async function notifyCleanerHostCancelled(job) {
  await base44.services.Notifications.send({
    to_cleaner_id: job.cleaner_id,
    type: "cleaning_job_cancelled_by_host",
    message: `The host has cancelled cleaning job ${job.id}.`,
    metadata: {
      cleaning_job_id: job.id,
    },
  });
}

/* ---------------------------------------------------------
   Helper
--------------------------------------------------------- */

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}