import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function useCalendarEvents(propertyId) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) {
      setLoading(false);
      return;
    }

    async function loadEvents() {
      setLoading(true);
      try {
        // Fetch all event sources in parallel
        const [bookings, cleaningJobs, property] = await Promise.all([
          base44.entities.Booking.filter({
            property_id: propertyId,
          }),
          base44.entities.CleaningJob.filter({
            property_id: propertyId,
          }),
          base44.entities.Property.get(propertyId),
        ]);

        // Normalise booking events
        const bookingEvents = (bookings || [])
          .filter((b) => b.booking_status !== "cancelled" && b.booking_status !== "declined")
          .map((b) => ({
            id: b.id,
            type: "booking",
            source: normaliseSource(b.source || "HostKeep"),
            guest_name: b.guest_name,
            scheduled_start: b.check_in,
            scheduled_end: b.check_out,
            status: b.booking_status,
            color: getBookingColor(b.source || "HostKeep"),
          }));

        // Normalise cleaning job events
        const cleaningEvents = (cleaningJobs || [])
          .filter((job) => job.status !== "cancelled")
          .map((job) => ({
            id: job.id,
            type: "cleaning",
            source: "HostKeep",
            cleaner_name: job.cleaner_id,
            scheduled_start: job.scheduled_date,
            scheduled_end: job.scheduled_date,
            status: job.status,
            delay_reported: job.delay_reported || false,
            started_at: job.accepted_at,
            completed_at: job.completed_at,
            related_booking_id: job.booking_id,
            color: "#f59e0b",
          }));

        // Normalise blocked dates
        const blockEvents = (property?.blocked_dates || []).map((date) => ({
          id: `blocked_${date}`,
          type: "blocked",
          source: "HostKeep",
          scheduled_start: date,
          scheduled_end: date,
          color: "#9ca3af",
        }));

        // Merge all events
        const merged = [
          ...bookingEvents,
          ...cleaningEvents,
          ...blockEvents,
        ];

        setEvents(merged);
      } catch (error) {
        console.error("Failed to load calendar events:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [propertyId]);

  return { events, loading };
}

// Named export alias for backwards compatibility
export { useCalendarEvents };

function normaliseSource(source) {
  if (!source) return "HostKeep";

  const s = source.toLowerCase();

  if (s.includes("airbnb")) return "Airbnb";
  if (s.includes("booking")) return "Booking.com";
  if (s.includes("vrbo")) return "VRBO";

  return "Other";
}

function getBookingColor(source) {
  if (!source) return "#0d9488";

  const s = source.toLowerCase();

  if (s.includes("airbnb")) return "#FF5A5F";
  if (s.includes("booking")) return "#003580";
  if (s.includes("vrbo")) return "#4B3F72";

  return "#64748B";
}