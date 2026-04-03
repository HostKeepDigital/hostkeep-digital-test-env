import React, { useState } from "react";
import {
  startCleaningJob,
  completeCleaningJob,
  reportCleaningDelay,
  proposeNewCleaningTime,
  approveProposedCleaningTime,
} from "@/api/cleaningJobs";

import { getCleanerStats } from "@/api/cleanerStats";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";

export default function CalendarEventDrawer({ event, onClose }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const {
    type,
    guest_name,
    cleaner_name,
    cleaner_id,
    company_name,
    scheduled_start,
    scheduled_end,
    status,
    started_at,
    completed_at,
    delay_reported,
    proposed_start,
    proposed_end,
  } = event;

  const jobId = event.id;
  const isCleaner = user?.role === "cleaner";
  const isHost = user?.role === "host";

  //
  // Fetch cleaner reliability stats
  //
  const { data: stats } = useQuery({
    queryKey: ["cleaner-stats", cleaner_id],
    queryFn: () => getCleanerStats(cleaner_id),
    enabled: type === "cleaning" && !!cleaner_id,
  });

  //
  // ACTION HANDLERS
  //
  async function handleStartJob() {
    setLoading(true);
    await startCleaningJob(jobId);
    await refresh();
  }

  async function handleCompleteJob() {
    setLoading(true);
    await completeCleaningJob(jobId);
    await refresh();
  }

  async function handleReportDelay() {
    setLoading(true);
    await reportCleaningDelay(jobId);
    await refresh();
  }

  async function handleProposeTime() {
    if (!newStart || !newEnd) return;

    setLoading(true);
    await proposeNewCleaningTime(jobId, newStart, newEnd);
    await refresh();
  }

  async function handleApproveTime() {
    setLoading(true);
    await approveProposedCleaningTime(jobId);
    await refresh();
  }

  async function refresh() {
    await queryClient.invalidateQueries();
    setLoading(false);
    onClose();
  }

  //
  // Reliability badge colour
  //
  function reliabilityColor(score) {
    if (score >= 90) return "#16a34a"; // green
    if (score >= 70) return "#f59e0b"; // amber
    return "#dc2626"; // red
  }

  const start = new Date(scheduled_start);
  const end = new Date(scheduled_end);

  const startTime = start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const endTime = end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="drawer-overlay">
      <div className="drawer">
        {/* Header */}
        <div className="drawer-header">
          <h2>
            {type === "booking" && guest_name}
            {type === "cleaning" && (cleaner_name || company_name)}
            {type === "blocked" && "Blocked Date"}
            {type === "conflict" && "Calendar Conflict"}
          </h2>

          <button className="drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Time Window */}
        <div className="drawer-section">
          <h3>Time Window</h3>
          <p>
            {start.toDateString()} — {startTime} → {endTime}
          </p>
        </div>

        {/* Booking Details */}
        {type === "booking" && (
          <div className="drawer-section">
            <h3>Booking Details</h3>
            <p>Guest: {guest_name}</p>
            <p>Source: {event.source}</p>
          </div>
        )}

        {/* Cleaning Job Details */}
        {type === "cleaning" && (
          <div className="drawer-section">
            <h3>Cleaning Job</h3>
            <p>Status: {statusLabel(status)}</p>

            {started_at && (
              <p>
                Started:{" "}
                {new Date(started_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            {completed_at && (
              <p>
                Completed:{" "}
                {new Date(completed_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            {delay_reported && <p>Delay reported by cleaner</p>}
          </div>
        )}

        {/* Reliability Section */}
        {type === "cleaning" && stats && (
          <div className="drawer-section">
            <h3>Cleaner Reliability</h3>

            <div className="flex items-center gap-3 mb-2">
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: reliabilityColor(stats.reliabilityScore),
                }}
              />

              <p className="font-medium">
                {stats.reliabilityScore}% reliability
              </p>
            </div>

            {/* Host sees full detail */}
            {isHost && (
              <div className="text-sm text-gray-700 space-y-1">
                <p>Completed jobs: {stats.completedJobs}/{stats.totalJobs}</p>
                <p>On-time starts: {stats.onTimeStarts}</p>
                <p>Late starts: {stats.lateStarts}</p>
                <p>Delays reported: {stats.delaysReported}</p>
                <p>Strikes: {stats.strikes}</p>

                {stats.averageLatenessMinutes > 0 && (
                  <p>
                    Avg lateness: {stats.averageLatenessMinutes} min
                  </p>
                )}
              </div>
            )}

            {/* Cleaner sees simplified version */}
            {isCleaner && (
              <div className="text-sm text-gray-700 space-y-1">
                <p>On-time starts: {stats.onTimeStarts}</p>
                <p>Delays reported: {stats.delaysReported}</p>

                <p className="text-teal-600 font-medium mt-2">
                  {stats.reliabilityScore >= 90 &&
                    "Excellent work — keep it up!"}
                  {stats.reliabilityScore >= 70 &&
                    "You're doing well — stay consistent."}
                  {stats.reliabilityScore < 70 &&
                    "Try to improve your punctuality."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {type === "cleaning" && (
          <div className="drawer-section drawer-actions">
            {(status === "assigned" || status === "awaiting_start") && (
              <button
                className="drawer-btn-primary"
                disabled={loading}
                onClick={handleStartJob}
              >
                Start Job
              </button>
            )}

            {status === "in_progress" && (
              <button
                className="drawer-btn-primary"
                disabled={loading}
                onClick={handleCompleteJob}
              >
                Complete Job
              </button>
            )}

            {!delay_reported &&
              (status === "assigned" || status === "awaiting_start") && (
                <button
                  className="drawer-btn-secondary"
                  disabled={loading}
                  onClick={handleReportDelay}
                >
                  Report Delay
                </button>
              )}

            <button
              className="drawer-btn-secondary"
              disabled={loading}
              onClick={() => setShowReschedule(true)}
            >
              Reschedule Clean
            </button>
          </div>
        )}

        {/* Reschedule Modal */}
        {showReschedule && (
          <div className="drawer-section mt-4">
            <h3>Propose New Time</h3>

            <input
              type="datetime-local"
              className="drawer-input"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
            />

            <input
              type="datetime-local"
              className="drawer-input mt-2"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
            />

            <button
              className="drawer-btn-primary mt-3"
              disabled={loading}
              onClick={handleProposeTime}
            >
              Submit Proposal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

//
// Status label mapping
//
function statusLabel(status) {
  switch (status) {
    case "assigned":
      return "Scheduled";
    case "awaiting_start":
      return "Awaiting Start";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    default:
      return status;
  }
}