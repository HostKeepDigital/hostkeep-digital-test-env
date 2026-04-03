import React, { useState } from "react";
import CalendarGrid from "./CalendarGrid";
import CalendarEventDrawer from "./CalendarEventDrawer";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
} from "date-fns";

export default function BookingBarCalendar({ propertyId }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { events, isLoading } = useCalendarEvents(propertyId, {
    start: monthStart,
    end: monthEnd,
  });

  const [selectedEvent, setSelectedEvent] = useState(null);

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

  const filteredEvents = events.filter((e) => {
    if (e.type === "booking" && !filters.bookings) return false;
    if (e.type === "cleaning" && !filters.cleaning) return false;
    if (e.type === "blocked" && !filters.blocked) return false;
    if (e.type === "conflict" && !filters.conflict) return false;
    return true;
  });

  function goPrevMonth() {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }

  function goNextMonth() {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }

  function goToday() {
    setCurrentMonth(new Date());
  }

  function handleMonthSelect(e) {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(Number(e.target.value));
    setCurrentMonth(newMonth);
  }

  function handleYearSelect(e) {
    const newYear = new Date(currentMonth);
    newYear.setFullYear(Number(e.target.value));
    setCurrentMonth(newYear);
  }

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

  return (
    <div className="w-full">
      {/* MONTH NAVIGATION */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrevMonth}
            className="px-3 py-1 border rounded hover:bg-gray-50"
          >
            ‹
          </button>

          <button
            onClick={goToday}
            className="px-3 py-1 border rounded hover:bg-gray-50"
          >
            Today
          </button>

          <button
            onClick={goNextMonth}
            className="px-3 py-1 border rounded hover:bg-gray-50"
          >
            ›
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Month dropdown */}
          <select
            value={currentMonth.getMonth()}
            onChange={handleMonthSelect}
            className="border rounded px-2 py-1"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {format(new Date(2024, i, 1), "MMMM")}
              </option>
            ))}
          </select>

          {/* Year dropdown */}
          <select
            value={currentMonth.getFullYear()}
            onChange={handleYearSelect}
            className="border rounded px-2 py-1"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

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
        monthStart={monthStart}
        monthEnd={monthEnd}
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