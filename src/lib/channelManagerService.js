/**
 * Channel Manager Service
 *
 * Centralised logic for:
 *  - Conflict detection
 *  - Internal blocked booking creation
 *  - Unified calendar merging (internal + external)
 *  - Helpers used by import/export functions
 *
 * This file is intentionally dependency‑free and Deno‑compatible.
 */

import { generateICal } from "./icalService.js";

/**
 * Detect if a date range overlaps any confirmed internal booking.
 */
export async function detectConflict(serviceRole, propertyId, start, end) {
  const overlapping = await serviceRole.entities.Booking.filter({
    property_id: propertyId,
    booking_status: { $in: ["confirmed"] },
    check_in: { $lt: end },
    check_out: { $gt: start }
  });

  return overlapping.length > 0;
}

/**
 * Create an internal blocked booking (used for external OTA bookings).
 */
export async function createInternalBlockedBooking(
  serviceRole,
  propertyId,
  start,
  end,
  guestName = "External Booking"
) {
  return await serviceRole.entities.Booking.create({
    property_id: propertyId,
    host_id: "",
    guest_name: guestName,
    guest_email: "",
    check_in: start,
    check_out: end,
    total_amount: 0,
    booking_status: "blocked"
  });
}

/**
 * Fetch all internal + external bookings for a property.
 */
export async function getUnifiedCalendar(serviceRole, propertyId) {
  const internal = await serviceRole.entities.Booking.filter({
    property_id: propertyId,
    booking_status: { $in: ["confirmed", "blocked"] }
  });

  const external = await serviceRole.entities.ChannelBooking.filter({
    property_id: propertyId,
    status: "confirmed"
  });

  return {
    internal,
    external
  };
}

/**
 * Convert unified calendar → iCal feed.
 */
export function unifiedCalendarToICal(unified) {
  const events = [];

  // Internal bookings
  for (const b of unified.internal) {
    events.push({
      uid: `internal-${b.id}@hostkeep`,
      start: b.check_in,
      end: b.check_out,
      summary: "Booking"
    });
  }

  // External bookings
  for (const b of unified.external) {
    events.push({
      uid: `external-${b.id}@hostkeep`,
      start: b.start_date,
      end: b.end_date,
      summary: b.guest_name || "External Booking"
    });
  }

  return generateICal(events);
}

/**
 * Upsert a ChannelBooking record.
 */
export async function upsertChannelBooking(
  serviceRole,
  listing,
  event,
  conflict
) {
  const propertyId = listing.property_id;

  const existing = await serviceRole.entities.ChannelBooking.filter({
    external_reservation_id: event.uid,
    property_id: propertyId
  });

  if (existing?.[0]) {
    return await serviceRole.entities.ChannelBooking.update(existing[0].id, {
      start_date: event.start,
      end_date: event.end,
      guest_name: event.summary || "External Booking",
      conflict,
      raw_payload: event
    });
  }

  return await serviceRole.entities.ChannelBooking.create({
    property_id: propertyId,
    channel_listing_id: listing.id,
    channel_id: listing.channel_id,
    external_reservation_id: event.uid,
    start_date: event.start,
    end_date: event.end,
    guest_name: event.summary || "External Booking",
    status: "confirmed",
    conflict,
    raw_payload: event
  });
}