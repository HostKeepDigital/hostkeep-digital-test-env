export function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-gray-600 mt-3">
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded bg-teal-500" />
        <span>Internal booking</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded bg-blue-500" />
        <span>External booking</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded bg-gray-400" />
        <span>Blocked</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded bg-red-500" />
        <span>Conflict</span>
      </div>
    </div>
  );
}