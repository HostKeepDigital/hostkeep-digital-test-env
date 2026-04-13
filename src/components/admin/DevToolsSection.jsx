import { useState } from "react";
import { base44 } from "@/api/base44Client";
import IntegrationTestsTab from "@/components/admin/IntegrationTestsTab";
import SubscriptionTester from "@/components/devtools/SubscriptionTester";
import BetaExitPlanner from "@/components/devtools/BetaExitPlanner";
import BalancePaymentTester from "@/components/devtools/BalancePaymentTester";
import ChannelManagerIntegrationTester from "@/components/devtools/ChannelManagerIntegrationTester";

function FoundingFlowTester() {
  const [status,  setStatus ] = useState(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(() => {
    const saved = localStorage.getItem("devtools_founding_test");
    return saved ? JSON.parse(saved) : null;
  });

  const TEST_EMAIL    = "devtest-founding@hostkeep-test.com";
  const TEST_POSTCODE = "TR1 1AA";

  const createTestMember = async () => {
    setLoading(true); setStatus(null); setCreated(null);
    try {
      const existing = await base44.entities.FoundingMember.filter({ email: TEST_EMAIL });
      for (const m of existing) await base44.entities.FoundingMember.delete(m.id);
      const member = await base44.entities.FoundingMember.create({
        full_name: "Dev Test Host", email: TEST_EMAIL, role: "host",
        postcode: TEST_POSTCODE, approval_status: "pending", signup_timestamp: new Date().toISOString(),
      });
      const createdData = { memberId: member.id };
      setCreated(createdData);
      localStorage.setItem("devtools_founding_test", JSON.stringify(createdData));
      setStatus({ type: "ok", message: `✅ Test member created (ID: ${member.id.slice(0,8)}...). Check Onboarding tab — should appear in Pending Applications.` });
    } catch (e) { setStatus({ type: "err", message: `❌ Create failed: ${e.message}` }); }
    setLoading(false);
  };

  const checkAppearsInPending = async () => {
    setLoading(true);
    try {
      const members = await base44.entities.FoundingMember.filter({ email: TEST_EMAIL, approval_status: "pending" });
      if (members.length > 0) {
        setStatus({ type: "ok", message: `✅ Member found in Pending (${members.length} record).` });
      } else {
        setStatus({ type: "err", message: `❌ Member NOT found in Pending.` });
      }
    } catch (e) { setStatus({ type: "err", message: `❌ Check failed: ${e.message}` }); }
    setLoading(false);
  };

  const cleanUp = async () => {
    setLoading(true);
    try {
      const existing = await base44.entities.FoundingMember.filter({ email: TEST_EMAIL });
      for (const m of existing) await base44.entities.FoundingMember.delete(m.id);
      setCreated(null);
      localStorage.removeItem("devtools_founding_test");
      setStatus({ type: "ok", message: "🧹 Test member cleaned up." });
    } catch (e) { setStatus({ type: "err", message: `❌ Clean-up failed: ${e.message}` }); }
    setLoading(false);
  };

  const simulateApproval = async () => {
    setLoading(true);
    try {
      const members = await base44.entities.FoundingMember.filter({ email: TEST_EMAIL });
      if (!members.length) { setStatus({ type: "err", message: "❌ No test member found. Run step 1 first." }); setLoading(false); return; }
      await base44.entities.FoundingMember.update(members[0].id, { approval_status: "invited" });
      const createdData = { memberId: members[0].id };
      setCreated(createdData);
      localStorage.setItem("devtools_founding_test", JSON.stringify(createdData));
      setStatus({ type: "ok", message: `✅ Test member promoted to 'invited'.` });
    } catch (e) { setStatus({ type: "err", message: `❌ Approval simulation failed: ${e.message}` }); }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Founding Flow Tester</h2>
        <p className="text-xs text-gray-400">Verifies the signup → pending → approval pipeline.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={createTestMember} disabled={loading} className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] disabled:opacity-50">{loading ? "Working..." : "1. Create Test Member"}</button>
        <button onClick={checkAppearsInPending} disabled={loading || !created} className="px-4 py-2 text-sm bg-[#0d9488] text-white rounded-lg hover:bg-[#0f766e] disabled:opacity-50">{loading ? "Working..." : "2. Verify Appears in Pending"}</button>
        <button onClick={simulateApproval} disabled={loading || !created} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">{loading ? "Working..." : "3. Simulate Admin Approval"}</button>
        {created && <button onClick={cleanUp} disabled={loading} className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">{loading ? "Working..." : "4. Clean Up"}</button>}
      </div>
      {status && <p className={`text-sm rounded-lg px-4 py-3 ${status.type === "ok" ? "bg-gray-50 text-gray-700" : "bg-red-50 text-red-500"}`}>{status.message}</p>}
    </div>
  );
}

function PropertyCreationTester({ members }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState(null);
  const [hostId, setHostId] = useState("");
  const hosts = members.filter(m => m.role === "host" && ["invited", "password_protected", "awaiting_document_verification", "approved"].includes(m.approval_status));

  const createTestProperty = async () => {
    if (!hostId) { setStatus({ type: "err", message: "❌ Select a host first." }); return; }
    setLoading(true); setStatus(null); setCreatedId(null);
    try {
      const prop = await base44.entities.Property.create({
        owner_id: hostId, title: "DEV TEST — Demo Property", property_type: "cottage",
        postcode: "TR1 1AA", postcode_area: "TR", county: "Cornwall", country: "England",
        location: { street: "1 Test Street" }, nightly_rate: 100, bedrooms: 2,
        bathrooms: 1, guest_capacity: 4, description: "Automated test property. Safe to delete.", status: "draft",
      });
      setCreatedId(prop.id);
      setStatus({ type: "ok", message: `✅ Property created (ID: ${prop.id.slice(0,8)}...) with status=draft.` });
    } catch (e) { setStatus({ type: "err", message: `❌ Create failed: ${e.message}` }); }
    setLoading(false);
  };

  const verifyProperty = async () => {
    if (!createdId) return;
    setLoading(true);
    try {
      const prop = await base44.entities.Property.get(createdId);
      const checks = [
        { label: "Status is draft", pass: prop.status === "draft" },
        { label: "Postcode set", pass: !!prop.postcode },
        { label: "Street address set", pass: !!prop.location?.street },
        { label: "Owner ID matches host", pass: prop.owner_id === hostId },
        { label: "Nightly rate > 0", pass: prop.nightly_rate > 0 },
      ];
      setStatus({ type: "checks", checks, allPass: checks.every(c => c.pass) });
    } catch (e) { setStatus({ type: "err", message: `❌ Verify failed: ${e.message}` }); }
    setLoading(false);
  };

  const cleanUp = async () => {
    if (!createdId) return;
    setLoading(true);
    try {
      await base44.entities.Property.delete(createdId);
      setCreatedId(null);
      setStatus({ type: "ok", message: "🧹 Test property deleted." });
    } catch (e) { setStatus({ type: "err", message: `❌ Clean-up failed: ${e.message}` }); }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Property Creation Tester</h2>
        <p className="text-xs text-gray-400">Verifies a property can be created for a host with the correct fields.</p>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Select an approved host</p>
        <select value={hostId} onChange={e => { setHostId(e.target.value); setStatus(null); }} className="w-full border rounded-md p-2 text-sm">
          <option value="">— Select host —</option>
          {hosts.length === 0 && <option disabled>No approved hosts found</option>}
          {hosts.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.email})</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={createTestProperty} disabled={loading || !hostId} className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] disabled:opacity-50">{loading ? "Working..." : "1. Create Test Property"}</button>
        <button onClick={verifyProperty} disabled={loading || !createdId} className="px-4 py-2 text-sm bg-[#0d9488] text-white rounded-lg hover:bg-[#0f766e] disabled:opacity-50">{loading ? "Working..." : "2. Verify Fields"}</button>
        {createdId && <button onClick={cleanUp} disabled={loading} className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">{loading ? "Working..." : "3. Clean Up"}</button>}
      </div>
      {status?.type === "ok" && <p className="text-sm bg-gray-50 text-gray-700 rounded-lg px-4 py-3">{status.message}</p>}
      {status?.type === "err" && <p className="text-sm bg-red-50 text-red-500 rounded-lg px-4 py-3">{status.message}</p>}
      {status?.type === "checks" && (
        <div className="space-y-2">
          {status.checks.map((c, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-sm text-gray-700">{c.label}</span>
              <span className={`text-sm font-medium ${c.pass ? "text-green-600" : "text-red-500"}`}>{c.pass ? "✅ Pass" : "❌ Fail"}</span>
            </div>
          ))}
          <div className={`px-4 py-3 rounded-lg text-sm font-medium ${status.allPass ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
            {status.allPass ? "✅ Property ready for demo." : "❌ Some fields missing — check CreateProperty flow."}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarRenderTester({ members }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hostId, setHostId] = useState("");
  const [createdPropertyId, setCreatedPropertyId] = useState(null);
  const [createdBookingId, setCreatedBookingId] = useState(null);
  const [createdJobId, setCreatedJobId] = useState(null);

  const hosts = members.filter(m => m.role === "host" && ["invited", "password_protected", "awaiting_document_verification", "approved"].includes(m.approval_status));
  const futureDate = (d) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString().split("T")[0]; };

  const createTestData = async () => {
    if (!hostId) { setStatus({ type: "err", message: "❌ Select a host first." }); return; }
    setLoading(true); setStatus(null);
    setCreatedPropertyId(null); setCreatedBookingId(null); setCreatedJobId(null);
    try {
      const prop = await base44.entities.Property.create({
        owner_id: hostId, title: "DEV TEST — Calendar Test Property", property_type: "cottage",
        postcode: "TR1 1AA", postcode_area: "TR", county: "Cornwall", country: "England",
        location: { street: "1 Calendar Test Lane" }, nightly_rate: 150, guest_capacity: 4,
        bedrooms: 2, bathrooms: 1, status: "published",
      });
      setCreatedPropertyId(prop.id);
      const booking = await base44.entities.Booking.create({
        property_id: prop.id, host_id: hostId, guest_id: "test-guest-calendar",
        guest_name: "Demo Guest", guest_email: "demo@hostkeep-test.com",
        check_in: futureDate(3), check_out: futureDate(7), booking_status: "confirmed",
        payment_status: "paid", total_amount: 600, nightly_rate: 150, nights: 4,
      });
      setCreatedBookingId(booking.id);
      const job = await base44.entities.CleaningJob.create({
        property_id: prop.id, booking_id: booking.id, host_id: hostId,
        cleaner_id: "test-cleaner-calendar", cleaner_user_id: "test-cleaner-calendar",
        scheduled_date: futureDate(7), scheduled_time: "11:00", status: "accepted",
        job_type: "manual", cleaner_price: 80,
      });
      setCreatedJobId(job.id);
      setStatus({ type: "ok", message: `✅ Test data created — Property, Booking (check-in ${futureDate(3)}), Cleaning job (${futureDate(7)}).` });
    } catch (e) { setStatus({ type: "err", message: `❌ Create failed: ${e.message}` }); }
    setLoading(false);
  };

  const verifyCalendarData = async () => {
    if (!createdPropertyId) return;
    setLoading(true);
    try {
      const [bookings, jobs] = await Promise.all([
        base44.entities.Booking.filter({ property_id: createdPropertyId }),
        base44.entities.CleaningJob.filter({ property_id: createdPropertyId }),
      ]);
      const checks = [
        { label: "Test booking exists on property", pass: bookings.some(b => b.id === createdBookingId) },
        { label: "Booking status is confirmed", pass: bookings.find(b => b.id === createdBookingId)?.booking_status === "confirmed" },
        { label: "Cleaning job exists on property", pass: jobs.some(j => j.id === createdJobId) },
        { label: "Cleaning job links to booking", pass: jobs.find(j => j.id === createdJobId)?.booking_id === createdBookingId },
        { label: "Cleaning job status is accepted", pass: jobs.find(j => j.id === createdJobId)?.status === "accepted" },
      ];
      const allPass = checks.every(c => c.pass);
      setStatus({ type: "checks", checks, allPass, propertyId: createdPropertyId });
    } catch (e) { setStatus({ type: "err", message: `❌ Verify failed: ${e.message}` }); }
    setLoading(false);
  };

  const cleanUp = async () => {
    setLoading(true);
    try {
      if (createdJobId) await base44.entities.CleaningJob.delete(createdJobId);
      if (createdBookingId) await base44.entities.Booking.delete(createdBookingId);
      if (createdPropertyId) await base44.entities.Property.delete(createdPropertyId);
      setCreatedPropertyId(null); setCreatedBookingId(null); setCreatedJobId(null);
      setStatus({ type: "ok", message: "🧹 All test data cleaned up." });
    } catch (e) { setStatus({ type: "err", message: `❌ Clean-up failed: ${e.message}` }); }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Calendar Render Tester</h2>
        <p className="text-xs text-gray-400">Creates a test property, confirmed booking, and linked cleaning job.</p>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Select an approved host</p>
        <select value={hostId} onChange={e => { setHostId(e.target.value); setStatus(null); }} className="w-full border rounded-md p-2 text-sm">
          <option value="">— Select host —</option>
          {hosts.length === 0 && <option disabled>No approved hosts found</option>}
          {hosts.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.email})</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={createTestData} disabled={loading || !hostId} className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] disabled:opacity-50">{loading ? "Working..." : "1. Create Test Data"}</button>
        <button onClick={verifyCalendarData} disabled={loading || !createdPropertyId} className="px-4 py-2 text-sm bg-[#0d9488] text-white rounded-lg hover:bg-[#0f766e] disabled:opacity-50">{loading ? "Working..." : "2. Verify Calendar Data"}</button>
        {(createdPropertyId || createdBookingId || createdJobId) && <button onClick={cleanUp} disabled={loading} className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">{loading ? "Working..." : "3. Clean Up"}</button>}
      </div>
      {status?.type === "ok" && <p className="text-sm bg-gray-50 text-gray-700 rounded-lg px-4 py-3">{status.message}</p>}
      {status?.type === "err" && <p className="text-sm bg-red-50 text-red-500 rounded-lg px-4 py-3">{status.message}</p>}
      {status?.type === "checks" && (
        <div className="space-y-2">
          {status.checks.map((c, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-sm text-gray-700">{c.label}</span>
              <span className={`text-sm font-medium ${c.pass ? "text-green-600" : "text-red-500"}`}>{c.pass ? "✅ Pass" : "❌ Fail"}</span>
            </div>
          ))}
          <div className={`px-4 py-3 rounded-lg text-sm font-medium ${status.allPass ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
            {status.allPass ? `✅ Data ready. Go to Host Dashboard → select property → verify calendar.` : "❌ Data issues found."}
          </div>
        </div>
      )}
    </div>
  );
}

function DeleteAccountTester() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const TEST_EMAIL = "devtest-founding@hostkeep-test.com";

  const runDeleteTest = async () => {
    setLoading(true); setStatus(null);
    try {
      const [preMembers, preCreds] = await Promise.all([
        base44.entities.FoundingMember.filter({ email: TEST_EMAIL }),
        base44.entities.UserCredentials.filter({ email: TEST_EMAIL }),
      ]);
      if (!preMembers.length && !preCreds.length) {
        setStatus({ type: "err", message: `❌ No test account found for ${TEST_EMAIL}. Run the Founding Flow Tester first.` });
        setLoading(false); return;
      }
      const result = await base44.functions.invoke("deleteAccount", { admin_delete_email: TEST_EMAIL });
      if (!result?.data?.success) {
        setStatus({ type: "err", message: `❌ deleteAccount returned failure: ${JSON.stringify(result?.data)}` });
        setLoading(false); return;
      }
      const [members, creds] = await Promise.all([
        base44.entities.FoundingMember.filter({ email: TEST_EMAIL }),
        base44.entities.UserCredentials.filter({ email: TEST_EMAIL }),
      ]);
      const deleteChecks = [
        { label: "FoundingMember record deleted", pass: members.length === 0 },
        { label: "UserCredentials record deleted", pass: creds.length === 0 },
      ];
      setStatus({ type: "checks", checks: deleteChecks, allPass: deleteChecks.every(c => c.pass) });
    } catch (e) { setStatus({ type: "err", message: `❌ Delete test failed: ${e.message}` }); }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Delete Account Tester</h2>
        <p className="text-xs text-gray-400">Uses the test account from the Founding Flow Tester. Calls <code className="bg-gray-100 px-1 rounded">deleteAccount</code> and verifies records are removed.</p>
      </div>
      <button onClick={runDeleteTest} disabled={loading} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">{loading ? "Working..." : "Delete Test Account + Verify"}</button>
      {status?.type === "err" && <p className="text-sm bg-red-50 text-red-500 rounded-lg px-4 py-3">{status.message}</p>}
      {status?.type === "checks" && (
        <div className="space-y-2">
          {status.checks.map((c, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-sm text-gray-700">{c.label}</span>
              <span className={`text-sm font-medium ${c.pass ? "text-green-600" : "text-red-500"}`}>{c.pass ? "✅ Pass" : "❌ Fail"}</span>
            </div>
          ))}
          <div className={`px-4 py-3 rounded-lg text-sm font-medium ${status.allPass ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
            {status.allPass ? "✅ Account fully deleted." : "❌ Some records remain."}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DevToolsSection({ members, user }) {
  const [devTab, setDevTab] = useState("integration");
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="flex border-b border-gray-200">
        {[{ id: "integration", label: "Integration Tests" }, { id: "devtools", label: "Dev Tools" }].map(({ id, label }) => (
          <button key={id} onClick={() => setDevTab(id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${devTab === id ? "border-[#0d9488] text-[#0d9488]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {devTab === "integration" && <IntegrationTestsTab />}

      {devTab === "devtools" && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <p className="text-sm text-amber-700 font-semibold mb-1">⚠️ Dev Tools — Admin only</p>
            <p className="text-xs text-amber-600">Run these in order when setting up a fresh environment. Test data is written to the live database — always use Clean Up after each test run.</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#0d9488] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <div><h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Demo Integration Tests</h2><p className="text-xs text-gray-400 mt-0.5">Run first. Creates test founding members, a test property, and validates calendar rendering.</p></div>
            </div>
            <FoundingFlowTester /><PropertyCreationTester members={members} /><CalendarRenderTester members={members} />
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#1E3A5F] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <div><h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Subscription &amp; Founding Member Tests</h2><p className="text-xs text-gray-400 mt-0.5">Run after Step 1.</p></div>
            </div>
            <SubscriptionTester />
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <div><h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Beta Management</h2></div>
            </div>
            <BetaExitPlanner />
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-orange-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              <div><h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Balance Payment &amp; Failed Payment Tests</h2></div>
            </div>
            <BalancePaymentTester />
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
              <div><h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Channel Manager Tests</h2></div>
            </div>
            <ChannelManagerIntegrationTester hostId={user?.id} />
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-red-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">6</span>
              <div><h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Account Management Tests</h2></div>
            </div>
            <DeleteAccountTester />
          </div>
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl px-5 py-6 text-center">
            <p className="text-xs text-gray-400">Cleaner System Tests will appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
}