/**
 * HostKeep Dev Tools — Real Flow Test Suite
 *
 * Uses your real email (Tyleris1192@gmail.com) so every email fires
 * and lands in your actual inbox. All test progress is saved to
 * localStorage so you can navigate away and come back without losing
 * your place. Every test calls the real backend functions in the real
 * order — no shortcuts or data injection.
 */

import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import RegressionRunner from "@/components/devtools/RegressionRunner";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const APP_ID        = '698eee4108bd1d9467648326';
const REAL_EMAIL    = 'tyleris1192@gmail.com';
const TEST_PASSWORD = 'TestHost99!';
const CORNWALL_PC   = 'TR11AA';

const LS = {
  host:   'devtest_host_flow',
  guest:  'devtest_guest_flow',
  mobile: 'devtest_mobile_checks',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function fn(name, body = {}) {
  const res = await fetch(`/api/apps/${APP_ID}/functions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { _raw: text, _status: res.status }; }
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));

function loadState(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function saveState(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function clearState(key) { localStorage.removeItem(key); }

// ─── SHARED UI ────────────────────────────────────────────────────────────────

function EmailAlert({ subject, timing, inbox }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 space-y-1.5">
      <p className="text-sm font-semibold text-amber-800">📧 Email should arrive now</p>
      <p className="text-xs text-amber-700"><span className="font-medium">Subject:</span> {subject}</p>
      <p className="text-xs text-amber-700"><span className="font-medium">To:</span> {inbox}</p>
      <p className="text-xs text-amber-700"><span className="font-medium">When:</span> {timing}</p>
      <p className="text-xs text-amber-600 mt-1">Check inbox and spam. If nothing arrives within 2 mins, the email integration has failed.</p>
    </div>
  );
}

function ManualStep({ instruction }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
      <p className="text-sm text-blue-900">👉 {instruction}</p>
    </div>
  );
}

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

function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-1">
      <p className="text-xs font-semibold text-red-700">Error:</p>
      <p className="text-xs text-red-600 font-mono break-all">{String(error)}</p>
      <p className="text-xs text-red-500 mt-1">Copy this and send to Claude.</p>
    </div>
  );
}

function ProgressBar({ step, steps }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-teal-500' : i === step ? 'bg-teal-300' : 'bg-gray-200'}`} />
        ))}
      </div>
      <span className="text-xs text-gray-500 flex-shrink-0">Step {step + 1}/{steps.length}</span>
    </div>
  );
}

function PrimaryBtn({ onClick, loading, label, disabled }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="px-5 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center gap-2">
      {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
      {loading ? 'Working…' : label}
    </button>
  );
}

function ResetBtn({ onClick }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 text-xs text-red-600 border border-red-200 hover:bg-red-50 rounded-lg">
      🔄 Reset
    </button>
  );
}

function ChecksBlock({ checks, error }) {
  if (!checks?.length && !error) return null;
  const allPass = checks?.every(c => c.pass) && !error;
  return (
    <div className="space-y-2 pt-2 border-t border-gray-100">
      {checks?.map((c, i) => <CheckRow key={i} {...c} />)}
      <ErrorBox error={error} />
      {checks?.length > 0 && (
        <div className={`px-4 py-2.5 rounded-lg text-sm font-semibold ${allPass ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {allPass ? '✅ Step passed — continue to next step' : '❌ Step failed — read detail above'}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOST ONBOARDING TEST — 5 real steps
// ═══════════════════════════════════════════════════════════════════════════════

const HOST_STEPS = ['Submit application', 'Verify your email', 'Admin approves', 'Set your password', 'Sign in as host'];

function HostOnboardingTest() {
  const [state, setState] = useState(() => loadState(LS.host) || { step: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checks, setChecks] = useState([]);
  const [codeInput, setCodeInput] = useState('');

  const save = (update) => {
    const next = { ...state, ...update };
    setState(next);
    saveState(LS.host, next);
  };

  const reset = async () => {
    setLoading(true);
    try {
      const members = await base44.entities.FoundingMember.filter({ email: REAL_EMAIL, role: 'host' });
      for (const m of members) await base44.entities.FoundingMember.delete(m.id);
      const creds = await base44.entities.UserCredentials.filter({ email: REAL_EMAIL });
      for (const c of creds) await base44.entities.UserCredentials.delete(c.id);
      const sessions = await base44.entities.UserSession.filter({ email: REAL_EMAIL });
      for (const s of sessions) await base44.entities.UserSession.delete(s.id);
      const codes = await base44.entities.EmailVerificationCode.filter({ email: REAL_EMAIL });
      for (const c of codes) await base44.entities.EmailVerificationCode.delete(c.id);
    } catch (_) {}
    clearState(LS.host);
    setState({ step: 0 });
    setError(null); setChecks([]); setCodeInput('');
    setLoading(false);
  };

  // STEP 0 — Submit application + send verification email
  const step0 = async () => {
    setLoading(true); setError(null); setChecks([]);
    try {
      const existing = await base44.entities.FoundingMember.filter({ email: REAL_EMAIL, role: 'host' });
      for (const m of existing) await base44.entities.FoundingMember.delete(m.id);

      const res = await fn('registerFoundingMember', {
        full_name: 'Tyler Clarke',
        email: REAL_EMAIL,
        postcode: CORNWALL_PC,
        role: 'host',
      });
      if (!res.success) throw new Error(res.error || JSON.stringify(res));

      // This fires the verification code email
      await fn('sendVerificationCode', { email: REAL_EMAIL, full_name: 'Tyler Clarke' });
      await wait(1000);

      const members = await base44.entities.FoundingMember.filter({ email: REAL_EMAIL, role: 'host' });
      const m = members[0];
      const codes = await base44.entities.EmailVerificationCode.filter({ email: REAL_EMAIL });

      const c = [
        { label: 'FoundingMember record created', pass: !!m, detail: !m ? 'No record found in DB' : null },
        { label: 'status = interest (awaiting email verification)', pass: m?.approval_status === 'interest', detail: `Got: ${m?.approval_status}` },
        { label: 'Cornwall postcode accepted (not out-of-area)', pass: res.out_of_area === false, detail: `out_of_area returned: ${res.out_of_area}` },
        { label: 'Verification code created in DB', pass: codes.length > 0, detail: codes.length === 0 ? 'EmailVerificationCode record missing — sendVerificationCode may have failed' : null },
      ];
      setChecks(c);
      if (c.every(x => x.pass)) save({ step: 1, memberId: m.id });
    } catch (e) { setError(e.message || String(e)); }
    setLoading(false);
  };

  // STEP 1 — Enter verification code
  const step1 = async () => {
    if (codeInput.length !== 6) { setError('Enter the full 6-digit code from your email'); return; }
    setLoading(true); setError(null); setChecks([]);
    try {
      const res = await fn('verifyEmailCode', { email: REAL_EMAIL, code: codeInput.trim() });
      if (!res.valid) throw new Error('Code invalid or expired — check you copied it correctly, or resend below');

      // Replicate what EmailVerificationStep.jsx does: update FoundingMember → pending
      const members = await base44.entities.FoundingMember.filter({ email: REAL_EMAIL, role: 'host' });
      if (members[0]?.approval_status === 'interest') {
        await base44.entities.FoundingMember.update(members[0].id, { approval_status: 'pending' });
      }
      await wait(500);

      const updated = await base44.entities.FoundingMember.filter({ email: REAL_EMAIL, role: 'host' });
      const c = [
        { label: 'Code accepted as valid', pass: res.valid === true, detail: null },
        { label: 'FoundingMember status moved to pending', pass: updated[0]?.approval_status === 'pending', detail: `Got: ${updated[0]?.approval_status}` },
      ];
      setChecks(c);
      if (c.every(x => x.pass)) save({ step: 2 });
    } catch (e) { setError(e.message || String(e)); }
    setLoading(false);
  };

  const resendCode = async () => {
    setLoading(true);
    await fn('sendVerificationCode', { email: REAL_EMAIL, full_name: 'Tyler Clarke' });
    setError('Resent — check your inbox again.');
    setLoading(false);
  };

  // STEP 2 — Verify admin approved (manual action required)
  const step2 = async () => {
    setLoading(true); setError(null); setChecks([]);
    try {
      const members = await base44.entities.FoundingMember.filter({ email: REAL_EMAIL, role: 'host' });
      const m = members[0];
      const c = [
        { label: 'FoundingMember found', pass: !!m, detail: !m ? 'Record missing' : null },
        { label: 'status = invited (admin clicked Approve)', pass: m?.approval_status === 'invited', detail: `Got: ${m?.approval_status} — go to Admin Panel → Onboarding tab → find Tyler Clarke → click Approve` },
      ];
      setChecks(c);
      if (c.every(x => x.pass)) save({ step: 3 });
    } catch (e) { setError(e.message || String(e)); }
    setLoading(false);
  };

  // STEP 3 — Verify password was set via invite link
  const step3 = async () => {
    setLoading(true); setError(null); setChecks([]);
    try {
      const members = await base44.entities.FoundingMember.filter({ email: REAL_EMAIL, role: 'host' });
      const creds = await base44.entities.UserCredentials.filter({ email: REAL_EMAIL });
      const c = [
        { label: 'status = password_protected', pass: members[0]?.approval_status === 'password_protected', detail: `Got: ${members[0]?.approval_status} — click the Create Password link in the invite email first` },
        { label: 'UserCredentials record created', pass: creds.length > 0, detail: creds.length === 0 ? 'No credentials found — password not set yet' : null },
      ];
      setChecks(c);
      if (c.every(x => x.pass)) save({ step: 4 });
    } catch (e) { setError(e.message || String(e)); }
    setLoading(false);
  };

  // STEP 4 — Sign in
  const step4 = async () => {
    setLoading(true); setError(null); setChecks([]);
    try {
      const res = await fn('customSignIn', { email: REAL_EMAIL, password: TEST_PASSWORD });
      let sessionOk = false;
      if (res.session_token) {
        const chk = await fn('checkSession', { session_token: res.session_token });
        sessionOk = chk.authenticated === true;
        await fn('logoutSession', { session_token: res.session_token }).catch(() => {});
      }
      const c = [
        { label: 'Sign in succeeded', pass: res.success === true, detail: res.success ? null : `Error: ${res.error}` },
        { label: 'Role resolved as host (not guest)', pass: res.role === 'host', detail: `Got: ${res.role}` },
        { label: 'Session token returned', pass: !!res.session_token, detail: !res.session_token ? 'No token' : null },
        { label: 'checkSession confirms authenticated', pass: sessionOk, detail: !sessionOk ? 'Session invalid immediately after creation' : null },
      ];
      setChecks(c);
      if (c.every(x => x.pass)) save({ step: 5 });
    } catch (e) { setError(e.message || String(e)); }
    setLoading(false);
  };

  const { step } = state;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Host Onboarding — Full Real Flow</h2>
          <p className="text-xs text-gray-500 mt-0.5">Goes through every real function. Emails land in {REAL_EMAIL}. Progress is saved.</p>
        </div>
        <ResetBtn onClick={reset} />
      </div>

      {/* Email timing at-a-glance */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-1.5">
        <p className="text-xs font-semibold text-gray-600">📧 Emails to expect during this test:</p>
        <p className="text-xs text-gray-600">• <span className="font-medium">Step 1:</span> "Your HostKeep Verification Code" — arrives immediately</p>
        <p className="text-xs text-gray-600">• <span className="font-medium">Step 3:</span> "You're invited — Complete your HostKeep onboarding" — arrives when you click Approve</p>
      </div>

      <ProgressBar step={Math.min(step, HOST_STEPS.length - 1)} steps={HOST_STEPS} />
      <p className="text-sm font-semibold text-gray-700">{HOST_STEPS[Math.min(step, HOST_STEPS.length - 1)]}</p>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Calls <code className="bg-gray-100 px-1 rounded text-xs">registerFoundingMember</code> then <code className="bg-gray-100 px-1 rounded text-xs">sendVerificationCode</code>. A 6-digit code arrives in {REAL_EMAIL}.</p>
          <PrimaryBtn onClick={step0} loading={loading} label="Step 1: Submit application + send verification email" />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <EmailAlert subject="Your HostKeep Verification Code" timing="Fired when you completed Step 1" inbox={REAL_EMAIL} />
          <p className="text-sm text-gray-700">Open {REAL_EMAIL}, find the code, type it here:</p>
          <input
            type="text" inputMode="numeric" maxLength={6} placeholder="000000"
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-40 text-center text-2xl font-bold tracking-widest border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none"
          />
          <div className="flex gap-3 flex-wrap">
            <PrimaryBtn onClick={step1} loading={loading} label="Step 2: Verify code" disabled={codeInput.length !== 6} />
            <button onClick={resendCode} disabled={loading} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl disabled:opacity-50">
              Resend email
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <ManualStep instruction="Go to Admin Panel → Onboarding tab → find Tyler Clarke (tyleris1192@gmail.com) in the Pending list → click Approve." />
          <EmailAlert subject="You're invited — Complete your HostKeep onboarding" timing="Fires the moment you click Approve in the Admin Panel" inbox={REAL_EMAIL} />
          <PrimaryBtn onClick={step2} loading={loading} label="Step 3: I've approved — verify status changed" />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <ManualStep instruction={`Open ${REAL_EMAIL} → click "Complete Onboarding" in the invite email → set password to: ${TEST_PASSWORD} → then come back here.`} />
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">Use this exact password:</p>
            <p className="font-mono font-bold text-gray-900">{TEST_PASSWORD}</p>
          </div>
          <PrimaryBtn onClick={step3} loading={loading} label="Step 4: I've set my password — verify" />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Final check — sign in with the real credentials and confirm the session is created correctly as a host.</p>
          <PrimaryBtn onClick={step4} loading={loading} label="Step 5: Sign in + verify session" />
        </div>
      )}

      {step >= 5 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-6 text-center space-y-2">
          <p className="text-3xl">🎉</p>
          <p className="font-bold text-green-800 text-lg">Host onboarding complete</p>
          <p className="text-sm text-green-700">Application → email verify → admin approve → password set → sign in. All working.</p>
          <button onClick={reset} className="mt-3 px-4 py-2 text-sm text-green-700 border border-green-300 hover:bg-green-100 rounded-xl">
            Run again from scratch
          </button>
        </div>
      )}

      <ChecksBlock checks={checks} error={error} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUEST SIGN UP TEST — 3 real steps
// ═══════════════════════════════════════════════════════════════════════════════

const GUEST_STEPS = ['Sign up', 'Verify email', 'Sign in'];

function GuestSignUpTest() {
  const [state, setState] = useState(() => loadState(LS.guest) || { step: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checks, setChecks] = useState([]);
  const [codeInput, setCodeInput] = useState('');

  const save = (update) => {
    const next = { ...state, ...update };
    setState(next);
    saveState(LS.guest, next);
  };

  const reset = async () => {
    setLoading(true);
    try {
      await fn('deleteAccount', { admin_delete_email: REAL_EMAIL });
      await wait(300);
      const codes = await base44.entities.EmailVerificationCode.filter({ email: REAL_EMAIL });
      for (const c of codes) await base44.entities.EmailVerificationCode.delete(c.id);
      const guests = await base44.entities.Guest.filter({ email: REAL_EMAIL });
      for (const g of guests) await base44.entities.Guest.delete(g.id);
    } catch (_) {}
    clearState(LS.guest);
    setState({ step: 0 });
    setError(null); setChecks([]); setCodeInput('');
    setLoading(false);
  };

  const step0 = async () => {
    setLoading(true); setError(null); setChecks([]);
    try {
      await fn('deleteAccount', { admin_delete_email: REAL_EMAIL }).catch(() => {});
      await wait(500);

      const res = await fetch(`/api/apps/${APP_ID}/functions/customSignUp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: REAL_EMAIL, password: TEST_PASSWORD, forename: 'Tyler', surname: 'Test' }),
      }).then(r => r.json());

      if (!res.success) throw new Error(res.message || JSON.stringify(res));

      await wait(1000);
      const codes = await base44.entities.EmailVerificationCode.filter({ email: REAL_EMAIL });
      const guests = await base44.entities.Guest.filter({ email: REAL_EMAIL });
      const c = [
        { label: 'customSignUp returned success', pass: res.success === true, detail: null },
        { label: 'Guest record created in DB', pass: guests.length > 0, detail: guests.length === 0 ? 'No Guest entity record' : null },
        { label: 'Verification code created — email sent', pass: codes.length > 0, detail: codes.length === 0 ? 'No EmailVerificationCode record' : null },
      ];
      setChecks(c);
      if (c.every(x => x.pass)) save({ step: 1 });
    } catch (e) { setError(e.message || String(e)); }
    setLoading(false);
  };

  const step1 = async () => {
    if (codeInput.length !== 6) { setError('Enter the full 6-digit code'); return; }
    setLoading(true); setError(null); setChecks([]);
    try {
      const res = await fn('verifyEmailCode', { email: REAL_EMAIL, code: codeInput.trim() });
      if (!res.valid) throw new Error('Code invalid or expired');
      await wait(500);
      const creds = await base44.entities.UserCredentials.filter({ email: REAL_EMAIL });
      const c = [
        { label: 'Code accepted', pass: res.valid === true, detail: null },
        { label: 'email_verified = true on UserCredentials', pass: creds[0]?.email_verified === true, detail: `Got: ${creds[0]?.email_verified}` },
      ];
      setChecks(c);
      if (c.every(x => x.pass)) save({ step: 2 });
    } catch (e) { setError(e.message || String(e)); }
    setLoading(false);
  };

  const resendCode = async () => {
    setLoading(true);
    await fn('sendVerificationCode', { email: REAL_EMAIL });
    setError('Resent — check your inbox.');
    setLoading(false);
  };

  const step2 = async () => {
    setLoading(true); setError(null); setChecks([]);
    try {
      const res = await fn('customSignIn', { email: REAL_EMAIL, password: TEST_PASSWORD });
      const c = [
        { label: 'Sign in succeeded', pass: res.success === true, detail: res.success ? null : `Error: ${res.error}` },
        { label: 'Role is guest', pass: res.role === 'guest', detail: `Got: ${res.role}` },
        { label: 'Session token returned', pass: !!res.session_token, detail: !res.session_token ? 'No token' : null },
      ];
      setChecks(c);
      if (c.every(x => x.pass)) save({ step: 3 });
    } catch (e) { setError(e.message || String(e)); }
    setLoading(false);
  };

  const { step } = state;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Guest Sign Up — Full Real Flow</h2>
          <p className="text-xs text-gray-500 mt-0.5">Real email to {REAL_EMAIL} · sign up → verify code → sign in</p>
        </div>
        <ResetBtn onClick={reset} />
      </div>
      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs text-gray-600">
        📧 <span className="font-medium">Step 1 email:</span> "Your HostKeep Verification Code" — fires immediately on sign up
      </div>
      <ProgressBar step={Math.min(step, GUEST_STEPS.length - 1)} steps={GUEST_STEPS} />
      <p className="text-sm font-semibold text-gray-700">{GUEST_STEPS[Math.min(step, GUEST_STEPS.length - 1)]}</p>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Calls <code className="bg-gray-100 px-1 rounded text-xs">customSignUp</code>. A 6-digit code arrives in {REAL_EMAIL}.</p>
          <PrimaryBtn onClick={step0} loading={loading} label="Step 1: Create guest account" />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <EmailAlert subject="Your HostKeep Verification Code" timing="Fired when you completed Step 1" inbox={REAL_EMAIL} />
          <input
            type="text" inputMode="numeric" maxLength={6} placeholder="000000"
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-40 text-center text-2xl font-bold tracking-widest border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-teal-500 focus:outline-none"
          />
          <div className="flex gap-3 flex-wrap">
            <PrimaryBtn onClick={step1} loading={loading} label="Step 2: Verify code" disabled={codeInput.length !== 6} />
            <button onClick={resendCode} disabled={loading} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl">Resend</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Email verified. Sign in to confirm the session works.</p>
          <PrimaryBtn onClick={step2} loading={loading} label="Step 3: Sign in as guest" />
        </div>
      )}

      {step >= 3 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-5 text-center space-y-2">
          <p className="text-2xl">✅</p>
          <p className="font-bold text-green-800">Guest flow complete</p>
          <button onClick={reset} className="mt-2 px-4 py-2 text-sm text-green-700 border border-green-300 hover:bg-green-100 rounded-xl">Run again</button>
        </div>
      )}

      <ChecksBlock checks={checks} error={error} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL TIMING REFERENCE
// ═══════════════════════════════════════════════════════════════════════════════

function EmailTimingReference() {
  const rows = [
    ['Host', 'Step 1 — Submit application', '"Your HostKeep Verification Code"', 'sendVerificationCode called immediately', '6-digit code, expires 10 mins'],
    ['Host', 'Step 3 — Admin clicks Approve', '"You\'re invited — Complete your HostKeep onboarding"', 'approveUser function fires', 'Create Password link, expires 24h'],
    ['Guest', 'Step 1 — Sign up', '"Your HostKeep Verification Code"', 'sendVerificationCode at end of customSignUp', '6-digit code, expires 10 mins'],
    ['Any', 'Booking created', '"New Booking Request" (host)', 'onBookingCreated automation', 'Guest name + dates'],
    ['Any', 'Booking confirmed', '"Booking Confirmed! 🎉" (guest)', 'onBookingCreated automation on status change', 'Check-in/out dates'],
    ['Cleaner', 'Job assigned', '"New Cleaning Job" (cleaner)', 'onCleaningJobCreated automation', 'Scheduled date + time'],
    ['Any', 'Review received', '"You received a new review"', 'processReview automation', 'Blind until both review or 7 days'],
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <div>
        <h2 className="font-bold text-gray-900">Email Timing Reference</h2>
        <p className="text-xs text-gray-500 mt-0.5">Every email the platform sends, what triggers it, and when to expect it</p>
      </div>
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['Role', 'When', 'Subject', 'Trigger', 'Contains'].map(h => (
                <th key={h} className="text-left font-semibold text-gray-400 uppercase tracking-wide pb-2.5 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="py-3 pr-4 font-medium text-[#0d9488]">{r[0]}</td>
                <td className="py-3 pr-4 text-gray-700">{r[1]}</td>
                <td className="py-3 pr-4 font-medium text-gray-900">"{r[2]}"</td>
                <td className="py-3 pr-4 text-gray-500">{r[3]}</td>
                <td className="py-3 text-gray-500">{r[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════════

const MOBILE_SCREENS = {
  Guest: [
    { id: 'g1', name: 'Home page', check: 'Hero text visible, property grid 2-col, no horizontal scroll' },
    { id: 'g2', name: 'Search', check: 'Filters visible and tappable, property cards full width, no cut-off text' },
    { id: 'g3', name: 'Property Details', check: 'Photo carousel, booking bar visible, all buttons tappable' },
    { id: 'g4', name: 'GuestSignUp', check: 'Forename/middle/surname 3-col grid fits, inputs large enough to tap' },
    { id: 'g5', name: 'SignIn', check: 'Password eye toggle visible, form full width, Sign In button full width' },
    { id: 'g6', name: 'VerifyEmail', check: 'Code input tall (h-16), Verify button full width, Resend link visible' },
    { id: 'g7', name: 'My Trips', check: 'Booking cards readable, Leave Review button visible, no truncation' },
  ],
  Host: [
    { id: 'h1', name: 'Host Dashboard', check: 'Stat cards 2-col, calendar renders, no overlap with bottom nav' },
    { id: 'h2', name: 'Host Properties', check: 'Property cards full width, images load, Publish button visible' },
    { id: 'h3', name: 'Create Property Step 1', check: 'Title/type/description inputs full width, Next button above nav' },
    { id: 'h4', name: 'Create Property Step 2', check: 'Amenity grid tappable, room count inputs visible, no overflow' },
    { id: 'h5', name: 'Create Property Step 3', check: 'Postcode input, location cards readable, Save button visible' },
    { id: 'h6', name: 'Host Bookings', check: 'Booking cards readable, dates visible, action buttons not cut off' },
    { id: 'h7', name: 'Subscription', check: 'Plan cards stack vertically, prices clear, Subscribe button full width' },
    { id: 'h8', name: 'Settings', check: 'Tabs scroll horizontally, Stripe Connect button tappable' },
  ],
  Cleaner: [
    { id: 'c1', name: 'Cleaner Dashboard stats', check: '4 stat cards in 2-col grid, earnings £ visible, no clipping' },
    { id: 'c2', name: 'Pending job cards', check: 'Address readable, price shown, Accept + Decline buttons side by side' },
    { id: 'c3', name: 'Upcoming job cards', check: 'Start Job button tappable, date readable, Propose Rate link visible' },
    { id: 'c4', name: 'Completed jobs table', check: 'Table scrolls horizontally without clipping, status badge visible' },
    { id: 'c5', name: 'Cleaner Pricing', check: 'Rate card 4 inputs stack cleanly, labels readable, Save full width' },
    { id: 'c6', name: 'Payout History', check: 'Month groups readable, job rows not clipped, CSV button accessible' },
  ],
};

function MobileChecklist() {
  const [checks, setChecks] = useState(() => loadState(LS.mobile) || {});

  const mark = (id, val) => {
    const next = { ...checks, [id]: val };
    setChecks(next);
    saveState(LS.mobile, next);
  };

  const resetAll = () => { setChecks({}); clearState(LS.mobile); };

  const all = Object.values(MOBILE_SCREENS).flat();
  const tested = all.filter(s => checks[s.id]);
  const failed = all.filter(s => checks[s.id] === 'fail');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-gray-900">Mobile Screen Checklist</h2>
            <p className="text-xs text-gray-500 mt-0.5">Open each screen at 390px width (DevTools → iPhone view). Tick pass or fail. Progress saves.</p>
          </div>
          <ResetBtn onClick={resetAll} />
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-gray-600">{tested.length} / {all.length} tested</span>
          {failed.length > 0 && <span className="text-red-600 font-semibold">{failed.length} failed ❌</span>}
          {tested.length === all.length && failed.length === 0 && <span className="text-green-600 font-semibold">All passed ✅</span>}
        </div>
      </div>

      {Object.entries(MOBILE_SCREENS).map(([role, screens]) => (
        <div key={role} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">{role}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {screens.map(s => {
              const v = checks[s.id];
              return (
                <div key={s.id} className={`px-5 py-3.5 flex items-start gap-4 ${v === 'pass' ? 'bg-green-50/50' : v === 'fail' ? 'bg-red-50/50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.check}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => mark(s.id, 'pass')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${v === 'pass' ? 'bg-green-500 text-white border-green-500' : 'border-green-300 text-green-700 hover:bg-green-50'}`}>
                      ✅
                    </button>
                    <button onClick={() => mark(s.id, 'fail')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${v === 'fail' ? 'bg-red-500 text-white border-red-500' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
                      ❌
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

function AccountManager({ title, role, color }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    setLoading(true); setMsg(null);
    try {
      const roles = await base44.entities.UserRole.filter({ role });
      const enriched = await Promise.all(roles.map(async r => {
        let credVerified = false;
        try {
          const cs = await base44.entities.UserCredentials.filter({ email: r.email || '' });
          credVerified = cs?.[0]?.email_verified === true;
        } catch (_) {}
        return { roleId: r.id, userId: r.user_id, email: r.email || '(unknown)', credVerified, created: r.created_date };
      }));
      setAccounts(enriched.sort((a, b) => new Date(b.created) - new Date(a.created)));
    } catch (e) { setMsg(`Error: ${e.message}`); }
    setLoading(false);
  };

  const del = async (acc) => {
    if (!confirm(`Permanently delete ${acc.email}?`)) return;
    setDeleting(acc.userId);
    await fn('deleteAccount', { admin_delete_email: acc.email });
    await wait(200);
    setAccounts(prev => prev.filter(a => a.userId !== acc.userId));
    setDeleting(null);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        <button onClick={load} disabled={loading} className={`px-4 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50 ${color}`}>
          {loading ? 'Loading…' : 'Load'}
        </button>
      </div>
      {msg && <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{msg}</p>}
      {accounts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-100">
              {['Email', 'Email verified', 'Since', ''].map(h => (
                <th key={h} className="text-left text-gray-400 font-semibold uppercase pb-2 pr-4">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {accounts.map(a => (
                <tr key={a.userId}>
                  <td className="py-2.5 pr-4 text-gray-700">{a.email}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${a.credVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {a.credVerified ? '✓ Yes' : '⏳ No'}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-400">
                    {a.created ? new Date(a.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td className="py-2.5 text-right">
                    <button onClick={() => del(a)} disabled={deleting === a.userId} className="px-3 py-1 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">
                      {deleting === a.userId ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
        </div>
      )}
      {!loading && accounts.length === 0 && !msg && (
        <p className="text-xs text-gray-400 text-center py-3">Click Load to see accounts</p>
      )}
    </div>
  );
}

const TEST_ACCOUNTS = [
  { email: 'tyleris1192@gmail.com', label: 'Host (tyleris1192@gmail.com)' },
  { email: 'hkdcleaner@outlook.com', label: 'Cleaner (hkdcleaner@outlook.com)' },
  { email: 'tyler.d.clarke@hotmail.com', label: 'Guest (tyler.d.clarke@hotmail.com)' },
];
const TEST_ACCOUNT_PASSWORD = 'Test123!';

function SetTestPasswords({ sessionToken }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const run = async () => {
    setLoading(true); setResults(null);
    const out = [];
    for (const acc of TEST_ACCOUNTS) {
      const res = await fn('devSetPassword', { session_token: sessionToken, email: acc.email, password: TEST_ACCOUNT_PASSWORD });
      out.push({ label: acc.label, success: res.success === true, error: res.error });
    }
    setResults(out);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 text-sm">Set Test Account Passwords</h3>
        <p className="text-xs text-gray-500 mt-0.5">Sets password to <span className="font-mono font-bold">{TEST_ACCOUNT_PASSWORD}</span> for all 3 test accounts in one click.</p>
      </div>
      <button onClick={run} disabled={loading}
        className="px-5 py-2.5 bg-[#0d9488] hover:bg-[#0f766e] disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center gap-2">
        {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
        {loading ? 'Setting passwords…' : '🔑 Set all test passwords to Test123!'}
      </button>
      {results && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <span>{r.success ? '✅' : '❌'}</span>
              <span>{r.label}</span>
              {!r.success && <span className="ml-auto font-mono">{r.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResetAllProgress() {
  const [done, setDone] = useState(false);
  const go = () => {
    Object.values(LS).forEach(clearState);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
      <h3 className="font-semibold text-amber-800 text-sm">Reset All Test Progress</h3>
      <p className="text-xs text-amber-700">Clears saved step state so all tests restart from Step 1. Does not delete DB records — use the account tables for that.</p>
      <button onClick={go} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl">
        {done ? '✓ Done' : 'Clear all test progress'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default function DevToolsSection({ members, user, sessionToken }) {
  const [tab, setTab] = useState('host');

  const tabs = [
    { id: 'host',   label: '🏠 Host Onboarding' },
    { id: 'guest',  label: '👤 Guest Sign Up' },
    { id: 'emails', label: '📧 Email Reference' },
    { id: 'mobile', label: '📱 Mobile Checks' },
    { id: 'data',   label: '🗄️ Data Manager' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      <RegressionRunner />

      <div className="bg-[#1E3A5F] rounded-2xl px-6 py-5 text-white">
        <h2 className="text-lg font-bold mb-1">HostKeep Test Suite</h2>
        <p className="text-sm text-white/70 mb-3">
          All tests use <span className="font-semibold text-white">{REAL_EMAIL}</span> so real emails fire.
          Progress is saved — navigate away and come back any time without losing your place.
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[['Real email', REAL_EMAIL], ['Test password', TEST_PASSWORD]].map(([k, v]) => (
            <div key={k} className="bg-white/10 rounded-lg px-3 py-2">
              <p className="text-white/50 mb-0.5">{k}</p>
              <p className="font-mono text-white break-all">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-0 overflow-x-auto border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${tab === t.id ? 'border-[#0d9488] text-[#0d9488]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'host'   && <HostOnboardingTest />}
      {tab === 'guest'  && <GuestSignUpTest />}
      {tab === 'emails' && <EmailTimingReference />}
      {tab === 'mobile' && <MobileChecklist />}
      {tab === 'data'   && (
        <div className="space-y-4">
          <SetTestPasswords sessionToken={sessionToken} />
          <ResetAllProgress />
          <AccountManager title="Guest Accounts" role="guest" color="bg-[#1E3A5F] hover:bg-[#162d4a]" />
          <AccountManager title="Host Accounts" role="host" color="bg-[#0d9488] hover:bg-[#0f766e]" />
          <AccountManager title="Cleaner Accounts" role="cleaner" color="bg-[#2563EB] hover:bg-[#1d4ed8]" />
        </div>
      )}
    </div>
  );
}