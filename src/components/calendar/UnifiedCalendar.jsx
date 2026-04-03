import React from "react";

export default function UnifiedCalendar({ propertyId }) {
  return (
    <div className="border rounded-xl p-6 bg-gray-50 text-center text-sm text-gray-600">
      <p className="font-medium text-gray-800 mb-2">
        Unified Calendar Placeholder
      </p>
      <p>
        The full unified calendar UI will appear here for property:
      </p>
      <p className="mt-1 font-semibold text-teal-600">{propertyId}</p>

      <p className="mt-4 text-xs text-gray-500">
        (This placeholder exists so HostDashboard compiles.  
        Phase 2 will replace this with the full calendar.)
      </p>
    </div>
  );
}