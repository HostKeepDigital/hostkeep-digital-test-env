import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const COLOR_MAP = {
  booking_hostkeep: "#0d9488",   // teal
  booking_airbnb: "#FF5A5F",
  booking_booking_com: "#003580",
  booking_vrbo: "#1B468A",
  booking_other: "#6b7280",
  cleaning: "#f59e0b",
  blocked: "#9ca3af",
  conflict: "#ef4444",
};

function bookingColor(source) {
  const key = "booking_" + source.toLowerCase().replace(/[^a-z]/g, "_").replace(/_+/g, "_").replace(/_$/, "");
  return COLOR_MAP[key] || COLOR_MAP.booking_other;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { propertyId, startDate, endDate } = body;

    if (!propertyId) {
      return Response.json({ error: "propertyId is required" }, { status: 400 });
    }

    // Fetch all data in parallel
    const [bookings, channelBookings, cleaningJobs, property, channelListings] = await Promise.all([
      base44.asServiceRole.entities.Booking.filter({ property_id: propertyId }),
      base44.asServiceRole.entities.ChannelBooking.filter({ property_id: propertyId }),
      base44.asServiceRole.entities.CleaningJob.filter({ property_id: propertyId }),
      base44.asServiceRole.entities.Property.get(propertyId),
      base44.asServiceRole.entities.ChannelListing.filter({ property_id: propertyId }),
    ]);

    // Build channel_listing_id → channel_id map
    const listingChannelMap = {};
    for (const l of (channelListings || [])) {
      listingChannelMap[l.id] = l.channel_id;
    }

    const events = [];

    // ── Internal HostKeep bookings ──────────────────────────────────────────
    for (const b of (bookings || [])) {
      if (!b.check_in || !b.check_out) continue;
      if (b.booking_status === "cancelled" || b.booking_status === "declined" || b.booking_status === "expired") continue;

      events.push({
        id: b.id,
        type: b.booking_status === "blocked" ? "blocked" : "booking",
        source: "HostKeep",
        guest_name: b.guest_name,
        scheduled_start: b.check_in,
        scheduled_end: b.check_out,
        status: b.booking_status,
        related_booking_id: b.id,
        color: b.booking_status === "blocked" ? COLOR_MAP.blocked : bookingColor("HostKeep"),
      });
    }

    // ── Channel (OTA) bookings ──────────────────────────────────────────────
    const CHANNEL_SOURCE = {
      airbnb: "Airbnb",
      booking_com: "Booking.com",
      vrbo: "VRBO",
    };

    for (const cb of (channelBookings || [])) {
      if (!cb.start_date || !cb.end_date) continue;
      if (cb.status === "cancelled") continue;

      const channelId = listingChannelMap[cb.channel_listing_id] || cb.channel_id || "other";
      const source = CHANNEL_SOURCE[channelId] || "Other";
      const isConflict = cb.conflict === true;

      events.push({
        id: cb.id,
        type: isConflict ? "conflict" : "booking",
        source,
        guest_name: cb.guest_name,
        scheduled_start: cb.start_date,
        scheduled_end: cb.end_date,
        status: cb.status,
        color: isConflict ? COLOR_MAP.conflict : bookingColor(source),
      });
    }

    // ── Blocked dates from property ─────────────────────────────────────────
    for (const date of (property?.blocked_dates || [])) {
      events.push({
        id: `blocked_${date}`,
        type: "blocked",
        source: "HostKeep",
        scheduled_start: date,
        scheduled_end: date,
        color: COLOR_MAP.blocked,
      });
    }

    // ── Cleaning jobs ───────────────────────────────────────────────────────
    for (const job of (cleaningJobs || [])) {
      if (!job.scheduled_date) continue;
      if (job.status === "cancelled") continue;

      events.push({
        id: job.id,
        type: "cleaning",
        source: "HostKeep",
        cleaner_name: job.cleaner_id,   // caller can resolve name client-side
        scheduled_start: job.scheduled_date,
        scheduled_end: job.scheduled_date,
        status: job.status,
        started_at: job.accepted_at,
        completed_at: job.completed_at,
        delay_reported: false,
        related_booking_id: job.booking_id,
        color: COLOR_MAP.cleaning,
      });
    }

    // ── Optional date filtering ─────────────────────────────────────────────
    let filtered = events;
    if (startDate || endDate) {
      filtered = events.filter((e) => {
        if (startDate && e.scheduled_end < startDate) return false;
        if (endDate && e.scheduled_start > endDate) return false;
        return true;
      });
    }

    return Response.json({ events: filtered });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});