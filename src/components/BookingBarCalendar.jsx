import React, { useState } from "react";
import { DndContext } from "@dnd-kit/core";
import CalendarGrid from "./CalendarGrid";
import CalendarEventDrawer from "./CalendarEventDrawer";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
  differenceInCalendarDays,
} from "date-fns";
import {
  updateBookingDates,
  updateCleaningJobTimes,
  isCleanerAvailable,
  unassignCleaner,
  createCleaningConflict,
} from "@/api/calendarUpdates";

export default function BookingBarCalendar({ propertyId }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { events, isLoading, refetch } = useCalendarEvents(propertyId, {
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

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const eventId = active.id;
    const targetDay = over.id; // "yyyy-MM-dd"

    const movedEvent = events.find((e) => e.id === eventId);
    if (!movedEvent) return;

    const originalStart = new Date(movedEvent.scheduled_start);
    const originalDayKey = format(originalStart, "yyyy-MM-dd");
    if (originalDayKey === targetDay) return;

    const newDayDate = new Date(targetDay);
    const dayDelta = differenceInCalendarDays(newDayDate, originalStart);

    if (movedEvent.type === "booking") {
      const checkIn = new Date(movedEvent.check_in);
      const checkOut = new Date(movedEvent.check_out);

      const newCheckIn = new Date(checkIn);
      newCheckIn.setDate(checkIn.getDate() + dayDelta);

      const newCheckOut = new Date(checkOut);
      newCheckOut.setDate(checkOut.getDate() + dayDelta);

      await updateBookingDates(
        movedEvent.id,
        newCheckIn.toISOString(),
        newCheckOut.toISOString()
      );

      if (movedEvent.cleaning_job_id) {
        const cjStart = new Date(movedEvent.scheduled_start);
        const cjEnd = new Date(movedEvent.scheduled_end);

        const newCjStart = new Date(cjStart);
        newCjStart.setDate(cjStart.getDate() + dayDelta);

        const newCjEnd = new Date(cjEnd);
        newCjEnd.setDate(cjEnd.getDate() + dayDelta);

        if (
          movedEvent.cleaner_id &&
          !(await isCleanerAvailable(
            movedEvent.cleaner_id,
            newCjStart.toISOString(),
            newCjEnd.toISOString()
          ))
        ) {
          await unassignCleaner(movedEvent.cleaning_job_id);
          await createCleaningConflict(
            movedEvent.cleaning_job_id,
            "Cleaner unavailable on new date — please reassign."
          );
        }

        await updateCleaningJobTimes(
          movedEvent.cleaning_job_id,
          newCjStart.toISOString(),
          newCjEnd.toISOString()
        );
      }
    }

    if (movedEvent.type === "cleaning") {
      const cjStart = new Date(movedEvent.scheduled_start);
      const cjEnd = new Date(movedEvent.scheduled_end);

      const newCjStart = new Date(cjStart);
      newCjStart.setDate(cjStart.getDate() + dayDelta);

      const newCjEnd = new Date(cjEnd);
      newCjEnd.setDate(cjEnd.getDate() + dayDelta);

      if (
        movedEvent.cleaner_id &&
        !(await isCleanerAvailable(
          movedEvent.cleaner_id,
          newCjStart.toISOString(),
          newCjEnd.toISOString()
        ))
      ) {
        await unassignCleaner(movedEvent.id);
        await createCleaningConflict(
          movedEvent.id,
          "Cleaner unavailable on new date — please reassign."
        );
      }

      await updateCleaningJobTimes(
        movedEvent.id,
        newCjStart.toISOString(),
        newCjEnd.toISOString()
      );
    }

    await refetch();
  }

  return (
    <div className="w-full">
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

      <DndContext onDragEnd={handleDragEnd}>
        <CalendarGrid
          events={filteredEvents}
          monthStart={monthStart}
          monthEnd={monthEnd}
          onEventClick={(event) => setSelectedEvent(event)}
        />
      </DndContext>

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