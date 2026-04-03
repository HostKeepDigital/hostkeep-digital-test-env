import { useState } from "react";
import {
  resolveConflict,
  deleteChannelBooking
} from "@/utils/api/channelManager";

export function ConflictResolver({ conflicts, reload }) {
  const [loadingId, setLoadingId] = useState(null);

  const handleResolve = async (id) => {
    setLoadingId(id);
    await resolveConflict(id);
    await reload();
    setLoadingId(null);
  };

  const handleDelete = async (id) => {
    setLoadingId(id);
    await deleteChannelBooking(id);
    await reload();
    setLoadingId(null);
  };

  return (
    <div className="space-y-4">
      {conflicts.map((c) => (
        <div
          key={c.id}
          className="border rounded-lg p-4 bg-red-50 border-red-200"
        >
          <p className="font-semibold text-red-700">
            {c.guest_name || "External Booking"}
          </p>

          <p className="text-xs text-gray-600">
            {c.start_date} → {c.end_date}
          </p>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleResolve(c.id)}
              disabled={loadingId === c.id}
              className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loadingId === c.id ? "Resolving…" : "Resolve"}
            </button>

            <button
              onClick={() => handleDelete(c.id)}
              disabled={loadingId === c.id}
              className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loadingId === c.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}