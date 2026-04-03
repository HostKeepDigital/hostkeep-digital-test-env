import React, { useState } from "react";
import { hostCancelJob } from "@/actions/hostCancelJob";

export default function HostCancelJobButton({ cleaningJobId, hostId }) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);

  async function handleCancel() {
    setLoading(true);
    setResult(null);

    const response = await hostCancelJob(cleaningJobId, hostId);

    setResult(response);
    setLoading(false);

    setTimeout(() => setResult(null), 4000);
  }

  return (
    <div className="mt-4">
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Cancel Cleaning Job
        </button>
      ) : (
        <div className="p-3 border rounded bg-gray-50">
          <p className="text-sm mb-2">
            Are you sure you want to cancel this cleaning job?
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Cancelling..." : "Yes, Cancel Job"}
            </button>

            <button
              onClick={() => setConfirming(false)}
              className="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              No
            </button>
          </div>
        </div>
      )}

      {result && (
        <div
          className={`mt-2 p-2 rounded text-sm ${
            result.success
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}