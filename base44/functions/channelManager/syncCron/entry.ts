import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

/**
 * Scheduled Calendar Sync Job
 *
 * Helper functions are inlined (no local imports allowed in Deno deploy).
 */

// ── Inline: parseICal ───────────────────────────────────────────────────────
function normaliseDate(raw) {
  if (!raw) return "";
  return raw.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
}

function parseICal(icalText) {
  const events = [];
  const lines = icalText.split(/\r?\n/);
  let current = null;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = {};
    } else if (line.startsWith("END:VEVENT")) {
      if (current?.start && current?.end) {
        events.push({
          uid: current.uid || crypto.randomUUID(),
          start: current.start,
          end: current.end,
          summary: current.summary || "External Booking",
          raw: { ...current }
        });
      }
      current = null;
    } else if (current) {
      if (line.startsWith("UID:")) current.uid = line.replace("UID:", "").trim();
      if (line.startsWith("DTSTART")) {
        const raw = line.split(":")[1]?.trim();
        current.start = normaliseDate(raw);
      }
      if (line.startsWith("DTEND")) {
        const raw = line.split(":")[1]?.trim();
        current.end = normaliseDate(raw);
      }
      if (line.startsWith("SUMMARY:")) current.summary = line.replace("SUMMARY:", "").trim();
    }
  }

  return events;
}

// ── Inline: detectConflict ──────────────────────────────────────────────────
async function detectConflict(serviceRole, propertyId, start, end) {
  const overlapping = await serviceRole.entities.Booking.filter({
    property_id: propertyId,
    booking_status: { $in: ["confirmed"] },
    check_in: { $lt: end },
    check_out: { $gt: start }
  });
  return overlapping.length > 0;
}

// ── Inline: createInternalBlockedBooking ────────────────────────────────────
async function createInternalBlockedBooking(serviceRole, propertyId, start, end, guestName = "External Booking") {
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

// ── Inline: upsertChannelBooking ────────────────────────────────────────────
async function upsertChannelBooking(serviceRole, listing, event, conflict) {
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

// ── Main Handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;

    const listings = await serviceRole.entities.ChannelListing.filter({
      status: "active"
    });

    let totalImported = 0;
    let totalConflicts = 0;

    for (const listing of listings) {
      if (!listing.ical_import_url) continue;

      const propertyId = listing.property_id;

      let icalText = "";
      try {
        const res = await fetch(listing.ical_import_url);
        icalText = await res.text();
      } catch (err) {
        console.error("Failed to fetch iCal:", listing.ical_import_url, err);
        await serviceRole.entities.CalendarSyncJob.create({
          channel_listing_id: listing.id,
          type: "import",
          status: "failed",
          error_message: "Failed to fetch iCal",
          run_at: new Date().toISOString()
        });
        continue;
      }

      const events = parseICal(icalText);
      let importedCount = 0;
      let conflictCount = 0;

      for (const ev of events) {
        const conflict = await detectConflict(serviceRole, propertyId, ev.start, ev.end);
        if (conflict) conflictCount++;

        await upsertChannelBooking(serviceRole, listing, ev, conflict);

        if (!conflict) {
          await createInternalBlockedBooking(serviceRole, propertyId, ev.start, ev.end, ev.summary);
        }

        importedCount++;
      }

      totalImported += importedCount;
      totalConflicts += conflictCount;

      await serviceRole.entities.CalendarSyncJob.create({
        channel_listing_id: listing.id,
        type: "import",
        status: "success",
        run_at: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      listings_processed: listings.length,
      total_imported: totalImported,
      total_conflicts: totalConflicts
    });

  } catch (err) {
    console.error("syncCron error:", err);
    return Response.json({ success: false, error: "server_error" }, { status: 500 });
  }
});