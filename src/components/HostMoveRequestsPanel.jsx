import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { hostReviewMoveRequest } from "@/actions/hostReviewMoveRequest";
import { format } from "date-fns";

export default function HostMoveRequestsPanel({ propertyId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState(null);

  async function loadRequests() {
    setLoading(true);

    const pending = await base44.entities.CleaningJobMoveRequest.filter({
      property_id: propertyId,
      status: "pending",
    });

    setRequests(pending);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, [propertyId]);

  async function handleDecision(requestId, decision) {
    setProcessingId(requestId);

    const result = await hostReviewMoveRequest(requestId, decision);

    setMessage(result.message);

    await loadRequests();

    setProcessingId(null);

    // Clear message after a few seconds
    setTimeout(() => setMessage(null), 3000);
  }

  if (loading) {
    return <div>Loading move requests…</div>;
  }

  if (requests.length === 0) {
    return <div>No pending move requests.</div>;
  }

  return (
    <div className="border rounded p-4 bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Pending Cleaning Job Move Requests</h2>

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
              Cleaner Request #{req.id}
            </div>

            <div className="text-sm text-gray-700">
              <strong>Requested New Date:</strong>{" "}
              {format(new Date(req.requested_new_date), "dd MMM yyyy")}
            </div>

            <div className="text-sm text-gray-700">
              <strong>Cleaning Job:</strong> {req.cleaning_job_id}
            </div>

            <div className="text-sm text-gray-700">
              <strong>Cleaner:</strong> {req.cleaner_id}
            </div>

            <div className="flex gap-2 mt-2">
              <button
                disabled={processingId === req.id}
                onClick={() => handleDecision(req.id, "approved")}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>

              <button
                disabled={processingId === req.id}
                onClick={() => handleDecision(req.id, "denied")}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Deny
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}