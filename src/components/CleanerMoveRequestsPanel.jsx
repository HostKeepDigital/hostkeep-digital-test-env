// src/components/CleanerMoveRequestsPanel.jsx

import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { cleanerReviewHostMoveRequest } from "@/actions/cleanerReviewHostMoveRequest";
import { format } from "date-fns";

export default function CleanerMoveRequestsPanel({ cleanerId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState(null);

  async function loadRequests() {
    setLoading(true);

    const pending = await base44.entities.CleaningJobMoveRequest.filter({
      cleaner_id: cleanerId,
      requested_by: "host",
      status: "pending",
    });

    setRequests(pending);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, [cleanerId]);

  async function handleDecision(requestId, decision) {
    setProcessingId(requestId);

    const result = await cleanerReviewHostMoveRequest(
      requestId,
      decision,
      cleanerId
    );

    setMessage(result.message);

    await loadRequests();

    setProcessingId(null);

    setTimeout(() => setMessage(null), 3000);
  }

  if (loading) {
    return <div>Loading move requests…</div>;
  }

  if (requests.length === 0) {
    return <div>No pending requests from hosts.</div>;
  }

  return (
    <div className="border rounded p-4 bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Host Move Requests</h2>

      {message && (
        <div className="mb-3 p-2 bg-blue-100 text-blue-800 rounded">
          {message}
        </div>
      )}

      <div className="space-y-4">
        {requests.map((req) => (
          <div
            key={req.id}
            className="border p-3 rounded bg-gray-50 flex flex-col gap-2"
          >
            <div className="font-medium">
              Host Request #{req.id}
            </div>

            <div className="text-sm text-gray-700">
              <strong>Requested New Date:</strong>{" "}
              {format(new Date(req.requested_new_date), "dd MMM yyyy")}
            </div>

            <div className="text-sm text-gray-700">
              <strong>Cleaning Job:</strong> {req.cleaning_job_id}
            </div>

            <div className="flex gap-2 mt-2">
              <button
                disabled={processingId === req.id}
                onClick={() => handleDecision(req.id, "approved")}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Accept
              </button>

              <button
                disabled={processingId === req.id}
                onClick={() => handleDecision(req.id, "denied")}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}