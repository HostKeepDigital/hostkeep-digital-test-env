import { useState } from "react";
import { base44 } from "@/api/base44Client";

function Result({ status }) {
  if (!status) return null;
  if (status.type === "ok") return <p className="text-sm bg-gray-50 text-gray-700 rounded-lg px-4 py-3">{status.message}</p>;
  if (status.type === "err") return <p className="text-sm bg-red-50 text-red-500 rounded-lg px-4 py-3">{status.message}</p>;
  if (status.type === "info") return <p className="text-sm bg-blue-50 text-blue-700 rounded-lg px-4 py-3">{status.message}</p>;
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

const BASE_FIELDS = {
  host_id: "regression-test",
  guest_id: "regression-test",
  guest_name: "Deposit Refund Test",
  guest_email: "regression@hostkeepdigital-test.invalid",
  property_id: "regression-test-property-id",
};

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function DepositRefundsTester() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [created, setCreated] = useState({});

  const step1_CreateBookings = async () => {
    setLoading(true); setStatus(null);
    try {
      const [bookingA, bookingB, bookingC, bookingD] = await Promise.all([
        // A — frozen
        base44.entities.Booking.create({
          ...BASE_FIELDS,
          booking_status: "completed",
          deposit_status: "held",
          deposit_frozen: true,
          check_out: daysAgo(3),
          stripe_deposit_intent_id: "pi_regression_frozen",
          total_amount: 100,
        }),
        // B — no intent
        base44.entities.Booking.create({
          ...BASE_FIELDS,
          booking_status: "completed",
          deposit_status: "held",
          deposit_frozen: false,
          check_out: daysAgo(3),
          total_amount: 100,
        }),
        // C — future checkout
        base44.entities.Booking.create({
          ...BASE_FIELDS,
          booking_status: "completed",
          deposit_status: "held",
          deposit_frozen: false,
          check_out: tomorrow(),
          stripe_deposit_intent_id: "pi_regression_future",
          total_amount: 100,
        }),
        // D — eligible with fake Stripe intent
        base44.entities.Booking.create({
          ...BASE_FIELDS,
          booking_status: "completed",
          deposit_status: "held",
          deposit_frozen: false,
          check_out: daysAgo(3),
          stripe_deposit_intent_id: "pi_regression_fake_should_error",
          total_amount: 100,
        }),
      ]);

      const ids = { A: bookingA.id, B: bookingB.id, C: bookingC.id, D: bookingD.id };
      setCreated(ids);
      setStatus({ type: "ok", message: "✅ 4 test bookings created — frozen, missing intent, future checkout, eligible (fake Stripe ID)" });
    } catch (e) {
      setStatus({ type: "err", message: `❌ ${e.message}` });
    }
    setLoading(false);
  };

  const step2_RunFunction = async () => {
    setLoading(true); setStatus(null);
    try {
      const res = await base44.functions.invoke("processDepositRefunds", {});
      await new Promise(r => setTimeout(r, 1000));
      const d = res.data;
      if (!d.success) throw new Error(`Function returned success: false — ${JSON.stringify(d)}`);
      setStatus({
        type: "ok",
        message: `✅ Function ran successfully — processed: ${d.processed}, skipped: ${d.skipped}, errors: ${d.errors}, total: ${d.total}`,
      });
    } catch (e) {
      setStatus({ type: "err", message: `❌ ${e.message}` });
    }
    setLoading(false);
  };

  const step3_VerifyResults = async () => {
    setLoading(true); setStatus(null);
    try {
      if (!created.A) { setStatus({ type: "err", message: "❌ Run Step 1 first." }); setLoading(false); return; }

      const [rowsA, rowsB, rowsC, rowsD] = await Promise.all([
        base44.entities.Booking.filter({ id: created.A }),
        base44.entities.Booking.filter({ id: created.B }),
        base44.entities.Booking.filter({ id: created.C }),
        base44.entities.Booking.filter({ id: created.D }),
      ]);

      const a = rowsA[0];
      const b = rowsB[0];
      const c = rowsC[0];
      const d = rowsD[0];

      const checks = [
        {
          label: "Frozen booking: still 'held' (not refunded)",
          pass: a?.deposit_status === "held",
        },
        {
          label: "No intent booking: still 'held' (skipped)",
          pass: b?.deposit_status === "held",
        },
        {
          label: "Future checkout: still 'held' (48h not passed)",
          pass: c?.deposit_status === "held",
        },
        {
          label: "Eligible with fake intent: function did not crash (held or refunding)",
          pass: d?.deposit_status === "held" || d?.deposit_status === "refunding",
        },
      ];

      setStatus({ type: "checks", checks, allPass: checks.every(c => c.pass) });
    } catch (e) {
      setStatus({ type: "err", message: `❌ ${e.message}` });
    }
    setLoading(false);
  };

  const step4_CleanUp = async () => {
    setLoading(true); setStatus(null);
    const failed = [];
    for (const [key, id] of Object.entries(created)) {
      try {
        await base44.entities.Booking.delete(id);
      } catch (_) {
        failed.push(key);
      }
    }
    setCreated({});
    if (failed.length === 0) {
      setStatus({ type: "ok", message: "✅ All test bookings deleted" });
    } else {
      setStatus({ type: "err", message: `❌ Failed to delete bookings: ${failed.join(", ")}` });
    }
    setLoading(false);
  };

  const hasCreated = Object.keys(created).length > 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Deposit Refunds Tests</h2>
        <p className="text-xs text-gray-400">Tests the processDepositRefunds scheduled function across 4 scenarios: frozen deposit, missing Stripe intent, future checkout, and eligible booking with a fake Stripe ID.</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
        ⏱ Step 2 invokes a live backend function and calls Stripe (sandbox). Allow 1–2 seconds before running Step 3.
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={step1_CreateBookings}
          disabled={loading}
          className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] disabled:opacity-50"
        >
          Step 1 — Create Test Bookings
        </button>
        <button
          onClick={step2_RunFunction}
          disabled={loading || !hasCreated}
          className="px-4 py-2 text-sm bg-[#0d9488] text-white rounded-lg hover:bg-[#0f766e] disabled:opacity-50"
        >
          Step 2 — Run processDepositRefunds ⏱
        </button>
        <button
          onClick={step3_VerifyResults}
          disabled={loading || !hasCreated}
          className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
        >
          Step 3 — Verify Results
        </button>
        <button
          onClick={step4_CleanUp}
          disabled={loading || !hasCreated}
          className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
        >
          Step 4 — Clean Up
        </button>
      </div>

      <Result status={status} />
    </div>
  );
}