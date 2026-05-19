import React from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  format,
} from "date-fns";

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarGrid({ events, monthStart, monthEnd, onEventClick }) {
  const today = new Date();

  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const eventsByDay = {};
  for (const event of events) {
    const dayKey = format(new Date(event.scheduled_start), "yyyy-MM-dd");
    if (!eventsByDay[dayKey]) eventsByDay[dayKey] = [];
    eventsByDay[dayKey].push(event);
  }

  // Split days into weeks
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="w-full border border-gray-200 rounded-xl overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d.charAt(0)}</span>
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x divide-gray-100" style={{ borderBottom: wi < weeks.length - 1 ? "1px solid #f3f4f6" : "none" }}>
            {week.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const isToday = isSameDay(day, today);
              const inMonth = isSameMonth(day, monthStart);
              const dayEvents = eventsByDay[dayKey] || [];

              return (
                <div
                  key={dayKey}
                  data-day={dayKey}
                  className={`min-h-[80px] sm:min-h-[100px] p-1 sm:p-1.5 ${!inMonth ? "bg-gray-50" : "bg-white"}`}
                >
                  {/* Date number */}
                  <div className="flex justify-end mb-1">
                    <span
                      className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? "bg-teal-600 text-white font-bold"
                          : inMonth
                          ? "text-gray-700"
                          : "text-gray-300"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        aria-label={`${event.guest_name || event.cleaner_name || event.company_name || event.type} — click to view details`}
                        className="w-full text-left text-white rounded px-1.5 py-1 text-xs sm:text-sm font-medium leading-tight truncate block hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white transition-opacity min-h-[28px] sm:min-h-[32px] flex items-center"
                        style={{ backgroundColor: event.color }}
                      >
                        {event.guest_name || event.cleaner_name || event.company_name || event.type}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-xs text-gray-400 pl-1">+{dayEvents.length - 3} more</span>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}