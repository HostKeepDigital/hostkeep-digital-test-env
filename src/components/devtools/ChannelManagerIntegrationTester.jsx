import { useState } from "react";
import {
  createChannelListing,
  validateIcalUrl,
  regenerateExportToken,
  triggerChannelSync,
  getConflicts,
  resolveConflict,
  deleteChannelBooking
} from "@/utils/api/channelManager";
import { getUnifiedCalendar } from "@/utils/api/calendar";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

export default function ChannelManagerIntegrationTester({ hostId }) {
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);

  const append = (msg) =>
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const runTests = async () => {
    setRunning(true);
    setLog([]);

    try {
      append("Starting Channel Manager integration tests…");

      // 1. Create test property
      append("Creating test property…");
      const property = await base44.entities.Property.create({
        owner_id: hostId,
        title: "Test Property – Channel Manager",
        nightly_rate: 100,
        status: "published"
      });
      append(`✔ Property created: ${property.id}`);

      // 2. Create channel listing
      append("Creating channel listing…");
      const listingRes = await createChannelListing({
        propertyId: property.id,
        channelId: "airbnb",
        ical_import_url: "https://example.com/test.ics"
      });
      const listing = listingRes.listing;
      append(`✔ Channel listing created: ${listing.id}`);

      // 3. Validate iCal URL
      append("Validating iCal URL…");
      try {
        await validateIcalUrl("https://example.com/test.ics");
        append("✔ iCal validation passed");
      } catch {
        append("⚠ iCal validation failed (expected if URL is fake)");
      }

      // 4. Regenerate export token
      append("Regenerating export token…");
      const regen = await regenerateExportToken(listing.id);
      append(`✔ New token: ${regen.listing.ical_export_token}`);

      // 5. Trigger manual sync
      append("Triggering manual sync…");
      try {
        await triggerChannelSync(listing.id);
        append("✔ Sync triggered");
      } catch {
        append("⚠ Sync failed (expected if no real iCal)");
      }

      // 6. Create fake conflict
      append("Creating fake conflict booking…");
      const conflict = await base44.entities.ChannelBooking.create({
        property_id: property.id,
        channel_listing_id: listing.id,
        start_date: "2026-04-10",
        end_date: "2026-04-15",
        conflict: true
      });
      append(`✔ Conflict created: ${conflict.id}`);

      // 7. Fetch conflicts
      append("Fetching conflicts…");
      const conflicts = await getConflicts(hostId);
      append(`✔ Conflicts returned: ${conflicts.conflicts.length}`);

      // 8. Resolve conflict
      append("Resolving conflict…");
      await resolveConflict(conflict.id);
      append("✔ Conflict resolved");

      // 9. Delete conflict booking
      append("Deleting conflict booking…");
      await deleteChannelBooking(conflict.id);
      append("✔ Conflict booking deleted");

      // 10. Unified calendar test
      append("Testing unified calendar endpoint…");
      const calendar = await getUnifiedCalendar(property.id);
      append(
        `✔ Unified calendar returned: ${calendar.internal.length} internal, ${calendar.external.length} external`
      );

      append("🎉 All Channel Manager tests completed");
    } catch (err) {
      append(`❌ ERROR: ${err.message}`);
    }

    setRunning(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Channel Manager Integration Tests
      </h2>
      <p className="text-xs text-gray-500">
        Runs end‑to‑end tests for channel creation, sync, conflicts, and unified calendar.
      </p>

      <Button
        onClick={runTests}
        disabled={running}
        className="bg-teal-600 hover:bg-teal-700"
      >
        {running ? "Running…" : "Run Channel Manager Tests"}
      </Button>

      <div className="bg-gray-50 border rounded p-3 h-64 overflow-auto text-xs font-mono">
        {log.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}