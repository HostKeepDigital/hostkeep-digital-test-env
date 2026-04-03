import { useState } from "react";
import useCalendarEvents from "@/hooks/useCalendarEvents";
import CalendarGrid from "./CalendarGrid";
import BookingBar from "./BookingBar";
import CalendarEventDrawer from "./CalendarEventDrawer";

export default function BookingBarCalendar({ propertyId }) {
  const { events, loading } = useCalendarEvents(propertyId);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Loading calendar…
      </div>
    );
  }

  return (
    <div className="booking-calendar-container">
      {/* MONTH HEADER + NAVIGATION */}
      <div className="calendar-header">
        <button
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
            )
          }
        >
          ←
        </button>

        <h2>
          {currentMonth.toLocaleString("default", { month: "long" })}{" "}
          {currentMonth.getFullYear()}
        </h2>

        <button
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
            )
          }
        >
          →
        </button>
      </div>

      {/* CALENDAR GRID */}
      <CalendarGrid currentMonth={currentMonth}>
        {(cellDate) => {
          const cellEvents = events.filter((ev) => {
            const start = new Date(ev.scheduled_start);
            const end = new Date(ev.scheduled_end);

            return cellDate >= start && cellDate <= end;
          });

          return (
            <div className="calendar-cell">
              {cellEvents.map((ev) => (
                <BookingBar
                  key={ev.id}
                  event={ev}
                  onClick={() => setSelectedEvent(ev)}
                />
              ))}
            </div>
          );
        }}
      </CalendarGrid>

      {/* EVENT DRAWER */}
      {selectedEvent && (
        <CalendarEventDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}