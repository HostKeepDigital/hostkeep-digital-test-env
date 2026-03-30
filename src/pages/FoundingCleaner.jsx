import { useState, useEffect, useRef } from "react";
import FoundingFooter from "@/components/founding/FoundingFooter";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle, AlertTriangle, Loader2, ArrowLeft, Users, ArrowRight, Shield } from "lucide-react";

const CLEANER_LIMIT     = 30;
const CORNWALL_PREFIXES = ["TR", "PL", "EX"];
const HERO_IMG          = "https://lh3.googleusercontent.com/d/1dO0GP74-0q34O64CKSL0gGCan9qeELf5";
const LOOE_IMG          = "https://lh3.googleusercontent.com/d/1Vr07gcaaC19XEmxcvTbq-DTn8PZKn-_a";

function isCornwallPostcode(p) {
  return CORNWALL_PREFIXES.some(x => p.trim().toUpperCase().replace(/\s+/g,"").startsWith(x));
}

const COMPARISONS = [
  { label: "What they take",             agency: "20%–40% of your rate",   bark: "£1.50–£30 per lead",     taskrabbit: "15% service fee",     cleankeep: "0%" },
  { label: "Weekly cleans at £100",      agency: "£20–£40 gone per clean", bark: "Lead costs add up fast",  taskrabbit: "£15 gone per clean",  cleankeep: "You keep £100" },
  { label: "£10,000 annual earnings",    agency: "Up to £4,000 taken",     bark: "Hundreds in lead fees",   taskrabbit: "£1,500 taken",        cleankeep: "You keep £10,000" },
  { label: "Your client relationship",   agency: "Clients owned by agency", bark: "Platform dependent",     taskrabbit: "Platform dependent",  cleankeep: "Clients are yours" },
  { label: "Monthly cost to you",        agency: "% of every job",         bark: "Pay per lead",            taskrabbit: "% of each booking",   cleankeep: "From £9.99/month" },
];

const HOW_IT_WORKS = [
  { n: "01", title: "Build your profile",    body: "List your services, rates, service area and availability. Hosts can see your profile and reviews." },
  { n: "02", title: "Hosts find & book you", body: "Holiday let hosts in your area book you directly through the platform — no middleman, no lead fees." },
  { n: "03", title: "You get paid directly", body: "Hosts pay you directly. CleanKeep coordinates the booking and takes nothing from your payment." },
];

const BENEFITS = [
  "First 3 months completely free (founding cleaner benefit)",
  "Founding Cleaner badge on your CleanKeep profile",
  "Priority listing when hosts search for cleaners nearby",
  "Early access before public launch in Summer 2026",
  "Shape the CleanKeep platform from day one",
  "Your rate locked from founding — no price hikes",
];

const INCLUDES = [
  "Public cleaner profile with photos & bio",
  "Service area & availability calendar",
  "Direct messaging with hosts",
  "Review & rating system",
  "Job history & earnings tracking",
  "UK-based support",
];

export default function FoundingCleaner() {
  const navigate = useNavigate();
  const formRef  = useRef(null);
  const [cleanerCount, setCleanerCount] = useState(0);
  const [loading,      setLoading     ] = useState(true);
  const [submitting,   setSubmitting  ] = useState(false);
  const [cornwallWarn, setCornwallWarn] = useState(false);
  const [form, setForm] = useState({ forename: "", middle_name: "", surname: "", email: "", postcode: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    base44.functions.invoke("getFoundingCounts", {})
      .then(r => setCleanerCount(r.data?.cleanerCount || 0))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cleanerFull = cleanerCount >= CLEANER_LIMIT;
  const remaining   = Math.max(0, CLEANER_LIMIT - cleanerCount);
  const pct         = Math.min(100, (cleanerCount / CLEANER_LIMIT) * 100);
  const field       = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const fullName    = () => [form.forename.trim(), form.middle_name.trim(), form.surname.trim()].filter(Boolean).join(" ");
  const isOutOfArea = form.postcode && !isCornwallPostcode(form.postcode);

  const validate = () => {
    const e = {};
    if (!form.forename.trim()) e.forename = "Required";
    if (!form.surname.trim())  e.surname  = "Required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    if (!form.postcode.trim()) e.postcode = "Required";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const result = await base44.functions.invoke("registerFoundingMember", {
        full_name: fullName(), email: form.email.toLowerCase().trim(),
        postcode: form.postcode.toUpperCase().trim(), role: "cleaner",
      });
      if (result?.error === "duplicate_email") { setErrors({ email: "Email already registered." }); setSubmitting(false); return; }
      if (result?.data?.out_of_area || isOutOfArea) { navigate("/founding-thankyou?status=out_of_area"); return; }
      try { await base44.functions.invoke("sendVerificationCode", { email: form.email.toLowerCase().trim(), name: form.forename.trim() }); } catch (_) {}
      navigate("/founding-thankyou");
    } catch { setErrors({ submit: "Something went wrong. Please try again." }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#1E3A5F]">
        <img src={HERO_IMG} alt="Cornwall coastline" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#162d4a] via-[#1E3A5F]/90 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-24">
          <Link to="/founding" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to overview
          </Link>
          <div className="max-w-2xl">
            <span className="inline-block bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider rounded-full px-3 py-1 mb-4">CleanKeep — Founding Cleaner</span>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              Your rate.<br />
              Your clients.<br />
              <span className="text-blue-400">Your income.</span>
            </h1>
            <p className="text-white/70 text-lg mb-6 max-w-xl">
              Agencies take up to 40% of everything you earn. CleanKeep connects you directly with holiday let hosts — you set your rate, you keep every penny.
            </p>

            {/* Spots bar */}
            <div className="bg-white/10 border border-white/20 rounded-xl px-5 py-4 mb-6 max-w-sm">
              <div className="flex justify-between text-sm mb-2">
                <span className={`font-semibold ${cleanerFull ? "text-red-400" : "text-white/80"}`}>
                  {cleanerFull ? "All founding spots claimed" : `${remaining} of ${CLEANER_LIMIT} founding spots remaining`}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <button
              onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Apply for a founding cleaner spot <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* KEY STATS */}
      <section className="bg-blue-600 py-7">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center gap-8 md:gap-16 text-center">
          {[
            { v: "0%",    l: "Taken from your earnings" },
            { v: "Free",  l: "First 3 months (founding)" },
            { v: "£4,000",l: "Saved vs agency (£10k income)" },
            { v: "100%",  l: "Of your rate goes to you" },
          ].map(s => (
            <div key={s.l}>
              <p className="text-2xl font-black text-white">{s.v}</p>
              <p className="text-white/60 text-xs mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Where does your money go?</h2>
          <p className="text-gray-500 text-sm mt-1">How CleanKeep compares to agencies and platforms</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"></th>
                  <th className="px-4 py-3 text-center"><span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Agency</span></th>
                  <th className="px-4 py-3 text-center"><span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Bark.com</span></th>
                  <th className="px-4 py-3 text-center"><span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">TaskRabbit</span></th>
                  <th className="px-4 py-3 text-center bg-blue-50"><span className="text-xs font-bold text-blue-600 uppercase tracking-wider">CleanKeep</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {COMPARISONS.map(row => (
                  <tr key={row.label} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-xs font-medium text-gray-700">{row.label}</td>
                    <td className="px-4 py-3 text-center text-xs text-red-500 font-medium">{row.agency}</td>
                    <td className="px-4 py-3 text-center text-xs text-orange-500 font-medium">{row.bark}</td>
                    <td className="px-4 py-3 text-center text-xs text-purple-500 font-medium">{row.taskrabbit}</td>
                    <td className="px-4 py-3 text-center text-xs font-bold text-blue-600 bg-blue-50/40">{row.cleankeep}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">How CleanKeep works</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {HOW_IT_WORKS.map(({ n, title, body }) => (
              <div key={n} className="bg-white rounded-2xl p-6 border border-gray-100">
                <p className="text-5xl font-black text-blue-100 mb-3">{n}</p>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED + BENEFITS */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">What's included in your subscription</h3>
            <div className="space-y-2.5">
              {INCLUDES.map(i => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 text-sm">
                  <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-gray-700">{i}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="bg-[#1E3A5F] rounded-2xl p-6 text-white h-full">
              <span className="inline-block bg-blue-500/20 border border-blue-400/30 text-blue-400 text-xs font-semibold uppercase tracking-wider rounded-full px-3 py-1 mb-4">Founding Cleaner Benefits</span>
              <p className="text-2xl font-black text-blue-400 mb-0.5">3 months free<span className="text-base font-semibold text-white/50"> then £9.99/mo</span></p>

              <div className="space-y-2.5">
                {BENEFITS.map(b => (
                  <div key={b} className="flex items-start gap-2.5">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white/70 text-sm">{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IMAGE BREAK */}
      <section className="relative h-64 overflow-hidden">
        <img src={LOOE_IMG} alt="Cornwall" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A5F]/80 to-transparent flex items-center">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-white text-2xl font-bold max-w-sm">Connecting Cornwall cleaners with holiday let hosts.</p>
          </div>
        </div>
      </section>

      {/* FORM */}
      <section ref={formRef} className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Apply for a founding cleaner spot</h2>
          <p className="text-gray-500 text-sm mt-1">We review every application and respond within 48 hours. No payment required.</p>
        </div>

        {cleanerFull && (
          <div className="mb-5 bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 text-center text-sm">
            <p className="font-semibold text-orange-800">All founding spots claimed — you'll be added to the waitlist.</p>
          </div>
        )}

        {cornwallWarn && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-amber-800">We're launching in Cornwall & Devon first (TR, PL, EX postcodes). Register and we'll notify you when we expand.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[["forename","Forename *","Jane"],["middle_name","Middle name","Optional"],["surname","Surname *","Smith"]].map(([k,l,p]) => (
              <div key={k}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{l}</label>
                <input type="text" value={form[k]} onChange={e => field(k, e.target.value)} placeholder={p}
                  className={`w-full border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors ${errors[k] ? "border-red-300" : "border-gray-200"}`} />
                {errors[k] && <p className="text-xs text-red-500 mt-1">{errors[k]}</p>}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Email address *</label>
            <input type="email" value={form.email} onChange={e => field("email", e.target.value)} placeholder="jane@example.com"
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors ${errors.email ? "border-red-300" : "border-gray-200"}`} />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Your home postcode *</label>
            <input type="text" value={form.postcode}
              onChange={e => { field("postcode", e.target.value); setCornwallWarn(false); }}
              onBlur={() => { if (form.postcode && !isCornwallPostcode(form.postcode)) setCornwallWarn(true); }}
              placeholder="TR1 1AA"
              className={`w-full border rounded-xl px-4 py-3 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors ${errors.postcode || cornwallWarn ? "border-amber-400" : "border-gray-200"}`} />
            {errors.postcode && <p className="text-xs text-red-500 mt-1">{errors.postcode}</p>}
          </div>

          {errors.submit && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{errors.submit}</div>}

          <button type="submit" disabled={submitting || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl py-3.5 transition-colors flex items-center justify-center gap-2">
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</>
              : isOutOfArea ? "Register my interest" : "Apply as a Founding Cleaner"}
          </button>

          <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <Shield className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 leading-relaxed">
              <span className="font-medium text-gray-500">Payments via Stripe.</span> Stripe charges a small processing fee on transactions (typically 1.4% + 25p for European cards). HostKeep receives none of this.
            </p>
          </div>
          <p className="text-center text-xs text-gray-400">No payment required to apply · Reviewed within 48 hours</p>
        </form>
      </section>
      <FoundingFooter />
    </div>
  );
}