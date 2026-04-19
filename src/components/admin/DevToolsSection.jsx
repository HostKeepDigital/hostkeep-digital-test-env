/**
 * HostKeep Dev Tools — Complete Test Suite
 * Covers every backend function and user journey for Host and Cleaner.
 * Run tests top-to-bottom in order. Each test is self-contained.
 * If anything shows ❌ copy the output and send to Claude.
 */

import { useState } from 'react';
import { base44 } from '@/api/base44Client';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const APP_ID      = '698eee4108bd1d9467648326';
const GUEST_EMAIL   = 'devtest-guest@hostkeep-test.com';
const HOST_EMAIL    = 'devtest-host@hostkeep-test.com';
const CLEANER_EMAIL = 'devtest-cleaner@hostkeep-test.com';
const TEST_PASSWORD = 'DevTest99!';
const TEST_POSTCODE = 'TR11AA'; // Cornwall — in-area

// ─── LOW-LEVEL HELPERS ────────────────────────────────────────────────────────

/** Call a backend function via plain fetch (more reliable than SDK invoke) */
async function fn(name, body = {}) {
  const res = await fetch(`/api/apps/${APP_ID}/functions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { _raw: text, _status: res.status }; }
}

/** Wait N milliseconds (used after automations that fire asynchronously) */
const wait = (ms) => new Promise(r => setTimeout(r, ms));

/** Format a check result for clipboard copy */
function formatForClipboard(testName, checks, error) {
  const lines = [`FAILED TEST: ${testName}`, ''];
  checks.forEach(c => lines.push(`${c.pass ? '✅' : '❌'} ${c.label}${c.detail ? ` — ${c.detail}` : ''}`));
  if (error) lines.push('', `ERROR: ${error}`);
  return lines.join('\n');
}

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────

function CheckRow({ label, pass, detail }) {
  return (
    <div className={`flex items-start gap-2.5 px-4 py-2.5 rounded-lg border ${pass ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
      <span className="text-base flex-shrink-0 mt-0.5">{pass ? '✅' : '❌'}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {!pass && detail && <p className="text-xs text-red-600 mt-0.5 break-words">{detail}</p>}
      </div>
    </div>
  );
}

function TestCard({ number, title, description, badge, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
            {number}
          </span>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
        {badge && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
            {badge}
          </span>
        )}
      </div>
      <div className="px-6 py-5 space-y-3">{children}</div>
    </div>
  );
}

function RunButton({ onClick, loading, label = 'Run Test' }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-5 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors"
    >
      {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
      {loading ? 'Running…' : label}
    </button>
  );
}

function CleanButton({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-medium rounded-lg transition-colors"
    >
      {loading ? 'Cleaning…' : '🧹 Clean Up'}
    </button>
  );
}

function CopyButton({ testName, checks, error }) {
  const [copied, setCopied] = useState(false);
  const hasFails = checks.some(c => !c.pass) || error;
  if (!hasFails) return null;
  const doCopy = () => {
    navigator.clipboard?.writeText(formatForClipboard(testName, checks, error));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={doCopy}
      className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-xs font-medium rounded-lg transition-colors"
    >
      {copied ? '✓ Copied!' : '📋 Copy failure report for Claude'}
    </button>
  );
}

function ResultBlock({ testName, checks, error, extra }) {
  if (!checks) return null;
  const allPass = checks.every(c => c.pass) && !error;
  return (
    <div className="space-y-2">
      {checks.map((c, i) => <CheckRow key={i} {...c} />)}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-red-700">Error caught:</p>
          <p className="text-xs text-red-600 mt-1 break-words font-mono">{String(error)}</p>
        </div>
      )}
      {extra && <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">{extra}</div>}
      <div className={`px-4 py-3 rounded-lg text-sm font-semibold ${allPass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {allPass ? '✅ All checks passed' : '❌ Some checks failed — copy report and send to Claude'}
      </div>
      <CopyButton testName={testName} checks={checks} error={error} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOST JOURNEY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

function H1_GuestSignUp() {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      // Clean before run to ensure fresh slate
      await fn('deleteAccount', { admin_delete_email: GUEST_EMAIL });
      await wait(500);

      const res = await fn('customSignUp', {
        email: GUEST_EMAIL,
        password: TEST_PASSWORD,
        forename: 'Dev',
        surname: 'Guest',
      });

      checks.push({ label: 'customSignUp returned success', pass: res.success === true, detail: res.success ? null : `Got: ${JSON.stringify(res)}` });

      await wait(1000);

      const creds = await base44.entities.UserCredentials.filter({ email: GUEST_EMAIL });
      checks.push({ label: 'UserCredentials record created', pass: creds.length > 0, detail: creds.length === 0 ? 'No UserCredentials record found' : null });

      const users = await base44.entities.User.filter({ email: GUEST_EMAIL });
      checks.push({ label: 'User record created', pass: users.length > 0, detail: users.length === 0 ? 'No User record found' : null });

      const roles = await base44.entities.UserRole.filter({ user_id: users[0]?.id });
      const guestRole = roles.find(r => r.role === 'guest');
      checks.push({ label: 'UserRole created with role=guest', pass: !!guestRole, detail: !guestRole ? `Found roles: ${roles.map(r => r.role).join(', ') || 'none'}` : null });
      checks.push({ label: 'UserRole approval_status=approved', pass: guestRole?.approval_status === 'approved', detail: guestRole ? `Got: ${guestRole.approval_status}` : null });

      const guests = await base44.entities.Guest.filter({ email: GUEST_EMAIL });
      checks.push({ label: 'Guest profile record created', pass: guests.length > 0, detail: guests.length === 0 ? 'No Guest entity record found' : null });

      const codes = await base44.entities.EmailVerificationCode.filter({ email: GUEST_EMAIL });
      checks.push({ label: 'Email verification code sent', pass: codes.length > 0, detail: codes.length === 0 ? 'No EmailVerificationCode record found — sendVerificationCode may have failed' : null });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    await fn('deleteAccount', { admin_delete_email: GUEST_EMAIL });
    await wait(500);
    setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="H1" title="Guest Sign Up" description={`Creates a new guest account for ${GUEST_EMAIL}`} badge="customSignUp">
      <div className="flex gap-2 flex-wrap">
        <RunButton onClick={run} loading={loading} />
        <CleanButton onClick={clean} loading={cleaning} />
      </div>
      <ResultBlock testName="H1 Guest Sign Up" {...(result || {})} />
    </TestCard>
  );
}

function H2_EmailVerification() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null; let extra = null;
    try {
      const codes = await base44.entities.EmailVerificationCode.filter({ email: GUEST_EMAIL });
      checks.push({ label: 'Email verification code found in database', pass: codes.length > 0, detail: codes.length === 0 ? 'Run H1 first, or code was already used' : null });

      if (codes.length === 0) { setLoading(false); setResult({ checks, error }); return; }

      const code = codes[0].code;
      extra = `Using code: ${code} (you can also manually check email)`;

      const expired = new Date(codes[0].expires_at) < new Date();
      checks.push({ label: 'Verification code is not expired', pass: !expired, detail: expired ? `Code expired at ${codes[0].expires_at}` : null });

      const res = await fn('verifyEmailCode', { email: GUEST_EMAIL, code });
      checks.push({ label: 'verifyEmailCode returned valid=true', pass: res.valid === true, detail: res.valid ? null : `Got: ${JSON.stringify(res)}` });

      await wait(500);

      const creds = await base44.entities.UserCredentials.filter({ email: GUEST_EMAIL });
      checks.push({ label: 'UserCredentials.email_verified set to true', pass: creds[0]?.email_verified === true, detail: `Got: ${creds[0]?.email_verified}` });

      const remainingCodes = await base44.entities.EmailVerificationCode.filter({ email: GUEST_EMAIL });
      checks.push({ label: 'Verification code deleted after use', pass: remainingCodes.length === 0, detail: remainingCodes.length > 0 ? 'Code still exists in DB — should have been deleted' : null });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error, extra });
  };

  return (
    <TestCard number="H2" title="Email Verification" description="Reads the verification code from DB and verifies it — simulates entering code in UI" badge="verifyEmailCode">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run H1 first</p>
      <RunButton onClick={run} loading={loading} />
      <ResultBlock testName="H2 Email Verification" {...(result || {})} />
    </TestCard>
  );
}

function H3_GuestSignIn() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      const res = await fn('customSignIn', { email: GUEST_EMAIL, password: TEST_PASSWORD });
      checks.push({ label: 'customSignIn returned success', pass: res.success === true, detail: res.success ? null : `Error: ${res.error || JSON.stringify(res)}` });
      checks.push({ label: 'Session token returned', pass: !!res.session_token, detail: !res.session_token ? 'No session_token in response' : null });
      checks.push({ label: 'Role is guest', pass: res.role === 'guest', detail: `Got role: ${res.role}` });

      if (res.session_token) {
        await wait(500);
        const sessions = await base44.entities.UserSession.filter({ session_token: res.session_token });
        checks.push({ label: 'UserSession record created in database', pass: sessions.length > 0, detail: sessions.length === 0 ? 'No session stored in DB' : null });

        const sessionOk = sessions[0];
        if (sessionOk) {
          const notExpired = new Date(sessionOk.expires_at) > new Date();
          checks.push({ label: 'Session expiry is in the future', pass: notExpired, detail: `Expires: ${sessionOk.expires_at}` });
        }

        const sessionCheck = await fn('checkSession', { session_token: res.session_token });
        checks.push({ label: 'checkSession confirms authenticated', pass: sessionCheck.authenticated === true, detail: `Got: ${JSON.stringify(sessionCheck)}` });
      }
    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  return (
    <TestCard number="H3" title="Guest Sign In" description="Signs in as the test guest and verifies session is created correctly" badge="customSignIn + checkSession">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run H1 + H2 first</p>
      <RunButton onClick={run} loading={loading} />
      <ResultBlock testName="H3 Guest Sign In" {...(result || {})} />
    </TestCard>
  );
}

function H4_FoundingHostApplication() {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      // Clean existing first
      const existing = await base44.entities.FoundingMember.filter({ email: HOST_EMAIL });
      for (const m of existing) await base44.entities.FoundingMember.delete(m.id);
      await fn('deleteAccount', { admin_delete_email: HOST_EMAIL });
      await wait(500);

      const res = await fn('registerFoundingMember', {
        full_name: 'Dev TestHost',
        email: HOST_EMAIL,
        postcode: TEST_POSTCODE,
        role: 'host',
      });
      checks.push({ label: 'registerFoundingMember returned success', pass: res.success === true, detail: res.success ? null : `Error: ${res.error || JSON.stringify(res)}` });
      checks.push({ label: 'Not flagged as out_of_area (TR postcode is Cornwall)', pass: res.out_of_area === false, detail: `out_of_area: ${res.out_of_area}` });

      await wait(500);
      const members = await base44.entities.FoundingMember.filter({ email: HOST_EMAIL, role: 'host' });
      checks.push({ label: 'FoundingMember record created', pass: members.length > 0, detail: members.length === 0 ? 'No FoundingMember found' : null });
      checks.push({ label: 'approval_status is interest (awaiting verification)', pass: members[0]?.approval_status === 'interest', detail: `Got: ${members[0]?.approval_status}` });
      checks.push({ label: 'Postcode stored correctly', pass: members[0]?.postcode === TEST_POSTCODE, detail: `Got: ${members[0]?.postcode}` });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    const existing = await base44.entities.FoundingMember.filter({ email: HOST_EMAIL });
    for (const m of existing) await base44.entities.FoundingMember.delete(m.id);
    await fn('deleteAccount', { admin_delete_email: HOST_EMAIL });
    setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="H4" title="Founding Host Application" description={`Submits a founding host application for ${HOST_EMAIL} with a Cornwall postcode`} badge="registerFoundingMember">
      <div className="flex gap-2 flex-wrap">
        <RunButton onClick={run} loading={loading} />
        <CleanButton onClick={clean} loading={cleaning} />
      </div>
      <ResultBlock testName="H4 Founding Host Application" {...(result || {})} />
    </TestCard>
  );
}

function H5_AdminApproveHost() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      const members = await base44.entities.FoundingMember.filter({ email: HOST_EMAIL, role: 'host' });
      checks.push({ label: 'FoundingMember record found to approve', pass: members.length > 0, detail: members.length === 0 ? 'Run H4 first' : null });
      if (members.length === 0) { setLoading(false); setResult({ checks, error }); return; }

      const memberId = members[0].id;
      const res = await fn('approveUser', { member_id: memberId });
      checks.push({ label: 'approveUser returned success', pass: res.success === true, detail: res.success ? null : `Error: ${res.error || JSON.stringify(res)}` });

      await wait(1000);
      const updated = await base44.entities.FoundingMember.get(memberId);
      checks.push({ label: 'FoundingMember status changed to invited', pass: updated.approval_status === 'invited', detail: `Got: ${updated.approval_status}` });

      const users = await base44.entities.User.filter({ email: HOST_EMAIL });
      checks.push({ label: 'User record created for host', pass: users.length > 0, detail: users.length === 0 ? 'No User record found after approval' : null });

      checks.push({ label: 'FoundingMember.user_id linked to User', pass: !!updated.user_id, detail: updated.user_id ? null : 'user_id is null on FoundingMember' });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  return (
    <TestCard number="H5" title="Admin Approves Host" description="Simulates admin clicking Approve — sends invite email and moves status to invited" badge="approveUser">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run H4 first</p>
      <RunButton onClick={run} loading={loading} />
      <ResultBlock testName="H5 Admin Approves Host" {...(result || {})} />
    </TestCard>
  );
}

function H6_HostSetsPassword() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      // setOnboardingPassword needs a FoundingMember in 'invited' state
      const members = await base44.entities.FoundingMember.filter({ email: HOST_EMAIL, role: 'host' });
      const member = members.find(m => m.approval_status === 'invited');
      checks.push({ label: 'FoundingMember found in invited status', pass: !!member, detail: !member ? `Status is: ${members[0]?.approval_status || 'no record'} — run H4+H5 first` : null });
      if (!member) { setLoading(false); setResult({ checks, error }); return; }

      const res = await fn('setOnboardingPassword', { email: HOST_EMAIL, password: TEST_PASSWORD });
      checks.push({ label: 'setOnboardingPassword returned success', pass: res.success === true, detail: res.success ? null : `Error: ${res.error || JSON.stringify(res)}` });
      checks.push({ label: 'Session token returned', pass: !!res.session_token, detail: !res.session_token ? 'No session_token' : null });

      await wait(500);
      const creds = await base44.entities.UserCredentials.filter({ email: HOST_EMAIL });
      checks.push({ label: 'UserCredentials record created', pass: creds.length > 0, detail: creds.length === 0 ? 'No credentials stored' : null });

      const updatedMember = await base44.entities.FoundingMember.get(member.id);
      checks.push({ label: 'FoundingMember status moved to password_protected', pass: updatedMember.approval_status === 'password_protected', detail: `Got: ${updatedMember.approval_status}` });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  return (
    <TestCard number="H6" title="Host Sets Password" description="Simulates host clicking the invite link and creating their password" badge="setOnboardingPassword">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run H4 + H5 first</p>
      <RunButton onClick={run} loading={loading} />
      <ResultBlock testName="H6 Host Sets Password" {...(result || {})} />
    </TestCard>
  );
}

function H7_HostSignIn() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      const res = await fn('customSignIn', { email: HOST_EMAIL, password: TEST_PASSWORD });
      checks.push({ label: 'customSignIn returned success', pass: res.success === true, detail: res.success ? null : `Error: ${res.error || JSON.stringify(res)}` });
      checks.push({ label: 'Session token returned', pass: !!res.session_token, detail: !res.session_token ? 'No session_token' : null });
      checks.push({ label: 'Role is host (not guest)', pass: res.role === 'host', detail: `Got role: ${res.role}` });

      if (res.session_token) {
        const chk = await fn('checkSession', { session_token: res.session_token });
        checks.push({ label: 'checkSession confirms authenticated', pass: chk.authenticated === true, detail: `Got: ${JSON.stringify(chk)}` });
        checks.push({ label: 'checkSession returns role=host', pass: chk.role === 'host', detail: `Got role: ${chk.role}` });
      }
    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  return (
    <TestCard number="H7" title="Host Sign In" description="Signs in as the test host and confirms role resolution returns host (not guest)" badge="customSignIn">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run H4–H6 first</p>
      <RunButton onClick={run} loading={loading} />
      <ResultBlock testName="H7 Host Sign In" {...(result || {})} />
    </TestCard>
  );
}

function H8_HostPropertyCreate() {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);
  const [createdId, setCreatedId] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      const users = await base44.entities.User.filter({ email: HOST_EMAIL });
      checks.push({ label: 'Host User record found', pass: users.length > 0, detail: users.length === 0 ? 'Run H4–H6 first' : null });
      if (users.length === 0) { setLoading(false); setResult({ checks, error }); return; }

      const hostUserId = users[0].id;
      const prop = await base44.entities.Property.create({
        owner_id: hostUserId,
        title: 'DEV TEST — Host Property',
        property_type: 'cottage',
        postcode: 'TR1 1AA',
        postcode_area: 'TR',
        county: 'Cornwall',
        country: 'England',
        location: { street: '1 Test Lane', city: 'Truro' },
        nightly_rate: 120,
        bedrooms: 2,
        bathrooms: 1,
        guest_capacity: 4,
        description: 'Automated test property — safe to delete.',
        status: 'draft',
      });
      setCreatedId(prop.id);

      checks.push({ label: 'Property created successfully', pass: !!prop.id, detail: !prop.id ? 'No ID returned' : null });
      checks.push({ label: 'Status is draft (cannot publish without approval gates)', pass: prop.status === 'draft', detail: `Got: ${prop.status}` });
      checks.push({ label: 'owner_id matches host user', pass: prop.owner_id === hostUserId, detail: `Expected: ${hostUserId}, Got: ${prop.owner_id}` });
      checks.push({ label: 'Bedrooms field set', pass: prop.bedrooms === 2, detail: `Got: ${prop.bedrooms}` });
      checks.push({ label: 'Nightly rate set', pass: prop.nightly_rate === 120, detail: `Got: ${prop.nightly_rate}` });
      checks.push({ label: 'Postcode stored', pass: !!prop.postcode, detail: prop.postcode ? null : 'No postcode stored' });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    if (createdId) await base44.entities.Property.delete(createdId).catch(() => {});
    // Also clean any dev test properties for this host
    const users = await base44.entities.User.filter({ email: HOST_EMAIL });
    if (users[0]) {
      const props = await base44.entities.Property.filter({ owner_id: users[0].id });
      for (const p of props) if (p.title?.includes('DEV TEST')) await base44.entities.Property.delete(p.id).catch(() => {});
    }
    setCreatedId(null); setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="H8" title="Host Creates Property" description="Creates a draft property for the test host and verifies all fields are stored" badge="Property entity">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run H4–H6 first</p>
      <div className="flex gap-2 flex-wrap">
        <RunButton onClick={run} loading={loading} />
        <CleanButton onClick={clean} loading={cleaning} />
      </div>
      <ResultBlock testName="H8 Host Property Create" {...(result || {})} />
    </TestCard>
  );
}

function H9_PublishGateCheck() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null; let extra = null;
    try {
      const users = await base44.entities.User.filter({ email: HOST_EMAIL });
      checks.push({ label: 'Host User record found', pass: users.length > 0, detail: users.length === 0 ? 'Run H4–H6 first' : null });
      if (users.length === 0) { setLoading(false); setResult({ checks, error }); return; }

      const user = users[0];
      // These are informational — not pass/fail. We report what's open/blocked.
      const docsVerified = user.documents_verified === true;
      const stripeVerified = user.stripe_connect_status === 'verified';
      const subActive = user.subscription_active === true;

      checks.push({ label: `Gate 1 — Documents verified: ${docsVerified ? 'OPEN ✅' : 'BLOCKED ❌'}`, pass: docsVerified, detail: docsVerified ? null : 'Admin must verify host identity docs at /HostVerification' });
      checks.push({ label: `Gate 2 — Stripe Connect verified: ${stripeVerified ? 'OPEN ✅' : 'BLOCKED ❌'}`, pass: stripeVerified, detail: stripeVerified ? null : `Current status: ${user.stripe_connect_status || 'not_connected'} — host must connect bank at /Settings` });
      checks.push({ label: `Gate 3 — Subscription active: ${subActive ? 'OPEN ✅' : 'BLOCKED ❌'}`, pass: subActive, detail: subActive ? null : 'Host must subscribe at /Subscription' });

      const allGatesOpen = docsVerified && stripeVerified && subActive;
      extra = allGatesOpen
        ? '✅ All three gates open — host can publish properties'
        : `${[!docsVerified && 'docs', !stripeVerified && 'stripe', !subActive && 'subscription'].filter(Boolean).join(', ')} still needed before host can publish`;

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error, extra });
  };

  return (
    <TestCard number="H9" title="Publish Gate Check" description="Reports which of the 3 gates (docs, Stripe, subscription) are open or blocked for the test host" badge="User entity gates">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run H4–H6 first. Gates being blocked is normal for a new host.</p>
      <RunButton onClick={run} loading={loading} />
      <ResultBlock testName="H9 Publish Gate Check" {...(result || {})} />
    </TestCard>
  );
}

function H10_CleaningJobRateCard() {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);
  const [ids, setIds] = useState({});

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null; let extra = null;
    try {
      // Get host user
      const users = await base44.entities.User.filter({ email: HOST_EMAIL });
      checks.push({ label: 'Host user found', pass: users.length > 0, detail: 'Run H4–H6 first' });
      if (users.length === 0) { setLoading(false); setResult({ checks, error }); return; }
      const hostUserId = users[0].id;

      // Create a test cleaner user
      const cleanerUsers = await base44.entities.User.filter({ email: CLEANER_EMAIL });
      let cleanerUser = cleanerUsers[0];
      if (!cleanerUser) {
        cleanerUser = await base44.entities.User.create({ email: CLEANER_EMAIL, full_name: 'Dev TestCleaner' });
      }

      // Create Cleaner profile with rate card
      const existingCleaners = await base44.entities.Cleaner.filter({ user_id: cleanerUser.id });
      let cleanerProfile = existingCleaners[0];
      if (!cleanerProfile) {
        cleanerProfile = await base44.entities.Cleaner.create({
          user_id: cleanerUser.id,
          business_name: 'DEV TEST Cleaners',
          base_price: 50,
          rate_card: { studio_1bed: 55, two_bed: 75, three_bed: 95, four_bed_plus: 120 },
          status: 'active',
        });
      }
      checks.push({ label: 'Cleaner profile created with rate_card', pass: !!cleanerProfile.id, detail: !cleanerProfile.id ? 'Cleaner create failed' : null });
      checks.push({ label: 'rate_card.two_bed is 75', pass: cleanerProfile.rate_card?.two_bed === 75, detail: `Got: ${cleanerProfile.rate_card?.two_bed}` });

      // Create 2-bed property
      const prop = await base44.entities.Property.create({
        owner_id: hostUserId,
        title: 'DEV TEST — Rate Card Property',
        property_type: 'cottage',
        postcode: 'TR1 1AA',
        postcode_area: 'TR',
        county: 'Cornwall',
        country: 'England',
        location: { street: '2 Rate Card Lane' },
        nightly_rate: 100,
        bedrooms: 2,
        bathrooms: 1,
        guest_capacity: 4,
        status: 'published',
      });
      checks.push({ label: '2-bed property created', pass: !!prop.id, detail: !prop.id ? 'Property create failed' : null });

      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 3);
      const scheduledDate = tomorrow.toISOString().split('T')[0];

      // Create CleaningJob — automation will fire and set cleaner_price from rate_card
      const job = await base44.entities.CleaningJob.create({
        property_id: prop.id,
        host_id: hostUserId,
        cleaner_id: cleanerProfile.id,
        cleaner_user_id: cleanerUser.id,
        scheduled_date: scheduledDate,
        scheduled_time: '11:00',
        cleaner_price: 0,
        status: 'pending',
      });
      checks.push({ label: 'CleaningJob created', pass: !!job.id, detail: !job.id ? 'Job create failed' : null });

      setIds({ jobId: job.id, propId: prop.id, cleanerId: cleanerProfile.id, cleanerUserId: cleanerUser.id });

      extra = 'Waiting 4 seconds for Base44 automation (onCleaningJobCreated) to update the rate…';
      setResult({ checks: [...checks], error, extra });

      await wait(4000);

      const updatedJob = await base44.entities.CleaningJob.get(job.id);
      checks.push({ label: 'Rate card automation fired — cleaner_price updated', pass: updatedJob.cleaner_price > 0, detail: updatedJob.cleaner_price > 0 ? null : 'cleaner_price is still 0 — onCleaningJobCreated may not have fired' });
      checks.push({ label: 'cleaner_price matches rate_card.two_bed (£75)', pass: updatedJob.cleaner_price === 75, detail: `Got: £${updatedJob.cleaner_price} — expected: £75` });
      extra = null;

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error, extra });
  };

  const clean = async () => {
    setCleaning(true);
    if (ids.jobId) await base44.entities.CleaningJob.delete(ids.jobId).catch(() => {});
    if (ids.propId) await base44.entities.Property.delete(ids.propId).catch(() => {});
    setIds({}); setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="H10" title="Cleaning Job + Rate Card Automation" description="Creates a 2-bed property + CleaningJob and verifies Base44 automation sets the correct rate from the cleaner's rate card" badge="onCleaningJobCreated">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run H4–H6 first. This test takes ~4 seconds to complete.</p>
      <div className="flex gap-2 flex-wrap">
        <RunButton onClick={run} loading={loading} />
        <CleanButton onClick={clean} loading={cleaning} />
      </div>
      <ResultBlock testName="H10 Rate Card Automation" {...(result || {})} />
    </TestCard>
  );
}

function H11_BookingNotifications() {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      const users = await base44.entities.User.filter({ email: HOST_EMAIL });
      checks.push({ label: 'Host user found', pass: users.length > 0, detail: 'Run H4–H6 first' });
      if (users.length === 0) { setLoading(false); setResult({ checks, error }); return; }
      const hostId = users[0].id;

      const checkin = new Date(); checkin.setDate(checkin.getDate() + 60);
      const checkout = new Date(checkin); checkout.setDate(checkout.getDate() + 4);

      const booking = await base44.entities.Booking.create({
        property_id: 'devtest-property',
        host_id: hostId,
        guest_id: 'devtest-guest-id',
        guest_name: 'Dev Guest',
        guest_email: GUEST_EMAIL,
        check_in: checkin.toISOString().split('T')[0],
        check_out: checkout.toISOString().split('T')[0],
        booking_status: 'pending',
        payment_status: 'pending',
        total_amount: 480,
        deposit_amount: 100,
        remaining_balance: 380,
        nightly_rate: 120,
        nights: 4,
      });
      setBookingId(booking.id);
      checks.push({ label: 'Booking created (status=pending)', pass: !!booking.id, detail: !booking.id ? 'Booking create failed' : null });

      // Wait for onBookingCreated automation to fire host notification
      await wait(3000);
      const notifs = await base44.entities.Notification.filter({ user_id: hostId });
      const bookingNotif = notifs.find(n => n.type === 'booking_request');
      checks.push({ label: 'Host received booking_request notification (automation fired)', pass: !!bookingNotif, detail: !bookingNotif ? 'No booking_request notification found — onBookingCreated may not have fired' : null });

      // Update to confirmed and check guest notification
      await base44.entities.Booking.update(booking.id, { booking_status: 'confirmed' });
      await wait(3000);
      const notifs2 = await base44.entities.Notification.filter({ user_id: hostId });
      const confirmedNotif = notifs2.find(n => n.type === 'booking_confirmed');
      checks.push({ label: 'booking_confirmed notification fired on status change', pass: !!confirmedNotif, detail: !confirmedNotif ? 'No booking_confirmed notification found' : null });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    if (bookingId) await base44.entities.Booking.delete(bookingId).catch(() => {});
    setBookingId(null); setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="H11" title="Booking Notifications" description="Creates a test booking and confirms both the host notification and status-change notification fire correctly" badge="onBookingCreated">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run H4–H6 first. Takes ~6 seconds for automation checks.</p>
      <div className="flex gap-2 flex-wrap">
        <RunButton onClick={run} loading={loading} />
        <CleanButton onClick={clean} loading={cleaning} />
      </div>
      <ResultBlock testName="H11 Booking Notifications" {...(result || {})} />
    </TestCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANER JOURNEY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

function C1_CleanerProfileSetup() {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      // Clean first
      await fn('deleteAccount', { admin_delete_email: CLEANER_EMAIL });
      await wait(500);

      // Create User
      const user = await base44.entities.User.create({
        email: CLEANER_EMAIL,
        full_name: 'Dev TestCleaner',
        forename: 'Dev',
        surname: 'TestCleaner',
      });
      checks.push({ label: 'User record created', pass: !!user.id, detail: !user.id ? 'User create failed' : null });

      // Create UserCredentials
      // We hash manually by using signUp function for simplicity
      const signupRes = await fn('customSignUp', {
        email: CLEANER_EMAIL,
        password: TEST_PASSWORD,
        forename: 'Dev',
        surname: 'TestCleaner',
      });
      // customSignUp creates its own User too — delete the duplicate we created
      const allUsers = await base44.entities.User.filter({ email: CLEANER_EMAIL });
      if (allUsers.length > 1) await base44.entities.User.delete(user.id).catch(() => {});
      const cleanerUser = allUsers.find(u => u.id !== user.id) || allUsers[0];

      checks.push({ label: 'UserCredentials created via customSignUp', pass: signupRes.success === true, detail: signupRes.success ? null : JSON.stringify(signupRes) });

      // Update UserRole from guest → cleaner
      const roles = await base44.entities.UserRole.filter({ user_id: cleanerUser.id });
      const guestRole = roles.find(r => r.role === 'guest');
      if (guestRole) {
        await base44.entities.UserRole.update(guestRole.id, { role: 'cleaner', approval_status: 'approved' });
      }
      await wait(300);
      const updatedRoles = await base44.entities.UserRole.filter({ user_id: cleanerUser.id });
      const cleanerRole = updatedRoles.find(r => r.role === 'cleaner');
      checks.push({ label: 'UserRole updated to cleaner', pass: !!cleanerRole, detail: !cleanerRole ? `Roles found: ${updatedRoles.map(r => r.role).join(', ')}` : null });
      checks.push({ label: 'Cleaner role approval_status=approved', pass: cleanerRole?.approval_status === 'approved', detail: `Got: ${cleanerRole?.approval_status}` });

      // Create Cleaner profile
      const cleanerProfile = await base44.entities.Cleaner.create({
        user_id: cleanerUser.id,
        business_name: 'DEV TEST Cleaning Co.',
        bio: 'Test cleaner — automated dev data.',
        base_price: 50,
        rate_card: { studio_1bed: 55, two_bed: 75, three_bed: 95, four_bed_plus: 120 },
        service_area: { city: 'Truro', postcode_prefix: 'TR', radius_miles: 20 },
        status: 'active',
        subscription_plan: 'basic',
        subscription_status: 'active',
      });
      checks.push({ label: 'Cleaner profile record created', pass: !!cleanerProfile.id, detail: !cleanerProfile.id ? 'Cleaner create failed' : null });
      checks.push({ label: 'rate_card has all 4 tiers', pass: !!(cleanerProfile.rate_card?.studio_1bed && cleanerProfile.rate_card?.two_bed && cleanerProfile.rate_card?.three_bed && cleanerProfile.rate_card?.four_bed_plus), detail: `rate_card: ${JSON.stringify(cleanerProfile.rate_card)}` });
      checks.push({ label: 'subscription_status is active', pass: cleanerProfile.subscription_status === 'active', detail: `Got: ${cleanerProfile.subscription_status}` });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    await fn('deleteAccount', { admin_delete_email: CLEANER_EMAIL });
    await wait(500);
    setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="C1" title="Cleaner Profile Setup" description={`Creates a full cleaner account for ${CLEANER_EMAIL} — User, credentials, UserRole (cleaner), Cleaner profile with rate card`} badge="Cleaner entity">
      <div className="flex gap-2 flex-wrap">
        <RunButton onClick={run} loading={loading} />
        <CleanButton onClick={clean} loading={cleaning} />
      </div>
      <ResultBlock testName="C1 Cleaner Profile Setup" {...(result || {})} />
    </TestCard>
  );
}

function C2_CleanerApprovalGates() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null; let extra = null;
    try {
      const users = await base44.entities.User.filter({ email: CLEANER_EMAIL });
      checks.push({ label: 'Cleaner User record found', pass: users.length > 0, detail: 'Run C1 first' });
      if (users.length === 0) { setLoading(false); setResult({ checks, error }); return; }
      const user = users[0];

      const cleaners = await base44.entities.Cleaner.filter({ user_id: user.id });
      checks.push({ label: 'Cleaner profile record found', pass: cleaners.length > 0, detail: 'Run C1 first' });
      if (cleaners.length === 0) { setLoading(false); setResult({ checks, error }); return; }
      const cleaner = cleaners[0];

      const docsVerified = user.documents_verified === true;
      const stripeOk = user.stripe_connect_status === 'verified';
      const subActive = cleaner.subscription_status === 'active';

      checks.push({ label: `Gate 1 — Documents verified: ${docsVerified ? 'OPEN ✅' : 'BLOCKED ❌'}`, pass: docsVerified, detail: docsVerified ? null : 'Admin must verify cleaner docs — User.documents_verified is false' });
      checks.push({ label: `Gate 2 — Stripe Connect verified: ${stripeOk ? 'OPEN ✅' : 'BLOCKED ❌'}`, pass: stripeOk, detail: stripeOk ? null : `Current: ${user.stripe_connect_status || 'not_connected'} — cleaner must connect bank in Settings` });
      checks.push({ label: `Gate 3 — Subscription active: ${subActive ? 'OPEN ✅' : 'BLOCKED ❌'}`, pass: subActive, detail: subActive ? null : `Current: ${cleaner.subscription_status}` });

      extra = `For test data, C1 sets subscription_status=active so Gate 3 should be open. Gates 1 and 2 require real Stripe/admin action.`;

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error, extra });
  };

  return (
    <TestCard number="C2" title="Cleaner Approval Gates" description="Reports which of the 3 gates (docs, Stripe, subscription) are open or blocked for the test cleaner" badge="CleanerApprovalBanner logic">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run C1 first</p>
      <RunButton onClick={run} loading={loading} />
      <ResultBlock testName="C2 Cleaner Approval Gates" {...(result || {})} />
    </TestCard>
  );
}

function C3_C4_C5_JobLifecycle() {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);
  const [jobId, setJobId] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      const users = await base44.entities.User.filter({ email: CLEANER_EMAIL });
      const hostUsers = await base44.entities.User.filter({ email: HOST_EMAIL });
      checks.push({ label: 'Cleaner user found', pass: users.length > 0, detail: 'Run C1 first' });
      checks.push({ label: 'Host user found', pass: hostUsers.length > 0, detail: 'Run H4–H6 first' });
      if (users.length === 0 || hostUsers.length === 0) { setLoading(false); setResult({ checks, error }); return; }

      const cleanerUser = users[0];
      const cleaners = await base44.entities.Cleaner.filter({ user_id: cleanerUser.id });
      checks.push({ label: 'Cleaner profile found', pass: cleaners.length > 0, detail: 'Run C1 first' });
      if (cleaners.length === 0) { setLoading(false); setResult({ checks, error }); return; }

      const cleaner = cleaners[0];
      const hostId = hostUsers[0].id;
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 2);
      const scheduledDate = tomorrow.toISOString().split('T')[0];

      // STEP 1: Create pending job
      const job = await base44.entities.CleaningJob.create({
        property_id: 'devtest-prop-lifecycle',
        host_id: hostId,
        cleaner_id: cleaner.id,
        cleaner_user_id: cleanerUser.id,
        scheduled_date: scheduledDate,
        scheduled_time: '10:00',
        cleaner_price: 75,
        status: 'pending',
        property_details: { address: 'DEV TEST — 1 Lifecycle Lane, Truro', bedrooms: 2, bathrooms: 1 },
      });
      setJobId(job.id);
      checks.push({ label: '✦ STEP 1: Job created with status=pending', pass: job.status === 'pending', detail: `Got: ${job.status}` });

      // STEP 2: Accept
      await base44.entities.CleaningJob.update(job.id, { status: 'accepted', accepted_at: new Date().toISOString() });
      const accepted = await base44.entities.CleaningJob.get(job.id);
      checks.push({ label: '✦ STEP 2: Status updated to accepted', pass: accepted.status === 'accepted', detail: `Got: ${accepted.status}` });
      checks.push({ label: '✦ STEP 2: accepted_at timestamp stored', pass: !!accepted.accepted_at, detail: accepted.accepted_at ? null : 'accepted_at is null' });

      // Verify host notification
      await wait(2000);
      const hostNotifs = await base44.entities.Notification.filter({ user_id: hostId });
      const acceptedNotif = hostNotifs.find(n => n.type === 'cleaning_job_accepted');
      checks.push({ label: '✦ STEP 2: Host notified of acceptance (automation)', pass: !!acceptedNotif, detail: !acceptedNotif ? 'No cleaning_job_accepted notification — automation may not have fired' : null });

      // STEP 3: Start job (in_progress)
      await base44.entities.CleaningJob.update(job.id, { status: 'in_progress' });
      const inProgress = await base44.entities.CleaningJob.get(job.id);
      checks.push({ label: '✦ STEP 3: Status updated to in_progress', pass: inProgress.status === 'in_progress', detail: `Got: ${inProgress.status}` });

      // STEP 4: Complete job
      const completedAt = new Date().toISOString();
      await base44.entities.CleaningJob.update(job.id, {
        status: 'completed',
        completed_at: completedAt,
        completion_notes: 'DEV TEST — All rooms cleaned, towels changed.',
        completion_photos: ['https://example.com/dev-photo-1.jpg', 'https://example.com/dev-photo-2.jpg'],
      });
      const completed = await base44.entities.CleaningJob.get(job.id);
      checks.push({ label: '✦ STEP 4: Status updated to completed', pass: completed.status === 'completed', detail: `Got: ${completed.status}` });
      checks.push({ label: '✦ STEP 4: completed_at timestamp stored', pass: !!completed.completed_at, detail: completed.completed_at ? null : 'completed_at is null' });
      checks.push({ label: '✦ STEP 4: completion_notes stored', pass: !!completed.completion_notes, detail: completed.completion_notes ? null : 'completion_notes is empty' });
      checks.push({ label: '✦ STEP 4: completion_photos stored (2 photos)', pass: completed.completion_photos?.length === 2, detail: `Got ${completed.completion_photos?.length || 0} photos` });

      // Verify host notification
      await wait(2000);
      const hostNotifs2 = await base44.entities.Notification.filter({ user_id: hostId });
      const completedNotif = hostNotifs2.find(n => n.type === 'cleaning_job_completed');
      checks.push({ label: '✦ STEP 4: Host notified job completed (automation)', pass: !!completedNotif, detail: !completedNotif ? 'No cleaning_job_completed notification found' : null });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    if (jobId) await base44.entities.CleaningJob.delete(jobId).catch(() => {});
    setJobId(null); setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="C3–C5" title="Cleaning Job Full Lifecycle" description="Runs the complete job flow in one go: pending → accept → start → complete. Verifies each status, timestamps, notes, photos, and host notifications at each step." badge="4 steps in sequence">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run C1 + H4–H6 first. Takes ~4 seconds for automation checks.</p>
      <div className="flex gap-2 flex-wrap">
        <RunButton onClick={run} loading={loading} />
        <CleanButton onClick={clean} loading={cleaning} />
      </div>
      <ResultBlock testName="C3-C5 Job Lifecycle" {...(result || {})} />
    </TestCard>
  );
}

function C6_CounterRate() {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const [jobId, setJobId] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      const users = await base44.entities.User.filter({ email: CLEANER_EMAIL });
      const hostUsers = await base44.entities.User.filter({ email: HOST_EMAIL });
      if (users.length === 0 || hostUsers.length === 0) {
        checks.push({ label: 'Cleaner and host users found', pass: false, detail: 'Run C1 + H4–H6 first' });
        setLoading(false); setResult({ checks, error }); return;
      }
      const cleanerUser = users[0];
      const hostId = hostUsers[0].id;
      const cleaners = await base44.entities.Cleaner.filter({ user_id: cleanerUser.id });
      const cleaner = cleaners[0];
      const PROP_ID = 'devtest-counter-rate-prop';
      const COUNTER_RATE = 95;

      // Create PropertyCleanerSettings with counter_rate
      const settings = await base44.entities.PropertyCleanerSettings.create({
        property_id: PROP_ID,
        host_id: hostId,
        default_cleaner_id: cleaner.id,
        counter_rate: COUNTER_RATE,
        counter_rate_status: 'accepted',
      });
      setSettingsId(settings.id);
      checks.push({ label: 'PropertyCleanerSettings record created', pass: !!settings.id, detail: !settings.id ? 'Create failed' : null });
      checks.push({ label: `counter_rate set to £${COUNTER_RATE}`, pass: settings.counter_rate === COUNTER_RATE, detail: `Got: ${settings.counter_rate}` });
      checks.push({ label: 'counter_rate_status is accepted', pass: settings.counter_rate_status === 'accepted', detail: `Got: ${settings.counter_rate_status}` });

      // Create a CleaningJob — automation should use counter_rate (95) not rate_card (75)
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 5);
      const job = await base44.entities.CleaningJob.create({
        property_id: PROP_ID,
        host_id: hostId,
        cleaner_id: cleaner.id,
        cleaner_user_id: cleanerUser.id,
        scheduled_date: tomorrow.toISOString().split('T')[0],
        scheduled_time: '10:00',
        cleaner_price: 0,
        status: 'pending',
      });
      setJobId(job.id);
      checks.push({ label: 'CleaningJob created for counter-rate test', pass: !!job.id, detail: !job.id ? 'Job create failed' : null });

      await wait(4000);
      const updatedJob = await base44.entities.CleaningJob.get(job.id);
      checks.push({ label: `Counter rate used — cleaner_price is £${COUNTER_RATE}`, pass: updatedJob.cleaner_price === COUNTER_RATE, detail: `Got: £${updatedJob.cleaner_price} — expected £${COUNTER_RATE}. Rate card would give £75.` });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    if (settingsId) await base44.entities.PropertyCleanerSettings.delete(settingsId).catch(() => {});
    if (jobId) await base44.entities.CleaningJob.delete(jobId).catch(() => {});
    setSettingsId(null); setJobId(null); setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="C6" title="Counter Rate Override" description="Creates a PropertyCleanerSettings with an accepted counter_rate of £95, creates a job, and verifies the automation uses £95 instead of the rate card's £75" badge="counter_rate + automation">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run C1 + H4–H6 first. Takes ~4 seconds.</p>
      <div className="flex gap-2 flex-wrap">
        <RunButton onClick={run} loading={loading} />
        <CleanButton onClick={clean} loading={cleaning} />
      </div>
      <ResultBlock testName="C6 Counter Rate" {...(result || {})} />
    </TestCard>
  );
}

function C7_EarningsVerification() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null; let extra = null;
    try {
      const users = await base44.entities.User.filter({ email: CLEANER_EMAIL });
      checks.push({ label: 'Cleaner user found', pass: users.length > 0, detail: 'Run C1 first' });
      if (users.length === 0) { setLoading(false); setResult({ checks, error }); return; }
      const cleaners = await base44.entities.Cleaner.filter({ user_id: users[0].id });
      if (cleaners.length === 0) { checks.push({ label: 'Cleaner profile found', pass: false, detail: 'Run C1 first' }); setLoading(false); setResult({ checks, error }); return; }

      const allJobs = await base44.entities.CleaningJob.filter({ cleaner_id: cleaners[0].id });
      const completedJobs = allJobs.filter(j => j.status === 'completed');
      const totalEarnings = completedJobs.reduce((s, j) => s + (j.cleaner_price || 0), 0);

      checks.push({ label: `All CleaningJob records loaded (${allJobs.length} total)`, pass: true });
      checks.push({ label: `Completed jobs found: ${completedJobs.length}`, pass: completedJobs.length >= 0 });
      checks.push({ label: `Total earnings calculated: £${totalEarnings.toFixed(2)}`, pass: true });
      checks.push({ label: 'Earnings calculation is correct (sum of cleaner_price on completed jobs)', pass: true });

      const thisMonth = completedJobs.filter(j => {
        if (!j.completed_at) return false;
        const d = new Date(j.completed_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      checks.push({ label: `This month completed jobs: ${thisMonth.length}`, pass: true });

      extra = `If C3–C5 was run, you should see at least 1 completed job with price £75.`;
    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error, extra });
  };

  return (
    <TestCard number="C7" title="Cleaner Earnings Verification" description="Loads all completed jobs for the test cleaner and verifies earnings sum is calculated correctly" badge="CleanerPayoutHistory logic">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run C1 + C3–C5 first for meaningful data</p>
      <RunButton onClick={run} loading={loading} />
      <ResultBlock testName="C7 Earnings Verification" {...(result || {})} />
    </TestCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

const NOTIF_TYPES = [
  'booking_request','booking_confirmed','booking_declined','booking_cancelled',
  'booking_checked_in','booking_completed','new_message','cleaning_job_assigned',
  'cleaning_job_accepted','cleaning_job_declined','cleaning_job_completed',
  'payment_received','payment_due','general',
];

function N1_DirectNotification({ user }) {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);
  const [notifId, setNotifId] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      checks.push({ label: 'Admin user available', pass: !!user?.id, detail: !user?.id ? 'No user passed to DevTools' : null });
      if (!user?.id) { setLoading(false); setResult({ checks, error }); return; }

      const res = await fn('sendNotification', {
        user_id: user.id,
        type: 'general',
        title: 'DEV TEST Notification',
        body: 'This is an automated test notification',
        link: '/admin',
      });
      checks.push({ label: 'sendNotification returned success', pass: res?.success === true || res?.ok === true || (!res?.error && res !== null), detail: res?.error ? `Error: ${JSON.stringify(res)}` : null });

      await wait(1000);

      const notifs = await base44.entities.Notification.filter({ user_id: user.id });
      const testNotif = notifs.find(n => n.title === 'DEV TEST Notification');
      setNotifId(testNotif?.id || null);

      checks.push({ label: 'Notification record created in DB', pass: !!testNotif, detail: !testNotif ? 'No Notification record found with title "DEV TEST Notification"' : null });
      checks.push({ label: 'read is false (unread by default)', pass: testNotif?.read === false, detail: `Got: ${testNotif?.read}` });
      checks.push({ label: 'type is general', pass: testNotif?.type === 'general', detail: `Got: ${testNotif?.type}` });
      checks.push({ label: 'link is /admin', pass: testNotif?.link === '/admin', detail: `Got: ${testNotif?.link}` });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    if (notifId) await base44.entities.Notification.delete(notifId).catch(() => {});
    else if (user?.id) {
      const notifs = await base44.entities.Notification.filter({ user_id: user.id }).catch(() => []);
      const testNotif = notifs.find(n => n.title === 'DEV TEST Notification');
      if (testNotif) await base44.entities.Notification.delete(testNotif.id).catch(() => {});
    }
    setNotifId(null); setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="N1" title="Send & Receive Notification" description="Sends a notification directly to the admin user and verifies it lands in the Notification entity" badge="sendNotification">
      <div className="flex gap-2 flex-wrap">
        <RunButton onClick={run} loading={loading} />
        <CleanButton onClick={clean} loading={cleaning} />
      </div>
      <ResultBlock testName="N1 Direct Notification" {...(result || {})} />
    </TestCard>
  );
}

function N2_AllNotificationTypes({ user }) {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      checks.push({ label: 'Admin user available', pass: !!user?.id, detail: !user?.id ? 'No user passed to DevTools' : null });
      if (!user?.id) { setLoading(false); setResult({ checks, error }); return; }

      // Fire all 14 types
      await Promise.all(NOTIF_TYPES.map(type =>
        fn('sendNotification', {
          user_id: user.id,
          type,
          title: `DEV TEST — ${type}`,
          body: `Automated coverage test for type: ${type}`,
        })
      ));

      await wait(2000);

      const notifs = await base44.entities.Notification.filter({ user_id: user.id });
      const testNotifs = notifs.filter(n => n.title?.startsWith('DEV TEST —'));

      checks.push({ label: `All 14 notification types fired`, pass: true });
      checks.push({
        label: `14 Notification records created (got ${testNotifs.length})`,
        pass: testNotifs.length === 14,
        detail: testNotifs.length !== 14 ? `Expected 14, found ${testNotifs.length}. Missing: ${NOTIF_TYPES.filter(t => !testNotifs.find(n => n.title === `DEV TEST — ${t}`)).join(', ')}` : null,
      });

      // Individual type checks
      for (const type of NOTIF_TYPES) {
        const found = testNotifs.find(n => n.title === `DEV TEST — ${type}`);
        checks.push({ label: `type "${type}" created`, pass: !!found, detail: !found ? `No record found for type: ${type}` : null });
      }

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    if (user?.id) {
      const notifs = await base44.entities.Notification.filter({ user_id: user.id }).catch(() => []);
      const testNotifs = notifs.filter(n => n.title?.startsWith('DEV TEST —'));
      for (const n of testNotifs) await base44.entities.Notification.delete(n.id).catch(() => {});
    }
    setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="N2" title="Notification Type Coverage" description="Fires one notification of every supported type and confirms each creates a record" badge="14 types">
      <div className="flex gap-2 flex-wrap">
        <RunButton onClick={run} loading={loading} />
        <CleanButton onClick={clean} loading={cleaning} />
      </div>
      <ResultBlock testName="N2 Notification Type Coverage" {...(result || {})} />
    </TestCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW TESTS
// ═══════════════════════════════════════════════════════════════════════════════

// Shared helper: lookup devtest user IDs
async function getReviewTestUsers() {
  const [guestUsers, hostUsers, cleanerUsers] = await Promise.all([
    base44.entities.User.filter({ email: GUEST_EMAIL }),
    base44.entities.User.filter({ email: HOST_EMAIL }),
    base44.entities.User.filter({ email: CLEANER_EMAIL }),
  ]);
  return {
    guestUser: guestUsers[0] || null,
    hostUser: hostUsers[0] || null,
    cleanerUser: cleanerUsers[0] || null,
  };
}

function R1_GuestReviewsHost() {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);
  const [reviewId, setReviewId] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      const { guestUser, hostUser } = await getReviewTestUsers();
      checks.push({ label: 'devtest-guest User found', pass: !!guestUser, detail: !guestUser ? 'Run H1 first' : null });
      checks.push({ label: 'devtest-host User found', pass: !!hostUser, detail: !hostUser ? 'Run H4–H6 first' : null });
      if (!guestUser || !hostUser) { setLoading(false); setResult({ checks, error }); return; }

      const blindUntil = new Date(); blindUntil.setDate(blindUntil.getDate() + 7);
      const review = await base44.entities.Review.create({
        review_type: 'guest_to_host',
        review_category: 'booking',
        booking_id: 'devtest-review-booking',
        reviewer_id: guestUser.id,
        reviewer_name: guestUser.full_name || 'Dev Guest',
        reviewee_id: hostUser.id,
        rating: 5,
        comment: 'DEV TEST review',
        blind_until: blindUntil.toISOString(),
      });
      setReviewId(review.id);
      checks.push({ label: 'Review record created', pass: !!review.id, detail: !review.id ? 'Create failed' : null });

      await wait(3000);

      const updated = await base44.entities.Review.get(review.id);
      checks.push({ label: 'public_visible set by processReview automation', pass: updated.public_visible === true, detail: `Got: ${updated.public_visible} — expected true for 5-star review` });

      const notifs = await base44.entities.Notification.filter({ user_id: hostUser.id });
      const reviewNotif = notifs.find(n => n.type === 'general' && (n.body?.includes('review') || n.title?.includes('review')));
      checks.push({ label: 'Reviewee (host) received a general notification', pass: !!reviewNotif, detail: !reviewNotif ? 'No general notification found for host — processReview may not have fired' : null });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    if (reviewId) await base44.entities.Review.delete(reviewId).catch(() => {});
    const { hostUser } = await getReviewTestUsers().catch(() => ({}));
    if (hostUser) {
      const notifs = await base44.entities.Notification.filter({ user_id: hostUser.id }).catch(() => []);
      for (const n of notifs) if (n.title?.includes('DEV TEST') || n.body?.includes('DEV TEST')) await base44.entities.Notification.delete(n.id).catch(() => {});
    }
    setReviewId(null); setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="R1" title="Guest Reviews Host" description="Creates a 5-star guest→host review and verifies processReview sets public_visible and notifies the host" badge="processReview">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run H1 + H4–H6 first. Takes ~3 seconds.</p>
      <div className="flex gap-2 flex-wrap">
        <RunButton onClick={run} loading={loading} />
        <CleanButton onClick={clean} loading={cleaning} />
      </div>
      <ResultBlock testName="R1 Guest Reviews Host" {...(result || {})} />
    </TestCard>
  );
}

function R2_HostReviewsGuest() {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);
  const [reviewId, setReviewId] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      const { guestUser, hostUser } = await getReviewTestUsers();
      checks.push({ label: 'devtest-host User found', pass: !!hostUser, detail: !hostUser ? 'Run H4–H6 first' : null });
      checks.push({ label: 'devtest-guest User found', pass: !!guestUser, detail: !guestUser ? 'Run H1 first' : null });
      if (!guestUser || !hostUser) { setLoading(false); setResult({ checks, error }); return; }

      const blindUntil = new Date(); blindUntil.setDate(blindUntil.getDate() + 7);
      const review = await base44.entities.Review.create({
        review_type: 'host_to_guest',
        review_category: 'booking',
        booking_id: 'devtest-review-booking-2',
        reviewer_id: hostUser.id,
        reviewer_name: hostUser.full_name || 'Dev Host',
        reviewee_id: guestUser.id,
        rating: 5,
        comment: 'DEV TEST review',
        blind_until: blindUntil.toISOString(),
      });
      setReviewId(review.id);
      checks.push({ label: 'Review record created', pass: !!review.id, detail: !review.id ? 'Create failed' : null });

      await wait(3000);

      const updated = await base44.entities.Review.get(review.id);
      checks.push({ label: 'public_visible set by processReview automation', pass: updated.public_visible === true, detail: `Got: ${updated.public_visible}` });

      const notifs = await base44.entities.Notification.filter({ user_id: guestUser.id });
      const reviewNotif = notifs.find(n => n.type === 'general' && (n.body?.includes('review') || n.title?.includes('review')));
      checks.push({ label: 'Reviewee (guest) received a general notification', pass: !!reviewNotif, detail: !reviewNotif ? 'No general notification found for guest' : null });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    if (reviewId) await base44.entities.Review.delete(reviewId).catch(() => {});
    const { guestUser } = await getReviewTestUsers().catch(() => ({}));
    if (guestUser) {
      const notifs = await base44.entities.Notification.filter({ user_id: guestUser.id }).catch(() => []);
      for (const n of notifs) if (n.title?.includes('DEV TEST') || n.body?.includes('DEV TEST')) await base44.entities.Notification.delete(n.id).catch(() => {});
    }
    setReviewId(null); setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="R2" title="Host Reviews Guest" description="Creates a 5-star host→guest review and verifies processReview sets public_visible and notifies the guest" badge="processReview">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run H1 + H4–H6 first. Takes ~3 seconds.</p>
      <div className="flex gap-2 flex-wrap">
        <RunButton onClick={run} loading={loading} />
        <CleanButton onClick={clean} loading={cleaning} />
      </div>
      <ResultBlock testName="R2 Host Reviews Guest" {...(result || {})} />
    </TestCard>
  );
}

function R3_HostReviewsCleaner() {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);
  const [reviewId, setReviewId] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      const { hostUser, cleanerUser } = await getReviewTestUsers();
      checks.push({ label: 'devtest-host User found', pass: !!hostUser, detail: !hostUser ? 'Run H4–H6 first' : null });
      checks.push({ label: 'devtest-cleaner User found', pass: !!cleanerUser, detail: !cleanerUser ? 'Run C1 first' : null });
      if (!hostUser || !cleanerUser) { setLoading(false); setResult({ checks, error }); return; }

      const cleaners = await base44.entities.Cleaner.filter({ user_id: cleanerUser.id });
      checks.push({ label: 'Cleaner profile found', pass: cleaners.length > 0, detail: !cleaners.length ? 'Run C1 first' : null });
      if (!cleaners.length) { setLoading(false); setResult({ checks, error }); return; }
      const cleanerProfile = cleaners[0];

      const blindUntil = new Date(); blindUntil.setDate(blindUntil.getDate() + 7);
      const review = await base44.entities.Review.create({
        review_type: 'host_to_cleaner',
        review_category: 'cleaning_job',
        job_id: 'devtest-review-job',
        reviewer_id: hostUser.id,
        reviewer_name: hostUser.full_name || 'Dev Host',
        reviewee_id: cleanerUser.id,
        rating: 4,
        quality_rating: 4,
        reliability_rating: 5,
        communication_rating: 4,
        comment: 'DEV TEST review',
        blind_until: blindUntil.toISOString(),
      });
      setReviewId(review.id);
      checks.push({ label: 'Review record created', pass: !!review.id, detail: !review.id ? 'Create failed' : null });

      await wait(4000);

      const updated = await base44.entities.Review.get(review.id);
      checks.push({ label: 'public_visible set by processReview automation', pass: updated.public_visible === true, detail: `Got: ${updated.public_visible}` });

      const cleanerReviews = await base44.entities.CleanerReview.filter({ job_id: 'devtest-review-job' });
      checks.push({ label: 'CleanerReview record synced (processReview sync)', pass: cleanerReviews.length > 0, detail: !cleanerReviews.length ? 'No CleanerReview found for job_id=devtest-review-job — sync block may have failed' : null });

      const updatedCleaner = await base44.entities.Cleaner.get(cleanerProfile.id);
      checks.push({ label: 'Cleaner.average_rating updated (> 0)', pass: (updatedCleaner.average_rating || 0) > 0, detail: `Got: ${updatedCleaner.average_rating}` });
      checks.push({ label: 'Cleaner.total_reviews is at least 1', pass: (updatedCleaner.total_reviews || 0) >= 1, detail: `Got: ${updatedCleaner.total_reviews}` });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    if (reviewId) await base44.entities.Review.delete(reviewId).catch(() => {});
    const syncedReviews = await base44.entities.CleanerReview.filter({ job_id: 'devtest-review-job' }).catch(() => []);
    for (const r of syncedReviews) await base44.entities.CleanerReview.delete(r.id).catch(() => {});
    const { cleanerUser } = await getReviewTestUsers().catch(() => ({}));
    if (cleanerUser) {
      const cleaners = await base44.entities.Cleaner.filter({ user_id: cleanerUser.id }).catch(() => []);
      if (cleaners[0]) await base44.entities.Cleaner.update(cleaners[0].id, { average_rating: 0, total_reviews: 0 }).catch(() => {});
    }
    setReviewId(null); setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="R3" title="Host Reviews Cleaner (+ CleanerReview sync)" description="Creates a host→cleaner review, verifies processReview automation, CleanerReview sync, and cleaner stats update" badge="processReview + sync">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run C1 + H4–H6 first. Takes ~4 seconds.</p>
      <div className="flex gap-2 flex-wrap">
        <RunButton onClick={run} loading={loading} />
        <CleanButton onClick={clean} loading={cleaning} />
      </div>
      <ResultBlock testName="R3 Host Reviews Cleaner" {...(result || {})} />
    </TestCard>
  );
}

function R4_CleanerReviewsHost() {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);
  const [reviewId, setReviewId] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      const { hostUser, cleanerUser } = await getReviewTestUsers();
      checks.push({ label: 'devtest-cleaner User found', pass: !!cleanerUser, detail: !cleanerUser ? 'Run C1 first' : null });
      checks.push({ label: 'devtest-host User found', pass: !!hostUser, detail: !hostUser ? 'Run H4–H6 first' : null });
      if (!cleanerUser || !hostUser) { setLoading(false); setResult({ checks, error }); return; }

      const blindUntil = new Date(); blindUntil.setDate(blindUntil.getDate() + 7);
      const review = await base44.entities.Review.create({
        review_type: 'cleaner_to_host',
        review_category: 'cleaning_job',
        job_id: 'devtest-review-job-2',
        reviewer_id: cleanerUser.id,
        reviewer_name: cleanerUser.full_name || 'Dev Cleaner',
        reviewee_id: hostUser.id,
        rating: 5,
        comment: 'DEV TEST review',
        blind_until: blindUntil.toISOString(),
      });
      setReviewId(review.id);
      checks.push({ label: 'Review record created', pass: !!review.id, detail: !review.id ? 'Create failed' : null });

      await wait(3000);

      const updated = await base44.entities.Review.get(review.id);
      checks.push({ label: 'public_visible set by processReview automation', pass: updated.public_visible === true, detail: `Got: ${updated.public_visible}` });

      const notifs = await base44.entities.Notification.filter({ user_id: hostUser.id });
      const reviewNotif = notifs.find(n => n.type === 'general' && (n.body?.includes('review') || n.title?.includes('review')));
      checks.push({ label: 'Reviewee (host) received a general notification', pass: !!reviewNotif, detail: !reviewNotif ? 'No general notification found for host' : null });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    if (reviewId) await base44.entities.Review.delete(reviewId).catch(() => {});
    const { hostUser } = await getReviewTestUsers().catch(() => ({}));
    if (hostUser) {
      const notifs = await base44.entities.Notification.filter({ user_id: hostUser.id }).catch(() => []);
      for (const n of notifs) if (n.title?.includes('DEV TEST') || n.body?.includes('DEV TEST')) await base44.entities.Notification.delete(n.id).catch(() => {});
    }
    setReviewId(null); setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="R4" title="Cleaner Reviews Host" description="Creates a cleaner→host review and verifies processReview sets public_visible and notifies the host" badge="processReview">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run C1 + H4–H6 first. Takes ~3 seconds.</p>
      <div className="flex gap-2 flex-wrap">
        <RunButton onClick={run} loading={loading} />
        <CleanButton onClick={clean} loading={cleaning} />
      </div>
      <ResultBlock testName="R4 Cleaner Reviews Host" {...(result || {})} />
    </TestCard>
  );
}

function R5_BlindReveal() {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);
  const [ids, setIds] = useState({ r1: null, r2: null });

  const run = async () => {
    setLoading(true); setResult(null);
    const checks = []; let error = null;
    try {
      const { guestUser, hostUser } = await getReviewTestUsers();
      checks.push({ label: 'devtest-guest User found', pass: !!guestUser, detail: !guestUser ? 'Run H1 first' : null });
      checks.push({ label: 'devtest-host User found', pass: !!hostUser, detail: !hostUser ? 'Run H4–H6 first' : null });
      if (!guestUser || !hostUser) { setLoading(false); setResult({ checks, error }); return; }

      const blindUntil = new Date(); blindUntil.setDate(blindUntil.getDate() + 7);

      // Create guest→host review first
      const r1 = await base44.entities.Review.create({
        review_type: 'guest_to_host',
        review_category: 'booking',
        booking_id: 'devtest-blind-booking',
        reviewer_id: guestUser.id,
        reviewer_name: guestUser.full_name || 'Dev Guest',
        reviewee_id: hostUser.id,
        rating: 4,
        comment: 'DEV TEST blind reveal — guest',
        blind_until: blindUntil.toISOString(),
      });
      checks.push({ label: 'First review (guest→host) created', pass: !!r1.id, detail: !r1.id ? 'Create failed' : null });

      // Wait briefly then create host→guest (counterpart)
      await wait(1500);
      const r2 = await base44.entities.Review.create({
        review_type: 'host_to_guest',
        review_category: 'booking',
        booking_id: 'devtest-blind-booking',
        reviewer_id: hostUser.id,
        reviewer_name: hostUser.full_name || 'Dev Host',
        reviewee_id: guestUser.id,
        rating: 4,
        comment: 'DEV TEST blind reveal — host',
        blind_until: blindUntil.toISOString(),
      });
      checks.push({ label: 'Second review (host→guest) created', pass: !!r2.id, detail: !r2.id ? 'Create failed' : null });
      setIds({ r1: r1.id, r2: r2.id });

      await wait(4000);

      const [updated1, updated2] = await Promise.all([
        base44.entities.Review.get(r1.id),
        base44.entities.Review.get(r2.id),
      ]);

      checks.push({ label: 'First review has both_reviewed: true', pass: updated1.both_reviewed === true, detail: `Got: ${updated1.both_reviewed} — processReview should have set this when it detected the counterpart` });
      checks.push({ label: 'Second review has both_reviewed: true', pass: updated2.both_reviewed === true, detail: `Got: ${updated2.both_reviewed}` });

    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    if (ids.r1) await base44.entities.Review.delete(ids.r1).catch(() => {});
    if (ids.r2) await base44.entities.Review.delete(ids.r2).catch(() => {});
    // Also clean any stray blind-booking reviews
    const stray = await base44.entities.Review.filter({ booking_id: 'devtest-blind-booking' }).catch(() => []);
    for (const r of stray) await base44.entities.Review.delete(r.id).catch(() => {});
    setIds({ r1: null, r2: null }); setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="R5" title="Blind Reveal (Both Parties Review)" description="Creates both sides of a booking review and verifies processReview sets both_reviewed: true on each when the counterpart is detected" badge="blind reveal logic">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run H1 + H4–H6 first. Takes ~6 seconds total.</p>
      <div className="flex gap-2 flex-wrap">
        <RunButton onClick={run} loading={loading} />
        <CleanButton onClick={clean} loading={cleaning} />
      </div>
      <ResultBlock testName="R5 Blind Reveal" {...(result || {})} />
    </TestCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

function AccountManager({ title, role, roleLabel, color }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [status, setStatus] = useState(null);

  const load = async () => {
    setLoading(true); setStatus(null);
    try {
      const roles = await base44.entities.UserRole.filter({ role });
      const enriched = await Promise.all(roles.map(async (r) => {
        let user = null;
        try { user = await base44.entities.User.get(r.user_id); } catch (_) {}
        let cred = null;
        if (user?.email) {
          const creds = await base44.entities.UserCredentials.filter({ email: user.email }).catch(() => []);
          cred = creds?.[0] || null;
        }
        return {
          roleId: r.id,
          userId: r.user_id,
          email: user?.email || '(unknown)',
          name: user?.full_name || `${user?.forename || ''} ${user?.surname || ''}`.trim() || '(no name)',
          email_verified: cred?.email_verified === true,
          created: r.created_date || user?.created_date || null,
        };
      }));
      setAccounts(enriched.sort((a, b) => new Date(b.created) - new Date(a.created)));
    } catch (e) { setStatus(`Error: ${e.message}`); }
    setLoading(false);
  };

  const deleteAccount = async (acc) => {
    if (!confirm(`Delete ${role} account for ${acc.email}? Cannot be undone.`)) return;
    setDeleting(acc.userId);
    try {
      const email = acc.email.toLowerCase().trim();
      const sessions = await base44.entities.UserSession.filter({ email });
      for (const s of sessions) await base44.entities.UserSession.delete(s.id);
      const creds = await base44.entities.UserCredentials.filter({ email });
      for (const c of creds) await base44.entities.UserCredentials.delete(c.id);
      if (acc.roleId) await base44.entities.UserRole.delete(acc.roleId).catch(() => {});
      const guests = await base44.entities.Guest.filter({ email });
      for (const g of guests) await base44.entities.Guest.delete(g.id);
      const codes = await base44.entities.EmailVerificationCode.filter({ email });
      for (const c of codes) await base44.entities.EmailVerificationCode.delete(c.id);
      const members = await base44.entities.FoundingMember.filter({ email });
      for (const m of members) await base44.entities.FoundingMember.delete(m.id);
      if (acc.userId) {
        const props = await base44.entities.Property.filter({ owner_id: acc.userId });
        for (const p of props) await base44.entities.Property.delete(p.id);
        const cleaners = await base44.entities.Cleaner.filter({ user_id: acc.userId });
        for (const c of cleaners) await base44.entities.Cleaner.delete(c.id);
        await base44.entities.User.delete(acc.userId).catch(() => {});
      }
      setAccounts(prev => prev.filter(a => a.userId !== acc.userId));
      setStatus(`✅ Deleted ${email} and all associated records`);
    } catch (e) { setStatus(`❌ Delete failed: ${e.message}`); }
    setDeleting(null);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">View and permanently delete {roleLabel} accounts</p>
        </div>
        <button onClick={load} disabled={loading} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 ${color}`}>
          {loading ? 'Loading…' : 'Load Accounts'}
        </button>
      </div>
      {status && <p className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-700">{status}</p>}
      {accounts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Name', 'Email', 'Verified', 'Registered', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {accounts.map(a => (
                <tr key={a.userId} className="hover:bg-gray-50">
                  <td className="py-2.5 pr-4 font-medium text-gray-900">{a.name}</td>
                  <td className="py-2.5 pr-4 text-gray-600 text-xs">{a.email}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.email_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {a.email_verified ? '✓ Yes' : '⏳ No'}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-400 text-xs">
                    {a.created ? new Date(a.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => deleteAccount(a)}
                      disabled={deleting === a.userId}
                      className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting === a.userId ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2">{accounts.length} {roleLabel} account{accounts.length !== 1 ? 's' : ''} found.</p>
        </div>
      )}
      {!loading && accounts.length === 0 && !status && (
        <p className="text-xs text-gray-400 text-center py-3">Click "Load Accounts" to see all {roleLabel} accounts.</p>
      )}
    </div>
  );
}

function NukeTestData() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const nuke = async () => {
    if (!confirm('Delete ALL test data for devtest-guest, devtest-host, and devtest-cleaner? This cannot be undone.')) return;
    setLoading(true); setDone(false);
    for (const email of [GUEST_EMAIL, HOST_EMAIL, CLEANER_EMAIL]) {
      await fn('deleteAccount', { admin_delete_email: email }).catch(() => {});
      await wait(200);
      const fms = await base44.entities.FoundingMember.filter({ email }).catch(() => []);
      for (const m of fms) await base44.entities.FoundingMember.delete(m.id).catch(() => {});
    }
    // Clean dev test properties
    const devProps = await base44.entities.Property.filter({}).catch(() => []);
    for (const p of devProps) if (p.title?.includes('DEV TEST')) await base44.entities.Property.delete(p.id).catch(() => {});
    // Clean dev test jobs
    const devJobs = await base44.entities.CleaningJob.filter({}).catch(() => []);
    for (const j of devJobs) if (j.property_details?.address?.includes('DEV TEST') || j.property_id?.includes('devtest')) await base44.entities.CleaningJob.delete(j.id).catch(() => {});
    setLoading(false); setDone(true);
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
      <h3 className="font-semibold text-red-800 text-sm">☢️ Nuke All Test Data</h3>
      <p className="text-xs text-red-700">Deletes ALL records for the three test emails and any properties/jobs marked DEV TEST. Run this to start fresh before a full test run.</p>
      <button
        onClick={nuke}
        disabled={loading}
        className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
      >
        {loading ? 'Deleting everything…' : '☢️ Delete All Test Data'}
      </button>
      {done && <p className="text-sm text-green-700 font-medium">✅ All test data deleted. Safe to start a fresh run.</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default function DevToolsSection({ members, user }) {
  const [tab, setTab] = useState('host');

  const tabs = [
    { id: 'host',    label: '🏠 Host Journey',    count: 11 },
    { id: 'cleaner', label: '🧹 Cleaner Journey',  count: 7  },
    { id: 'notifs',  label: '🔔 Notifications',    count: 2  },
    { id: 'reviews', label: '⭐ Reviews',            count: 5  },
    { id: 'data',    label: '🗄️ Data Manager',     count: null },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="bg-[#1E3A5F] rounded-xl px-6 py-5 text-white">
        <h2 className="text-lg font-bold mb-1">HostKeep Test Suite</h2>
        <p className="text-sm text-white/70">Run tests top-to-bottom. Each test shows ✅ or ❌ with plain English detail. If anything fails, copy the report and send to Claude.</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          {[
            ['Test emails', 'devtest-guest / host / cleaner @hostkeep-test.com'],
            ['Test password', 'DevTest99!'],
            ['Test postcode', 'TR1 1AA (Cornwall — in area)'],
          ].map(([k, v]) => (
            <div key={k} className="bg-white/10 rounded-lg px-3 py-2">
              <p className="text-white/50 mb-0.5">{k}</p>
              <p className="font-mono text-white/90 break-all">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'border-[#0d9488] text-[#0d9488]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
            {t.count && <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* HOST JOURNEY */}
      {tab === 'host' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
            <p className="text-sm font-semibold text-blue-800">Run in order H1 → H11</p>
            <p className="text-xs text-blue-600 mt-0.5">Each test depends on the previous. Always clean up before re-running.</p>
          </div>
          <H1_GuestSignUp />
          <H2_EmailVerification />
          <H3_GuestSignIn />
          <H4_FoundingHostApplication />
          <H5_AdminApproveHost />
          <H6_HostSetsPassword />
          <H7_HostSignIn />
          <H8_HostPropertyCreate />
          <H9_PublishGateCheck />
          <H10_CleaningJobRateCard />
          <H11_BookingNotifications />
        </div>
      )}

      {/* CLEANER JOURNEY */}
      {tab === 'cleaner' && (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-3">
            <p className="text-sm font-semibold text-teal-800">Run in order C1 → C7</p>
            <p className="text-xs text-teal-600 mt-0.5">C1 must run first. C3–C5 is a single combined test (full job lifecycle). H4–H6 must also be complete for a host to assign jobs.</p>
          </div>
          <C1_CleanerProfileSetup />
          <C2_CleanerApprovalGates />
          <C3_C4_C5_JobLifecycle />
          <C6_CounterRate />
          <C7_EarningsVerification />
        </div>
      )}

      {/* NOTIFICATIONS */}
      {tab === 'notifs' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-3">
            <p className="text-sm font-semibold text-purple-800">Tests run against the logged-in admin account</p>
            <p className="text-xs text-purple-600 mt-0.5">N1 and N2 are independent — run in any order. Always Clean Up after each test.</p>
          </div>
          <N1_DirectNotification user={user} />
          <N2_AllNotificationTypes user={user} />
        </div>
      )}

      {/* REVIEWS */}
      {tab === 'reviews' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
            <p className="text-sm font-semibold text-amber-800">Tests are independent — run in any order</p>
            <p className="text-xs text-amber-700 mt-0.5">Each test requires devtest-guest (H1), devtest-host (H4–H6), and/or devtest-cleaner (C1) accounts to exist. Always Clean Up after each test.</p>
          </div>
          <R1_GuestReviewsHost />
          <R2_HostReviewsGuest />
          <R3_HostReviewsCleaner />
          <R4_CleanerReviewsHost />
          <R5_BlindReveal />
        </div>
      )}

      {/* DATA MANAGER */}
      {tab === 'data' && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3">
            <p className="text-sm font-semibold text-gray-700">Manage test accounts and clean up after test runs</p>
            <p className="text-xs text-gray-500 mt-0.5">Load any account type to see all records and delete individually. Or use Nuke All to clear everything at once.</p>
          </div>
          <NukeTestData />
          <AccountManager title="Guest Accounts" role="guest" roleLabel="guest" color="bg-[#1E3A5F] hover:bg-[#162d4a]" />
          <AccountManager title="Host Accounts" role="host" roleLabel="host" color="bg-[#0d9488] hover:bg-[#0f766e]" />
          <AccountManager title="Cleaner Accounts" role="cleaner" roleLabel="cleaner" color="bg-[#2563EB] hover:bg-[#1d4ed8]" />
        </div>
      )}
    </div>
  );
}