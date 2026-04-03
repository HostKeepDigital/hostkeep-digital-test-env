import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

/**
 * iCal Import Endpoint
 *
 * Trigger:
 *   POST /functions/channelManager/icalImport
 *
 * Body:
 *   { "channelListingId": "..." }
 *
 * Behaviour:
 *   - Fetch external iCal URL
 *   - Parse VEVENTs
 *   - Upsert ChannelBooking
 *   - Create internal blocked bookings
 *   - Detect conflicts
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const body = await req.json();
    const { channelListingId } = body;

    if (!channelListingId) {
      return Response.json(
        { success: false, error: "missing_channelListingId" },
        { status: 400 }
      );
    }

    // ───────────────────────────────────────────────
    // 1. Load ChannelListing
    // ───────────────────────────────────────────────
    const listing = await serviceRole.entities.ChannelListing.get(
      channelListingId
    );

    if (!listing) {
      return Response.json(
        { success: false, error: "listing_not_found" },
        { status: 404 }
      );
    }

    if (!listing.ical_import_url) {
      return Response.json(
        { success: false, error: "no_ical_import_url" },
        { status: 400 }
      );
    }

    const propertyId = listing.property_id;

    // ───────────────────────────────────────────────
    // 2. Fetch external iCal feed
    // ───────────────────────────────────────────────
    const res = await fetch(listing.ical_import_url);
    const icalText = await res.text();

    if (!res.ok || !icalText) {
      return Response.json(
        { success: false, error: "failed_to_fetch_ical" },
        { status: 500 }
      );
    }

    // ───────────────────────────────────────────────
    // 3. Parse VEVENTs from iCal
    // ───────────────────────────────────────────────
    const events = [];
    const lines = icalText.split(/\r?\n/);

    let current = null;

    for (const line of lines) {
      if (line.startsWith("BEGIN:VEVENT")) {
        current = {};
      } else if (line.startsWith("END:VEVENT")) {
        if (current?.start && current?.end) {
          events.push(current);
        }
        current = null;
      } else if (current) {
        if (line.startsWith("UID:")) {
          current.uid = line.replace("UID:", "").trim();
        }
        if (line.startsWith("DTSTART")) {
          const raw = line.split(":")[1].trim();
          current.start = raw.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
        }
        if (line.startsWith("DTEND")) {
          const raw = line.split(":")[1].trim();
          current.end = raw.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
        }
        if (line.startsWith("SUMMARY:")) {
          current.summary = line.replace("SUMMARY:", "").trim();
        }
      }
    }

    // ───────────────────────────────────────────────
    // 4. Process events → Upsert ChannelBooking
    // ───────────────────────────────────────────────
    let importedCount = 0;
    let conflictCount = 0;

    for (const ev of events) {
      const existing = await serviceRole.entities.ChannelBooking.filter({
        external_reservation_id: ev.uid,
        property_id: propertyId
      });

      const conflict = await detectConflict(
        serviceRole,
        propertyId,
        ev.start,
        ev.end
      );

      if (conflict) conflictCount++;

      if (existing?.[0]) {
        // Update existing
        await serviceRole.entities.ChannelBooking.update(existing[0].id, {
          start_date: ev.start,
          end_date: ev.end,
          guest_name: ev.summary || "External Booking",
          conflict
        });
      } else {
        // Create new
        await serviceRole.entities.ChannelBooking.create({
          property_id: propertyId,
          channel_listing_id: channelListingId,
          channel_id: listing.channel_id,
          external_reservation_id: ev.uid,
          start_date: ev.start,
          end_date: ev.end,
          guest_name: ev.summary || "External Booking",
          status: "confirmed",
          conflict,
          raw_payload: ev
        });
      }

      // Also create internal blocked booking if needed
      if (conflict === false) {
        await createInternalBlockedBooking(
          serviceRole,
          propertyId,
          ev.start,
          ev.end
        );
      }

      importedCount++;
    }

    // ───────────────────────────────────────────────
    // 5. Log sync job
    // ───────────────────────────────────────────────
    await serviceRole.entities.CalendarSyncJob.create({
      channel_listing_id: channelListingId,
      type: "import",
      status: "success",
      run_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      imported: importedCount,
      conflicts: conflictCount
    });
  } catch (err) {
    console.error("icalImport error:", err);
    return Response.json(
      { success: false, error: "server_error" },
      { status: 500 }
    );
  }
});

/**
 * Detect if an external event overlaps an internal booking.
 */
async function detectConflict(serviceRole, propertyId, start, end) {
  const overlapping = await serviceRole.entities.Booking.filter({
    property_id: propertyId,
    booking_status: { $in: ["confirmed"] },
    check_in: { $lt: end },
    check_out: { $gt: start }
  });

  return overlapping.length > 0;
}

/**
 * Create an internal blocked booking if no conflict.
 */
async function createInternalBlockedBooking(serviceRole, propertyId, start, end) {
  await serviceRole.entities.Booking.create({
    property_id: propertyId,
    host_id: "",
    guest_name: "External Booking",
    guest_email: "",
    check_in: start,
    check_out: end,
    total_amount: 0,
    booking_status: "blocked"
  });
}