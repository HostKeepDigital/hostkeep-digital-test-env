// src/components/HostRequestMoveButton.jsx

import React, { useState } from "react";
import { hostRequestMove } from "@/actions/hostRequestMove";

export default function HostRequestMoveButton({ cleaningJobId, hostId }) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function submitRequest() {
    if (!selectedDate) {
      setResult({ allowed: false, reason: "Please select a date." });
      return;
    }

    setLoading(true);
    setResult(null);

    const response = await hostRequestMove(cleaningJobId, hostId, selectedDate);

    setResult(response);
    setLoading(false);

    // Auto-clear message after a few seconds
    setTimeout(() => setResult(null), 4000);
  }

  return (
    <div className="mt-4">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Request New Date
      </button>

      {/* Date picker panel */}
      {open && (
        <div className="mt-3 p-3 border rounded bg-gray-50">
          <label className="block text-sm font-medium mb-1">
            Select New Cleaning Date
          </label>

          <input
            type="date"
            className="border rounded px-2 py-1 w-full"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />

          <button
            onClick={submitRequest}
            disabled={loading}
            className="mt-3 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Request"}
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
                ? "Request submitted to cleaner."
                : result.reason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}