import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

/**
 * Public iCal export endpoint
 * 
 * Example:
 *   GET /functions/channelManager/icalExport?token=XYZ
 * 
 * Returns:
 *   text/calendar
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    // ───────────────────────────────────────────────
    // 1. Extract token from query params
    // ───────────────────────────────────────────────
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Missing token", { status: 400 });
    }

    // ───────────────────────────────────────────────
    // 2. Look up ChannelListing by export token
    // ───────────────────────────────────────────────
    const listings = await serviceRole.entities.ChannelListing.filter({
      ical_export_token: token,
    });

    const listing = listings?.[0];

    if (!listing) {
      return new Response("Invalid calendar token", { status: 404 });
    }

    const propertyId = listing.property_id;

    // ───────────────────────────────────────────────
    // 3. Fetch internal bookings for this property
    // ───────────────────────────────────────────────
    const internalBookings = await serviceRole.entities.Booking.filter({
      property_id: propertyId,
      booking_status: { $in: ["confirmed", "blocked"] }
    });

    // ───────────────────────────────────────────────
    // 4. Fetch external (iCal imported) bookings
    // ───────────────────────────────────────────────
    const externalBookings = await serviceRole.entities.ChannelBooking.filter({
      property_id: propertyId,
      status: "confirmed"
    });

    // ───────────────────────────────────────────────
    // 5. Convert bookings → VEVENT entries
    // ───────────────────────────────────────────────
    const events = [];

    // Internal bookings
    for (const b of internalBookings) {
      events.push({
        uid: `internal-${b.id}@hostkeep`,
        start: b.check_in,
        end: b.check_out,
        summary: "Booking"
      });
    }

    // External bookings
    for (const b of externalBookings) {
      events.push({
        uid: `external-${b.id}@hostkeep`,
        start: b.start_date,
        end: b.end_date,
        summary: b.guest_name || "External Booking"
      });
    }

    // ───────────────────────────────────────────────
    // 6. Build iCal string
    // ───────────────────────────────────────────────
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//HostKeep//ChannelManager//EN"
    ];

    for (const ev of events) {
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${ev.uid}`);
      lines.push(`DTSTART;VALUE=DATE:${ev.start.replace(/-/g, "")}`);
      lines.push(`DTEND;VALUE=DATE:${ev.end.replace(/-/g, "")}`);
      lines.push(`SUMMARY:${ev.summary}`);
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    const icalText = lines.join("\r\n");

    // ───────────────────────────────────────────────
    // 7. Return iCal feed
    // ───────────────────────────────────────────────
    return new Response(icalText, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-cache"
      }
    });

  } catch (err) {
    console.error("icalExport error:", err);
    return new Response("Server error", { status: 500 });
  }
});