import { ChannelIcon } from "./ChannelIcon";

const COLORS = {
  airbnb: "bg-rose-50 text-rose-700 border-rose-200",
  booking: "bg-blue-50 text-blue-700 border-blue-200",
  vrbo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  default: "bg-gray-50 text-gray-700 border-gray-200"
};

export function ChannelBadge({ channelId, label }) {
  const colorClass = COLORS[channelId] || COLORS.default;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${colorClass}`}
    >
      <ChannelIcon channel={channelId} className="w-3.5 h-3.5" />
      <span>{label}</span>
    </span>
  );
}