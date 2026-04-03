import React, { useState } from "react";
import { cleanerCancelJob } from "@/actions/cleanerCancelJob";

export default function CleanerCancelJobButton({ cleaningJobId, cleanerId }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [confirming, setConfirming] = useState(false);

  async function handleCancel() {
    setLoading(true);
    setResult(null);

    const response = await cleanerCancelJob(cleaningJobId, cleanerId);

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
          Cancel Job
        </button>
      ) : (
        <div className="p-3 border rounded bg-gray-50">
          <p className="text-sm mb-2">
            Are you sure you want to cancel this job?
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
            result.late
              ? "bg-yellow-100 text-yellow-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}