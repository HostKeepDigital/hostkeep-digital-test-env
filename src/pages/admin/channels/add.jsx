import { useState } from "react";
import { ChannelWizard } from "../../../components/channel/ChannelWizard";

export default function AddChannelPage() {
  const [propertyId, setPropertyId] = useState("");

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">Add Channel</h1>
      <p className="text-sm text-gray-600">
        Connect Airbnb, Booking.com or VRBO to sync calendars.
      </p>

      {!propertyId && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">
            Property ID
          </label>
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm w-64"
            placeholder="Enter property ID"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
          />
        </div>
      )}

      {propertyId && <ChannelWizard propertyId={propertyId} />}
    </div>
  );
}