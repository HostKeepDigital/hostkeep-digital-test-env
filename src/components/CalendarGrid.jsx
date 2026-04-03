import React, { useEffect, useRef } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  format,
} from "date-fns";

export default function CalendarGrid({
  events,
  monthStart,
  monthEnd,
  onEventClick,
}) {
  const gridRef = useRef(null);
  const today = new Date();

  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  useEffect(() => {
    if (!isSameMonth(today, monthStart)) return;

    const el = document.querySelector(
      `[data-day="${format(today, "yyyy-MM-dd")}"]`
    );
    if (el && gridRef.current) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [monthStart]);

  const eventsByDay = {};
  for (const event of events) {
    const dayKey = format(new Date(event.scheduled_start), "yyyy-MM-dd");
    if (!eventsByDay[dayKey]) eventsByDay[dayKey] = [];
    eventsByDay[dayKey].push(event);
  }

  return (
    <div
      ref={gridRef}
      className="calendar-grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${days.length}, 1fr)`,
        overflowX: "auto",
        borderTop: "1px solid #e5e7eb",
        borderBottom: "1px solid #e5e7eb",
        paddingBottom: "20px",
      }}
    >
      {days.map((day) => {
        const dayKey = format(day, "yyyy-MM-dd");
        const isToday = isSameDay(day, today);

        return (
          <DayColumn
            key={dayKey}
            day={day}
            dayKey={dayKey}
            isToday={isToday}
            events={eventsByDay[dayKey] || []}
            onEventClick={onEventClick}
          />
        );
      })}
    </div>
  );
}

function DayColumn({ day, dayKey, isToday, events, onEventClick }) {
  return (
    <div
      data-day={dayKey}
      style={{
        borderRight: "1px solid #e5e7eb",
        minWidth: "140px",
        position: "relative",
        backgroundColor: "white",
      }}
    >
      {/* TODAY HEADER HIGHLIGHT */}
      <div
        style={{
          padding: "6px 0",
          textAlign: "center",
          fontWeight: isToday ? 700 : 500,
          color: isToday ? "#0f766e" : "#374151",
          backgroundColor: isToday ? "#ccfbf1" : "transparent",
          borderBottom: "1px solid #e5e7eb",
          borderTop: isToday ? "2px solid #0d9488" : "2px solid transparent",
        }}
      >
        {format(day, "d")}
      </div>

      {/* TODAY COLUMN BORDER */}
      {isToday && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            borderLeft: "2px solid #0d9488",
            borderRight: "2px solid #0d9488",
            pointerEvents: "none",
          }}
        />
      )}

      {/* EVENTS */}
      <div style={{ padding: "4px" }}>
        {events.map((event) => (
          <div
            key={event.id}
            onClick={() => onEventClick(event)}
            style={{
              backgroundColor: event.color,
              borderRadius: "4px",
              padding: "4px 6px",
              marginBottom: "4px",
              cursor: "pointer",
              color: "white",
              fontSize: "12px",
              lineHeight: "14px",
              position: "relative",
            }}
          >
            {event.guest_name ||
              event.cleaner_name ||
              event.company_name ||
              event.type}
          </div>
        ))}
      </div>
    </div>
  );
}