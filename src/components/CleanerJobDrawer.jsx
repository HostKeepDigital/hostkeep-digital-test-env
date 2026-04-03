import React from "react";
import { format } from "date-fns";
import CleanerMoveRequestButton from "@/components/CleanerMoveRequestButton";
import CleanerCancelJobButton from "@/components/CleanerCancelJobButton";

/**
 * CleanerJobDrawer
 *
 * A focused drawer for cleaners viewing a single cleaning job.
 *
 * Props:
 * - job: {
 *     id,
 *     property_name,
 *     property_id,
 *     scheduled_start,
 *     scheduled_end,
 *     cleaner_id,
 *     notes,
 *     status
 *   }
 * - cleanerId: current logged-in cleaner ID
 * - onClose: function to close the drawer
 */
export default function CleanerJobDrawer({ job, cleanerId, onClose }) {
  if (!job) return null;

  const start = new Date(job.scheduled_start);
  const end = new Date(job.scheduled_end);

  const isAssignedToCleaner =
    String(job.cleaner_id) === String(cleanerId);

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-50">
      <div className="w-full max-w-md bg-white h-full shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="text-lg font-semibold">
              Cleaning Job #{job.id}
            </h2>
            <p className="text-sm text-gray-600">
              {job.property_name || `Property ${job.property_id}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Schedule */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">
              Schedule
            </h3>
            <p className="text-sm text-gray-800">
              <strong>Date:</strong>{" "}
              {format(start, "dd MMM yyyy")}
            </p>
            <p className="text-sm text-gray-800">
              <strong>Time:</strong>{" "}
              {format(start, "HH:mm")} – {format(end, "HH:mm")}
            </p>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">
              Status
            </h3>
            <p className="text-sm text-gray-800 capitalize">
              {job.status || "scheduled"}
            </p>
          </div>

          {/* Notes */}
          {job.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">
                Notes
              </h3>
              <p className="text-sm text-gray-800 whitespace-pre-line">
                {job.notes}
              </p>
            </div>
          )}

          {/* Actions (only if assigned to this cleaner) */}
          {isAssignedToCleaner && (
            <div className="pt-2 border-t space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Actions
              </h3>

              {/* Request Move (cleaner-initiated) */}
              <CleanerMoveRequestButton
                cleaningJobId={job.id}
                cleanerId={cleanerId}
              />

              {/* Cancel Job (cleaner cancellation) */}
              <CleanerCancelJobButton
                cleaningJobId={job.id}
                cleanerId={cleanerId}
              />
            </div>
          )}

          {!isAssignedToCleaner && (
            <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-sm rounded">
              You are not assigned to this job.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}