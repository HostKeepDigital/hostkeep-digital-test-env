import { useState } from 'react';
import { base44 } from '@/api/base44Client';

const APP_ID      = '698eee4108bd1d9467648326';
const GUEST_EMAIL   = 'devtest-guest@hostkeep-test.com';
const HOST_EMAIL    = 'devtest-host@hostkeep-test.com';
const CLEANER_EMAIL = 'devtest-cleaner@hostkeep-test.com';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

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

function CopyButton({ testName, checks, error }) {
  const [copied, setCopied] = useState(false);
  const hasFails = checks.some(c => !c.pass) || error;
  if (!hasFails) return null;
  const lines = [`FAILED TEST: ${testName}`, ''];
  checks.forEach(c => lines.push(`${c.pass ? '✅' : '❌'} ${c.label}${c.detail ? ` — ${c.detail}` : ''}`));
  if (error) lines.push('', `ERROR: ${error}`);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(lines.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-xs font-medium rounded-lg transition-colors">
      {copied ? '✓ Copied!' : '📋 Copy failure report for Claude'}
    </button>
  );
}

function ResultBlock({ testName, checks, error }) {
  if (!checks) return null;
  const allPass = checks.every(c => c.pass) && !error;
  return (
    <div className="space-y-2">
      {checks.map((c, i) => <CheckRow key={i} {...c} />)}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"><p className="text-xs font-semibold text-red-700">Error caught:</p><p className="text-xs text-red-600 mt-1 break-words font-mono">{String(error)}</p></div>}
      <div className={`px-4 py-3 rounded-lg text-sm font-semibold ${allPass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {allPass ? '✅ All checks passed' : '❌ Some checks failed — copy report and send to Claude'}
      </div>
      <CopyButton testName={testName} checks={checks} error={error} />
    </div>
  );
}

function TestCard({ number, title, description, badge, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{number}</span>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
        {badge && <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">{badge}</span>}
      </div>
      <div className="px-6 py-5 space-y-3">{children}</div>
    </div>
  );
}

function RunButton({ onClick, loading, label = 'Run Test' }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="px-5 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors">
      {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
      {loading ? 'Running…' : label}
    </button>
  );
}

function CleanButton({ onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-medium rounded-lg transition-colors">
      {loading ? 'Cleaning…' : '🧹 Clean Up'}
    </button>
  );
}

export function R1_GuestReviewsHost() {
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
        review_type: 'guest_to_host', review_category: 'booking', booking_id: 'devtest-review-booking',
        reviewer_id: guestUser.id, reviewer_name: guestUser.full_name || 'Dev Guest',
        reviewee_id: hostUser.id, rating: 5, comment: 'DEV TEST review', blind_until: blindUntil.toISOString(),
      });
      setReviewId(review.id);
      checks.push({ label: 'Review record created', pass: !!review.id, detail: !review.id ? 'Create failed' : null });
      await wait(3000);
      const updated = await base44.entities.Review.get(review.id);
      checks.push({ label: 'public_visible set by processReview automation', pass: updated.public_visible === true, detail: `Got: ${updated.public_visible}` });
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
      <div className="flex gap-2 flex-wrap"><RunButton onClick={run} loading={loading} /><CleanButton onClick={clean} loading={cleaning} /></div>
      <ResultBlock testName="R1 Guest Reviews Host" {...(result || {})} />
    </TestCard>
  );
}

export function R2_HostReviewsGuest() {
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
        review_type: 'host_to_guest', review_category: 'booking', booking_id: 'devtest-review-booking-2',
        reviewer_id: hostUser.id, reviewer_name: hostUser.full_name || 'Dev Host',
        reviewee_id: guestUser.id, rating: 5, comment: 'DEV TEST review', blind_until: blindUntil.toISOString(),
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
      <div className="flex gap-2 flex-wrap"><RunButton onClick={run} loading={loading} /><CleanButton onClick={clean} loading={cleaning} /></div>
      <ResultBlock testName="R2 Host Reviews Guest" {...(result || {})} />
    </TestCard>
  );
}

export function R3_HostReviewsCleaner() {
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
        review_type: 'host_to_cleaner', review_category: 'cleaning_job', job_id: 'devtest-review-job',
        reviewer_id: hostUser.id, reviewer_name: hostUser.full_name || 'Dev Host',
        reviewee_id: cleanerUser.id, rating: 4, quality_rating: 4, reliability_rating: 5,
        communication_rating: 4, comment: 'DEV TEST review', blind_until: blindUntil.toISOString(),
      });
      setReviewId(review.id);
      checks.push({ label: 'Review record created', pass: !!review.id, detail: !review.id ? 'Create failed' : null });
      await wait(4000);
      const updated = await base44.entities.Review.get(review.id);
      checks.push({ label: 'public_visible set by processReview automation', pass: updated.public_visible === true, detail: `Got: ${updated.public_visible}` });
      const cleanerReviews = await base44.entities.CleanerReview.filter({ job_id: 'devtest-review-job' });
      checks.push({ label: 'CleanerReview record synced', pass: cleanerReviews.length > 0, detail: !cleanerReviews.length ? 'No CleanerReview found for job_id=devtest-review-job' : null });
      const updatedCleaner = await base44.entities.Cleaner.get(cleanerProfile.id);
      checks.push({ label: 'Cleaner.average_rating updated (> 0)', pass: (updatedCleaner.average_rating || 0) > 0, detail: `Got: ${updatedCleaner.average_rating}` });
      checks.push({ label: 'Cleaner.total_reviews is at least 1', pass: (updatedCleaner.total_reviews || 0) >= 1, detail: `Got: ${updatedCleaner.total_reviews}` });
    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    if (reviewId) await base44.entities.Review.delete(reviewId).catch(() => {});
    const synced = await base44.entities.CleanerReview.filter({ job_id: 'devtest-review-job' }).catch(() => []);
    for (const r of synced) await base44.entities.CleanerReview.delete(r.id).catch(() => {});
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
      <div className="flex gap-2 flex-wrap"><RunButton onClick={run} loading={loading} /><CleanButton onClick={clean} loading={cleaning} /></div>
      <ResultBlock testName="R3 Host Reviews Cleaner" {...(result || {})} />
    </TestCard>
  );
}

export function R4_CleanerReviewsHost() {
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
        review_type: 'cleaner_to_host', review_category: 'cleaning_job', job_id: 'devtest-review-job-2',
        reviewer_id: cleanerUser.id, reviewer_name: cleanerUser.full_name || 'Dev Cleaner',
        reviewee_id: hostUser.id, rating: 5, comment: 'DEV TEST review', blind_until: blindUntil.toISOString(),
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
      <div className="flex gap-2 flex-wrap"><RunButton onClick={run} loading={loading} /><CleanButton onClick={clean} loading={cleaning} /></div>
      <ResultBlock testName="R4 Cleaner Reviews Host" {...(result || {})} />
    </TestCard>
  );
}

export function R5_BlindReveal() {
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
      const r1 = await base44.entities.Review.create({
        review_type: 'guest_to_host', review_category: 'booking', booking_id: 'devtest-blind-booking',
        reviewer_id: guestUser.id, reviewer_name: guestUser.full_name || 'Dev Guest',
        reviewee_id: hostUser.id, rating: 4, comment: 'DEV TEST blind reveal — guest', blind_until: blindUntil.toISOString(),
      });
      checks.push({ label: 'First review (guest→host) created', pass: !!r1.id, detail: !r1.id ? 'Create failed' : null });

      await wait(1500);
      const r2 = await base44.entities.Review.create({
        review_type: 'host_to_guest', review_category: 'booking', booking_id: 'devtest-blind-booking',
        reviewer_id: hostUser.id, reviewer_name: hostUser.full_name || 'Dev Host',
        reviewee_id: guestUser.id, rating: 4, comment: 'DEV TEST blind reveal — host', blind_until: blindUntil.toISOString(),
      });
      checks.push({ label: 'Second review (host→guest) created', pass: !!r2.id, detail: !r2.id ? 'Create failed' : null });
      setIds({ r1: r1.id, r2: r2.id });

      await wait(4000);
      const [u1, u2] = await Promise.all([base44.entities.Review.get(r1.id), base44.entities.Review.get(r2.id)]);
      checks.push({ label: 'First review has both_reviewed: true', pass: u1.both_reviewed === true, detail: `Got: ${u1.both_reviewed}` });
      checks.push({ label: 'Second review has both_reviewed: true', pass: u2.both_reviewed === true, detail: `Got: ${u2.both_reviewed}` });
    } catch (e) { error = e?.message || String(e); }
    setLoading(false); setResult({ checks, error });
  };

  const clean = async () => {
    setCleaning(true);
    if (ids.r1) await base44.entities.Review.delete(ids.r1).catch(() => {});
    if (ids.r2) await base44.entities.Review.delete(ids.r2).catch(() => {});
    const stray = await base44.entities.Review.filter({ booking_id: 'devtest-blind-booking' }).catch(() => []);
    for (const r of stray) await base44.entities.Review.delete(r.id).catch(() => {});
    setIds({ r1: null, r2: null }); setResult(null); setCleaning(false);
  };

  return (
    <TestCard number="R5" title="Blind Reveal (Both Parties Review)" description="Creates both sides of a booking review and verifies processReview sets both_reviewed: true when the counterpart is detected" badge="blind reveal logic">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">⚠️ Run H1 + H4–H6 first. Takes ~6 seconds total.</p>
      <div className="flex gap-2 flex-wrap"><RunButton onClick={run} loading={loading} /><CleanButton onClick={clean} loading={cleaning} /></div>
      <ResultBlock testName="R5 Blind Reveal" {...(result || {})} />
    </TestCard>
  );
}