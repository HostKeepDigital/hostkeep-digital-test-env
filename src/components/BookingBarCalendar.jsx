import React, { useState } from "react";
import CalendarGrid from "./CalendarGrid";
import BookingBar from "./BookingBar";
import CalendarEventDrawer from "./CalendarEventDrawer";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

export default function BookingBarCalendar({ propertyId }) {
  const { events, isLoading } = useCalendarEvents(propertyId);

  const [selectedEvent, setSelectedEvent] = useState(null);

  //
  // FILTER STATE
  //
  const [filters, setFilters] = useState({
    bookings: true,
    cleaning: true,
    blocked: true,
    conflict: true,
  });

  function toggleFilter(key) {
    setFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  //
  // APPLY FILTERS
  //
  const filteredEvents = events.filter((e) => {
    if (e.type === "booking" && !filters.bookings) return false;
    if (e.type === "cleaning" && !filters.cleaning) return false;
    if (e.type === "blocked" && !filters.blocked) return false;
    if (e.type === "conflict" && !filters.conflict) return false;
    return true;
  });

  return (
    <div className="w-full">
      {/* FILTER BAR */}
      <div className="flex items-center gap-2 mb-4">
        <FilterButton
          label="Bookings"
          active={filters.bookings}
          color="#0ea5e9"
          onClick={() => toggleFilter("bookings")}
        />

        <FilterButton
          label="Cleaning"
          active={filters.cleaning}
          color="#16a34a"
          onClick={() => toggleFilter("cleaning")}
        />

        <FilterButton
          label="Blocked"
          active={filters.blocked}
          color="#6b7280"
          onClick={() => toggleFilter("blocked")}
        />

        <FilterButton
          label="Conflicts"
          active={filters.conflict}
          color="#dc2626"
          onClick={() => toggleFilter("conflict")}
        />
      </div>

      {/* CALENDAR GRID */}
      <CalendarGrid
        events={filteredEvents}
        onEventClick={(event) => setSelectedEvent(event)}
      />

      {/* DRAWER */}
      {selectedEvent && (
        <CalendarEventDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

//
// FILTER BUTTON COMPONENT
//
function FilterButton({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: active ? color : "white",
        color: active ? "white" : "#374151",
        border: `1px solid ${color}`,
        padding: "6px 12px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: 500,
      }}
    >
      {label}
    </button>
  );
}