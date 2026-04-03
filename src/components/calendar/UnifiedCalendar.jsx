import { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  format
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUnifiedCalendar } from "@/hooks/useUnifiedCalendar";
import { CalendarDay } from "./CalendarDay";
import { CalendarLegend } from "./CalendarLegend";

export default function UnifiedCalendar({ propertyId }) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedInfo, setSelectedInfo] = useState(null);

  const { internal, external, conflicts, loading, error } =
    useUnifiedCalendar(propertyId);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let day = gridStart;
  while (day <= gridEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const handlePrev = () => {
    setCurrentMonth((prev) => startOfMonth(addMonths(prev, -1)));
  };

  const handleNext = () => {
    setCurrentMonth((prev) => startOfMonth(addMonths(prev, 1)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="p-1 rounded hover:bg-gray-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="p-1 rounded hover:bg-gray-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </span>
        </div>

        {loading && (
          <span className="text-xs text-gray-500">Loading calendar…</span>
        )}
        {error && (
          <span className="text-xs text-red-600">
            Failed to load calendar
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 text-[11px] text-gray-500 mb-1">
        <div className="text-center">Mon</div>
        <div className="text-center">Tue</div>
        <div className="text-center">Wed</div>
        <div className="text-center">Thu</div>
        <div className="text-center">Fri</div>
        <div className="text-center">Sat</div>
        <div className="text-center">Sun</div>
      </div>

      <div className="grid grid-cols-7 border rounded-lg overflow-hidden bg-gray-100">
        {days.map((d) => (
          <CalendarDay
            key={d.toISOString()}
            date={d}
            month={currentMonth}
            internal={internal}
            external={external}
            conflicts={conflicts}
            onClick={setSelectedInfo}
          />
        ))}
      </div>

      <CalendarLegend />

      {selectedInfo && (
        <div className="mt-3 border rounded-lg p-3 bg-gray-50 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">
              {format(selectedInfo.date, "EEE d MMM")}
            </span>
            <button
              type="button"
              onClick={() => setSelectedInfo(null)}
              className="text-[11px] text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>

          {selectedInfo.internal.length === 0 &&
            selectedInfo.external.length === 0 &&
            selectedInfo.blocked?.length === 0 &&
            selectedInfo.conflicts.length === 0 && (
              <p className="text-gray-500">No bookings on this day.</p>
            )}

          {selectedInfo.internal.length > 0 && (
            <div className="mt-1">
              <p className="font-semibold text-teal-700 mb-0.5">
                Internal bookings
              </p>
              <ul className="space-y-0.5">
                {selectedInfo.internal.map((b) => (
                  <li key={b.id}>
                    {b.guest_name || "Guest"} —{" "}
                    {format(new Date(b.check_in), "d MMM")}–{" "}
                    {format(new Date(b.check_out), "d MMM")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedInfo.external.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold text-blue-700 mb-0.5">
                External bookings
              </p>
              <ul className="space-y-0.5">
                {selectedInfo.external.map((b) => (
                  <li key={b.id}>
                    {b.guest_name || "External booking"} —{" "}
                    {format(new Date(b.start_date), "d MMM")}–{" "}
                    {format(new Date(b.end_date), "d MMM")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedInfo.blocked?.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold text-gray-700 mb-0.5">
                Blocked
              </p>
              <p className="text-gray-600">
                Dates blocked internally (no bookings allowed).
              </p>
            </div>
          )}

          {selectedInfo.conflicts.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold text-red-700 mb-0.5">
                Conflicts
              </p>
              <p className="text-red-600">
                There are overlapping external bookings on this date.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}