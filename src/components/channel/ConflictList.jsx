import { format, parseISO } from "date-fns";

export function ConflictList({ conflicts, onResolve, onDelete }) {
  if (!conflicts.length) {
    return (
      <p className="text-sm text-gray-500">
        No conflicts detected across your properties.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {conflicts.map((c) => (
        <div
          key={c.id}
          className="border rounded-lg p-4 bg-red-50 border-red-200"
        >
          <p className="font-semibold text-red-700">
            Conflict: {c.guest_name || "External Booking"}
          </p>

          <p className="text-sm text-gray-700">
            {format(parseISO(c.start_date), "d MMM")} –{" "}
            {format(parseISO(c.end_date), "d MMM")}
          </p>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onResolve(c.id)}
              className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
            >
              Mark Resolved
            </button>

            <button
              onClick={() => onDelete(c.id)}
              className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
            >
              Delete Booking
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}