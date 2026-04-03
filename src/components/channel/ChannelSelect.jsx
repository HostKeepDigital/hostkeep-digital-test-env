import { ChannelIcon } from "./ChannelIcon";

const CHANNELS = [
  { id: "airbnb", label: "Airbnb" },
  { id: "booking", label: "Booking.com" },
  { id: "vrbo", label: "VRBO" }
];

export function ChannelSelect({ onSelect }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">Choose a channel</h2>

      <div className="grid grid-cols-3 gap-3">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="border rounded-lg p-3 flex flex-col items-center hover:bg-gray-50"
          >
            <ChannelIcon channel={c.id} className="w-8 h-8 mb-2" />
            <span className="text-xs font-medium">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}