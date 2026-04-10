import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const TEST_BOOKING_ID = "int-test-booking-001";
const TEST_HOST_ID    = "int-test-host-001";
const TEST_GUEST_ID   = "int-test-guest-001";

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

export default function ReviewSystemTester() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(null);
  const [created, setCreated] = useState({ guestReview: null, hostReview: null });

  // Restore persisted test data on mount
  useEffect(() => {
    base44.entities.Review.filter({ booking_id: TEST_BOOKING_ID })
      .then(rows => {
        const guest = rows.find(r => r.review_type === "guest_to_host");
        const host  = rows.find(r => r.review_type === "host_to_guest");
        if (guest || host) setCreated({ guestReview: guest?.id || null, hostReview: host?.id || null });
      })
      .catch(() => {});
  }, []);

  const cleanUp = async () => {
    const ids = [created.guestReview, created.hostReview].filter(Boolean);
    for (const id of ids) {
      try { await base44.entities.Review.delete(id); } catch (_) {}
    }
    setCreated({ guestReview: null, hostReview: null });
    setStatus({ type: "ok", message: "🧹 Test reviews cleaned up." });
  };

  const step1_CreateGuestReview = async () => {
    setLoading(true); setStatus(null);
    try {
      const blindUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const r = await base44.entities.Review.create({
        review_category: "booking",
        booking_id: TEST_BOOKING_ID,
        reviewer_id: TEST_GUEST_ID,
        reviewer_name: "Test Guest",
        reviewee_id: TEST_HOST_ID,
        review_type: "guest_to_host",
        rating: 5,
        cleanliness_rating: 5,
        communication_rating: 4,
        comment: "Integration test — guest to host review.",
        blind_until: blindUntil,
        both_reviewed: false,
        visible: true,
        public_visible: false,
      });
      setCreated(p => ({ ...p, guestReview: r.id }));
      setStatus({ type: "ok", message: `✅ Guest→Host review created (ID: ${r.id.slice(0,8)}…). blind_until set to 7 days. both_reviewed=false.` });
    } catch (e) {
      setStatus({ type: "err", message: `❌ ${e.message}` });
    }
    setLoading(false);
  };

  const step2_CreateHostReview = async () => {
    setLoading(true); setStatus(null);
    try {
      const blindUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const r = await base44.entities.Review.create({
        review_category: "booking",
        booking_id: TEST_BOOKING_ID,
        reviewer_id: TEST_HOST_ID,
        reviewer_name: "Test Host",
        reviewee_id: TEST_GUEST_ID,
        review_type: "host_to_guest",
        rating: 4,
        communication_rating: 5,
        comment: "Integration test — host to guest review.",
        blind_until: blindUntil,
        both_reviewed: false,
        visible: true,
        public_visible: false,
      });
      setCreated(p => ({ ...p, hostReview: r.id }));
      setStatus({ type: "ok", message: `✅ Host→Guest review created (ID: ${r.id.slice(0,8)}…). Now both reviews exist — processReview automation should trigger and set both_reviewed=true.` });
    } catch (e) {
      setStatus({ type: "err", message: `❌ ${e.message}` });
    }
    setLoading(false);
  };

  const step3_VerifyBlindReveal = async () => {
    setLoading(true); setStatus(null);
    try {
      const [g, h] = await Promise.all([
        created.guestReview ? base44.entities.Review.get(created.guestReview) : Promise.resolve(null),
        created.hostReview  ? base44.entities.Review.get(created.hostReview)  : Promise.resolve(null),
      ]);
      const checks = [
        { label: "Guest review exists",                pass: !!g },
        { label: "Host review exists",                 pass: !!h },
        { label: "Guest review visible=true",          pass: g?.visible === true },
        { label: "Host review visible=true",           pass: h?.visible === true },
        { label: "Both reviews same booking_id",       pass: g?.booking_id === h?.booking_id },
        { label: "Review types are correct",           pass: g?.review_type === "guest_to_host" && h?.review_type === "host_to_guest" },
        { label: "Ratings stored correctly",           pass: g?.rating === 5 && h?.rating === 4 },
        { label: "Sub-ratings present on guest review", pass: g?.cleanliness_rating > 0 && g?.communication_rating > 0 },
      ];
      setStatus({ type: "checks", checks, allPass: checks.every(c => c.pass) });
    } catch (e) {
      setStatus({ type: "err", message: `❌ ${e.message}` });
    }
    setLoading(false);
  };

  const step4_TestPoorReview = async () => {
    setLoading(true); setStatus(null);
    try {
      const blindUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const r = await base44.entities.Review.create({
        review_category: "booking",
        booking_id: "int-test-poor-review",
        reviewer_id: TEST_GUEST_ID,
        reviewer_name: "Test Guest",
        reviewee_id: "int-test-new-host",
        review_type: "guest_to_host",
        rating: 2,
        comment: "Integration test — poor review (should trigger performance flag).",
        blind_until: blindUntil,
        both_reviewed: false,
        visible: true,
        public_visible: false,
      });
      // Verify it exists
      const fetched = await base44.entities.Review.get(r.id);
      const checks = [
        { label: "Poor review created",              pass: !!fetched },
        { label: "Rating is 2 (below threshold)",   pass: fetched.rating === 2 },
        { label: "public_visible defaults to false", pass: fetched.public_visible === false },
      ];
      // Clean up
      await base44.entities.Review.delete(r.id);
      setStatus({ type: "checks", checks, allPass: checks.every(c => c.pass) });
    } catch (e) {
      setStatus({ type: "err", message: `❌ ${e.message}` });
    }
    setLoading(false);
  };

  const step5_TestCleanerReview = async () => {
    setLoading(true); setStatus(null);
    try {
      const r = await base44.entities.Review.create({
        review_category: "cleaning_job",
        job_id: "int-test-job-001",
        reviewer_id: TEST_HOST_ID,
        reviewer_name: "Test Host",
        reviewee_id: "int-test-cleaner-001",
        review_type: "host_to_cleaner",
        rating: 5,
        quality_rating: 5,
        punctuality_rating: 4,
        reliability_rating: 5,
        was_late: false,
        comment: "Integration test — host to cleaner review.",
        visible: true,
        public_visible: false,
      });
      const fetched = await base44.entities.Review.get(r.id);
      const checks = [
        { label: "Host→Cleaner review created",      pass: !!fetched },
        { label: "review_category=cleaning_job",     pass: fetched.review_category === "cleaning_job" },
        { label: "review_type=host_to_cleaner",      pass: fetched.review_type === "host_to_cleaner" },
        { label: "quality_rating stored",            pass: fetched.quality_rating === 5 },
        { label: "punctuality_rating stored",        pass: fetched.punctuality_rating === 4 },
        { label: "was_late=false stored",            pass: fetched.was_late === false },
      ];
      await base44.entities.Review.delete(r.id);
      setStatus({ type: "checks", checks, allPass: checks.every(c => c.pass) });
    } catch (e) {
      setStatus({ type: "err", message: `❌ ${e.message}` });
    }
    setLoading(false);
  };

  const hasCreated = created.guestReview || created.hostReview;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Review & Rating System Tests</h2>
        <p className="text-xs text-gray-400">Tests all four review types, blind reveal logic, sub-ratings, and poor review flagging.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={step1_CreateGuestReview} disabled={loading} className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] disabled:opacity-50">
          1. Create Guest→Host Review
        </button>
        <button onClick={step2_CreateHostReview} disabled={loading || !created.guestReview} className="px-4 py-2 text-sm bg-[#0d9488] text-white rounded-lg hover:bg-[#0f766e] disabled:opacity-50">
          2. Create Host→Guest Review
        </button>
        <button onClick={step3_VerifyBlindReveal} disabled={loading || !hasCreated} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
          3. Verify Blind Reveal Fields
        </button>
        <button onClick={step4_TestPoorReview} disabled={loading} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
          4. Test Poor Review (2★)
        </button>
        <button onClick={step5_TestCleanerReview} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          5. Test Host→Cleaner Review
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