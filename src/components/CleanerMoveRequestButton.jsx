import React, { useState } from "react";
import { cleanerRequestMove } from "@/actions/cleanerRequestMove";

export default function CleanerMoveRequestButton({ cleaningJobId, cleanerId }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleRequest() {
    setLoading(true);
    setResult(null);

    const response = await cleanerRequestMove(cleaningJobId, cleanerId);

    setResult(response);
    setLoading(false);

    // Auto-clear after a few seconds
    setTimeout(() => setResult(null), 4000);
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleRequest}
        disabled={loading}
        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Request to Move Job"}
      </button>

      {result && (
        <div
          className={`mt-2 p-2 rounded text-sm ${
            result.allowed
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {result.allowed
            ? "Your request has been submitted to the host."
            : result.reason}
        </div>
      )}
    </div>
  );
}