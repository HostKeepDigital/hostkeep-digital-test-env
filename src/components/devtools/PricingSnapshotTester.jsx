import { useState } from "react";
import { base44 } from "@/api/base44Client";

function Result({ status }) {
  if (!status) return null;
  if (status.type === "ok")  return <p className="text-sm bg-gray-50 text-gray-700 rounded-lg px-4 py-3">{status.message}</p>;
  if (status.type === "err") return <p className="text-sm bg-red-50 text-red-500 rounded-lg px-4 py-3">{status.message}</p>;
  if (status.type === "checks") return (
    <div className="space-y-2">
      {status.checks.map((c, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-50 border border-gray-100">
          <span className="text-sm text-gray-700">{c.label}</span>
          <span className={`text-sm font-medium ${c.pass ? "text-green-600" : "text-red-500"}`}>{c.pass ? "✅ Pass" : "❌ Fail"}</span>
        </div>
      ))}
      <div className={`px-4 py-3 rounded-lg text-sm font-medium ${status.allPass ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
        {status.allPass ? "✅ All checks passed" : "❌ Some checks failed"}
      </div>
    </div>
  );
}

const CHECK_IN = (() => {
  const d = new Date(); d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
})();
const CHECK_OUT = (() => {
  const d = new Date(); d.setDate(d.getDate() + 34);
  return d.toISOString().split("T")[0];
})();

export default function PricingSnapshotTester() {
  const [loading, setLoading]   = useState(false);
  const [status, setStatus]     = useState(null);
  const [created, setCreated]   = useState({ propertyId: null, bookingId: null, snapshotId: null });

  const step1_CreateBookingAndConfirm = async () => {
    setLoading(true); setStatus(null);
    try {
      // Create minimal property
      const prop = await base44.entities.Property.create({
        owner_id:      "int-test-snapshot-host",
        title:         "INT TEST — Snapshot Property",
        property_type: "cottage",
        postcode:      "TR1 2AA",
        postcode_area: "TR",
        postcode_district: "TR1",
        town:          "Truro",
        county:        "Cornwall",
        country:       "England",
        nightly_rate:  120,
        cleaning_fee:  30,
        bedrooms:      2,
        bathrooms:     1,
        guest_capacity: 4,
        amenities:     ["WiFi", "Parking", "Garden"],
        pets_allowed:  false,
        status:        "draft",
        average_rating: 4.5,
      });
      setCreated(p => ({ ...p, propertyId: prop.id }));

      // Create booking in awaiting_decision then update to confirmed
      const booking = await base44.entities.Booking.create({
        property_id:    prop.id,
        host_id:        "int-test-snapshot-host",
        guest_name:     "INT Test Guest",
        guest_email:    "int-snapshot@hostkeep-test.com",
        check_in:       CHECK_IN,
        check_out:      CHECK_OUT,
        nightly_rate:   120,
        nights:         4,
        total_amount:   510,
        cleaning_fee:   30,
        guests_count:   2,
        booking_status: "awaiting_decision",
        payment_status: "pending",
      });
      setCreated(p => ({ ...p, bookingId: booking.id }));

      // Update to confirmed — this should trigger the automation
      await base44.entities.Booking.update(booking.id, { booking_status: "confirmed" });

      setStatus({ type: "ok", message: `✅ Property (${prop.id.slice(0,8)}…) and Booking (${booking.id.slice(0,8)}…) created. Booking confirmed → recordPricingSnapshot automation should have fired. Wait 5s then run Step 2.` });
    } catch (e) {
      setStatus({ type: "err", message: `❌ ${e.message}` });
    }
    setLoading(false);
  };

  const step2_VerifySnapshot = async () => {
    setLoading(true); setStatus(null);
    try {
      if (!created.bookingId) { setStatus({ type: "err", message: "❌ Run Step 1 first." }); setLoading(false); return; }

      // Allow a moment for the automation to fire
      await new Promise(r => setTimeout(r, 2000));

      const snaps = await base44.entities.PricingSnapshot.filter({ booking_id: created.bookingId });
      const snap  = snaps[0] || null;
      if (snap) setCreated(p => ({ ...p, snapshotId: snap.id }));

      const checks = [
        { label: "Snapshot created for booking",        pass: !!snap },
        { label: "nightly_rate=120",                   pass: snap?.nightly_rate === 120 },
        { label: "nights=4",                           pass: snap?.nights === 4 },
        { label: "postcode captured",                  pass: !!snap?.postcode },
        { label: "postcode_area=TR",                   pass: snap?.postcode_area === "TR" },
        { label: "county=Cornwall",                    pass: snap?.county === "Cornwall" },
        { label: "property_type=cottage",              pass: snap?.property_type === "cottage" },
        { label: "bedrooms=2",                         pass: snap?.bedrooms === 2 },
        { label: "check_in_month present",             pass: snap?.check_in_month > 0 },
        { label: "check_in_day_of_week present",       pass: snap?.check_in_day_of_week != null },
        { label: "amenities_count=3",                  pass: snap?.amenities_count === 3 },
        { label: "average_rating=4.5",                 pass: snap?.average_rating === 4.5 },
        { label: "No duplicate snapshots",             pass: snaps.length === 1 },
      ];
      setStatus({ type: "checks", checks, allPass: checks.every(c => c.pass) });
    } catch (e) {
      setStatus({ type: "err", message: `❌ ${e.message}` });
    }
    setLoading(false);
  };

  const step3_TestNoDuplicate = async () => {
    setLoading(true); setStatus(null);
    try {
      if (!created.bookingId) { setStatus({ type: "err", message: "❌ Run Step 1 first." }); setLoading(false); return; }
      // Trigger update again — should NOT create a second snapshot
      await base44.entities.Booking.update(created.bookingId, { booking_status: "completed" });
      await new Promise(r => setTimeout(r, 2000));
      const snaps = await base44.entities.PricingSnapshot.filter({ booking_id: created.bookingId });
      const checks = [
        { label: "Only 1 snapshot exists (no duplicate)", pass: snaps.length === 1 },
      ];
      setStatus({ type: "checks", checks, allPass: checks.every(c => c.pass) });
    } catch (e) {
      setStatus({ type: "err", message: `❌ ${e.message}` });
    }
    setLoading(false);
  };

  const cleanUp = async () => {
    setLoading(true);
    try {
      if (created.snapshotId) await base44.entities.PricingSnapshot.delete(created.snapshotId);
      if (created.bookingId)  await base44.entities.Booking.delete(created.bookingId);
      if (created.propertyId) await base44.entities.Property.delete(created.propertyId);
      setCreated({ propertyId: null, bookingId: null, snapshotId: null });
      setStatus({ type: "ok", message: "🧹 All test data cleaned up." });
    } catch (e) {
      setStatus({ type: "err", message: `❌ Clean-up failed: ${e.message}` });
    }
    setLoading(false);
  };

  const hasCreated = created.propertyId || created.bookingId;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Pricing Snapshot Tests</h2>
        <p className="text-xs text-gray-400">Verifies that PricingSnapshot is correctly created when a booking is confirmed, with all property metadata fields captured. Also checks deduplication.</p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        <p className="text-xs text-blue-700">⏱ Step 2 waits 2s for the automation to fire. If the snapshot is not found, wait a few more seconds and retry Step 2.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={step1_CreateBookingAndConfirm} disabled={loading} className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] disabled:opacity-50">
          1. Create & Confirm Booking
        </button>
        <button onClick={step2_VerifySnapshot} disabled={loading || !created.bookingId} className="px-4 py-2 text-sm bg-[#0d9488] text-white rounded-lg hover:bg-[#0f766e] disabled:opacity-50">
          2. Verify Snapshot Fields
        </button>
        <button onClick={step3_TestNoDuplicate} disabled={loading || !created.bookingId} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
          3. Test No Duplicate
        </button>
        {hasCreated && (
          <button onClick={cleanUp} disabled={loading} className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">
            🧹 Clean Up
          </button>
        )}
      </div>

      <Result status={status} />
    </div>
  );
}