import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw, AlertTriangle } from "lucide-react";

export function ChannelOverviewCard({ property, listings }) {
  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">{property.title}</h3>
          <p className="text-xs text-gray-500">
            {listings.length} channel{listings.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Link
          to={`/admin/channels?propertyId=${property.id}`}
          className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
        >
          Manage <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {listings.length === 0 && (
        <p className="text-xs text-gray-500 italic">
          No channels connected yet.
        </p>
      )}

      {listings.map((l) => (
        <div
          key={l.id}
          className="border rounded-lg p-3 bg-gray-50 flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-medium">{l.channel_name}</p>
            <p className="text-xs text-gray-500">
              {l.ical_import_url ? "Import enabled" : "No import URL"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {l.conflict_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="w-3 h-3" />
                {l.conflict_count}
              </span>
            )}

            <Link
              to={`/admin/channels?propertyId=${property.id}`}
              className="text-xs text-teal-600 hover:text-teal-700"
            >
              <RefreshCw className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}