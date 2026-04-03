// src/components/CalendarEventDrawer.jsx

import React, { useState } from "react";
import {
  startCleaningJob,
  completeCleaningJob,
  reportCleaningDelay,
  proposeNewCleaningTime,
  approveProposedCleaningTime,
} from "@/api/cleaningJobs";

import { useQueryClient } from "@tanstack/react-query";

export default function CalendarEventDrawer({ event, onClose }) {
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const {
    type,
    guest_name,
    cleaner_name,
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

  const id = event.id;

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

  async function handleStartJob() {
    setLoading(true);
    await startCleaningJob(id);
    await refresh();
  }

  async function handleCompleteJob() {
    setLoading(true);
    await completeCleaningJob(id);
    await refresh();
  }

  async function handleReportDelay() {
    setLoading(true);
    await reportCleaningDelay(id);
    await refresh();
  }

  async function handleProposeTime() {
    if (!newStart || !newEnd) return;

    setLoading(true);
    await proposeNewCleaningTime(id, newStart, newEnd);
    await refresh();
  }

  async function handleApproveTime() {
    setLoading(true);
    await approveProposedCleaningTime(id);
    await refresh();
  }

  async function refresh() {
    await queryClient.invalidateQueries();
    setLoading(false);
    onClose();
  }

  return (
    <div className="drawer-overlay">
      <div className="drawer">
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

        <div className="drawer-section">
          <h3>Time Window</h3>
          <p>
            {start.toDateString()} — {startTime} → {endTime}
          </p>
        </div>

        {type === "booking" && (
          <div className="drawer-section">
            <h3>Booking Details</h3>
            <p>Guest: {guest_name}</p>
            <p>Source: {event.source}</p>
          </div>
        )}

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

            {proposed_start && proposed_end && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
                <p className="font-medium text-amber-700">
                  Cleaner proposed new time:
                </p>
                <p className="text-sm text-amber-700">
                  {new Date(proposed_start).toLocaleString()} →{" "}
                  {new Date(proposed_end).toLocaleString()}
                </p>

                <button
                  className="drawer-btn-primary mt-2"
                  disabled={loading}
                  onClick={handleApproveTime}
                >
                  Approve New Time
                </button>
              </div>
            )}
          </div>
        )}

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