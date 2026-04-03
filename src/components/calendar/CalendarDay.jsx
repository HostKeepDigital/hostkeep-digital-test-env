import { isSameDay, isWithinInterval, parseISO } from "date-fns";

export function CalendarDay({
  date,
  month,
  internal,
  external,
  conflicts,
  onClick
}) {
  const isCurrentMonth = date.getMonth() === month.getMonth();
  const label = date.getDate();

  const dayInternal = internal.filter((b) =>
    isWithinInterval(date, {
      start: parseISO(b.check_in),
      end: parseISO(b.check_out)
    })
  );

  const dayExternal = external.filter((b) =>
    isWithinInterval(date, {
      start: parseISO(b.start_date),
      end: parseISO(b.end_date)
    })
  );

  const dayBlocked = internal.filter(
    (b) =>
      b.booking_status === "blocked" &&
      isWithinInterval(date, {
        start: parseISO(b.check_in),
        end: parseISO(b.check_out)
      })
  );

  const dayConflicts = conflicts.filter((b) =>
    isWithinInterval(date, {
      start: parseISO(b.start_date),
      end: parseISO(b.end_date)
    })
  );

  const hasSomething =
    dayInternal.length ||
    dayExternal.length ||
    dayBlocked.length ||
    dayConflicts.length;

  return (
    <button
      type="button"
      onClick={() =>
        onClick?.({
          date,
          internal: dayInternal,
          external: dayExternal,
          blocked: dayBlocked,
          conflicts: dayConflicts
        })
      }
      className={`h-20 border text-left p-1 align-top relative ${
        isCurrentMonth ? "bg-white" : "bg-gray-50 text-gray-400"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">{label}</span>
        {isSameDay(date, new Date()) && (
          <span className="text-[10px] px-1 rounded bg-teal-100 text-teal-700">
            Today
          </span>
        )}
      </div>

      {hasSomething && (
        <div className="flex flex-wrap gap-0.5">
          {dayInternal.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-teal-500" />
          )}
          {dayExternal.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          )}
          {dayBlocked.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-gray-400" />
          )}
          {dayConflicts.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500" />
          )}
        </div>
      )}
    </button>
  );
}