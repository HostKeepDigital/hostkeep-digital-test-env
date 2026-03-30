import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle, AlertTriangle, Loader2, ArrowLeft, Star, Shield, Users, Sparkles } from "lucide-react";

const CLEANER_LIMIT      = 30;
const CORNWALL_PREFIXES  = ["TR", "PL", "EX"];
const LOGO_URL           = "https://i.ibb.co/6cwz6PzN/Host-Keep-Digital-Navy-Background.png";
const HERO_IMG           = "https://drive.google.com/uc?export=view&id=1Vr07gcaaC19XEmxcvTbq-DTn8PZKn-_a";

function isCornwallPostcode(postcode) {
  const clean = postcode.trim().toUpperCase().replace(/\s+/g, "");
  return CORNWALL_PREFIXES.some(p => clean.startsWith(p));
}

const CLEANER_STATS = [
  { value: "30%",   label: "Agency cut on average",       sub: "of every cleaning fee" },
  { value: "£3,300", label: "Lost per year on £11k income", sub: "at 30% agency rate" },
  { value: "£0",    label: "HostKeep takes from cleans",   sub: "you keep 100% of your rate" },
  { value: "3",     label: "Months free to start",         sub: "founding cleaner benefit" },
];

const PLATFORMS = [
  { label: "What they take",        agency: "20%–40% of your rate",      bark: "£1.50–£30+ per lead",  taskrabbit: "15% service fee",       hostkeep: "0%" },
  { label: "Weekly cleans at £100", agency: "£20–£40 gone per clean",    bark: "Lead costs add up",    taskrabbit: "£15 gone per clean",    hostkeep: "You keep £100" },
  { label: "£10k annual earnings",  agency: "Up to £4,000 taken",        bark: "Hundreds in lead fees", taskrabbit: "£1,500 taken",          hostkeep: "You keep £10,000" },
  { label: "Client ownership",      agency: "Clients belong to agency",  bark: "Platform dependent",   taskrabbit: "Platform dependent",    hostkeep: "Clients are yours" },
  { label: "Monthly cost",          agency: "% of every job",            bark: "Pay per lead",         taskrabbit: "% of every booking",    hostkeep: "From £9.99/month" },
];

const CLEANER_BENEFITS = [
  "First 3 months completely free — no payment needed",
  "Founding Cleaner badge on your CleanKeep profile",
  "Priority listing when hosts search for cleaners",
  "Access before the public launch in Summer 2026",
  "Help shape the CleanKeep platform from day one",
  "Direct booking from hosts — no middleman",
];

const HOW_IT_WORKS = [
  { step: "01", title: "Set your profile", body: "Tell hosts what you do, your availability, your rates, and the areas you cover." },
  { step: "02", title: "Hosts find you", body: "Properties in your area will be able to book you directly through the platform." },
  { step: "03", title: "You get paid", body: "Hosts pay you directly. HostKeep coordinates the booking — takes nothing from the payment." },
];

export default function FoundingCleaner() {
  const navigate       = useNavigate();
  const formRef        = useRef(null);
  const [cleanerCount, setCleanerCount] = useState(0);
  const [loading,      setLoading     ] = useState(true);
  const [submitting,   setSubmitting  ] = useState(false);
  const [cornwallWarn, setCornwallWarn] = useState(false);

  const [form, setForm] = useState({
    forename: "", middle_name: "", surname: "",
    email: "", postcode: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    base44.functions.invoke("getFoundingCounts", {})
      .then(res => setCleanerCount(res.data?.cleanerCount || 0))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cleanerFull = cleanerCount >= CLEANER_LIMIT;
  const remaining   = Math.max(0, CLEANER_LIMIT - cleanerCount);
  const pct         = Math.min(100, (cleanerCount / CLEANER_LIMIT) * 100);
  const getFullName = () => [form.forename.trim(), form.middle_name.trim(), form.surname.trim()].filter(Boolean).join(" ");
  const field       = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isOutOfArea = form.postcode && !isCornwallPostcode(form.postcode);

  const validate = () => {
    const e = {};
    if (!form.forename.trim()) e.forename = "Forename is required.";
    if (!form.surname.trim())  e.surname  = "Surname is required.";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "A valid email is required.";
    if (!form.postcode.trim()) e.postcode = "Postcode is required.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const result = await base44.functions.invoke("registerFoundingMember", {
        full_name: getFullName(),
        email: form.email.toLowerCase().trim(),
        postcode: form.postcode.toUpperCase().trim(),
        role: "cleaner",
      });

      if (result?.error === "duplicate_email") {
        setErrors({ email: "This email is already registered." });
        setSubmitting(false);
        return;
      }

      if (result?.data?.out_of_area || isOutOfArea) {
        navigate("/founding-thankyou?status=out_of_area");
        return;
      }

      try {
        await base44.functions.invoke("sendVerificationCode", {
          email: form.email.toLowerCase().trim(),
          name: form.forename.trim(),
        });
      } catch (_) {}

      navigate("/founding-thankyou");
    } catch {
      setErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1E3A5F]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/founding" className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <img src={LOGO_URL} alt="HostKeep Digital" className="h-9 w-auto" />
          <Link to="/SignIn" className="text-white/50 hover:text-white text-sm transition-colors">Sign In</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 min-h-[70vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Cornwall" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F]/96 via-[#162d4a]/85 to-[#2563EB]/40" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 border border-[#2563EB]/50 bg-[#2563EB]/10 rounded-full px-4 py-1.5 mb-6">
              <Users className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-[#2563EB] text-xs font-semibold tracking-widest uppercase">Founding Cleaner Application</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white leading-[0.92] mb-5 tracking-tight">
              Your skill.<br />
              Your rate.<br />
              <span className="text-[#2563EB]">Your income.</span>
            </h1>
            <p className="text-white/65 text-lg leading-relaxed mb-8 max-w-lg">
              Agencies and platforms take up to 40% of everything you earn. CleanKeep connects you directly with 
              holiday let hosts — you set your rate, you keep what you charge.
            </p>
            <div className="bg-white/10 border border-white/20 rounded-xl p-5 mb-8 max-w-sm">
              <div className="flex justify-between text-sm mb-2">
                <span className={cleanerFull ? "text-red-400 font-semibold" : "text-white/80 font-semibold"}>
                  {cleanerFull ? "All founding spots claimed" : `${remaining} of ${CLEANER_LIMIT} spots remaining`}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[#2563EB] transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <button
              onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold px-8 py-4 rounded-xl transition-colors"
            >
              Apply for a founding cleaner spot
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-16 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs font-semibold text-gray-400 tracking-widest uppercase mb-10">What platforms cost you</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {CLEANER_STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-4xl md:text-5xl font-black text-[#2563EB]">{s.value}</p>
                <p className="text-sm font-semibold text-[#1E3A5F] mt-1">{s.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform comparison */}
      <section className="bg-[#f4f4f5] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-[#2563EB] tracking-widest uppercase mb-3">Platform comparison</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#1E3A5F]">Where does your money go?</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-4 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider"></th>
                    <th className="px-4 py-4 text-center"><span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Agency</span></th>
                    <th className="px-4 py-4 text-center"><span className="text-xs font-semibold text-orange-500 uppercase tracking-wider">Bark.com</span></th>
                    <th className="px-4 py-4 text-center"><span className="text-xs font-semibold text-purple-500 uppercase tracking-wider">TaskRabbit</span></th>
                    <th className="px-4 py-4 text-center bg-blue-50/60"><span className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider">CleanKeep</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {PLATFORMS.map(row => (
                    <tr key={row.label} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4 font-medium text-gray-700 text-xs">{row.label}</td>
                      <td className="px-4 py-4 text-center text-xs text-red-600 font-medium">{row.agency}</td>
                      <td className="px-4 py-4 text-center text-xs text-orange-600 font-medium">{row.bark}</td>
                      <td className="px-4 py-4 text-center text-xs text-purple-600 font-medium">{row.taskrabbit}</td>
                      <td className="px-4 py-4 text-center text-xs text-[#2563EB] font-bold bg-blue-50/40">{row.hostkeep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-[#1E3A5F]">How CleanKeep works.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(({ step, title, body }) => (
              <div key={step} className="text-center p-6">
                <p className="text-5xl font-black text-[#2563EB]/15 mb-4">{step}</p>
                <h3 className="font-bold text-[#1E3A5F] mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-[#1E3A5F] py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#2563EB]/15 border border-[#2563EB]/30 rounded-full px-4 py-1.5 mb-5">
              <Star className="w-3.5 h-3.5 text-[#2563EB]" fill="currentColor" />
              <span className="text-[#2563EB] text-xs font-semibold tracking-wider uppercase">Founding Cleaner Benefits</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-2">
              <span className="text-[#2563EB]">3 months free.</span> Then from £9.99/month.
            </h2>
            <p className="text-white/40 text-sm">Founding cleaner benefits — locked in when you apply.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CLEANER_BENEFITS.map(b => (
              <div key={b} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                <CheckCircle className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
                <span className="text-white/75 text-sm">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section ref={formRef} className="bg-white py-20">
        <div className="max-w-xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-[#1E3A5F] mb-2">Apply for a founding cleaner spot</h2>
            <p className="text-gray-500 text-sm">We review every application. You'll hear back within 48 hours.</p>
          </div>

          {cleanerFull && (
            <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 text-center">
              <p className="font-semibold text-orange-800 text-sm">All founding cleaner spots have been claimed</p>
              <p className="text-xs text-orange-600 mt-1">You can still register — we'll add you to the waitlist.</p>
            </div>
          )}

          {cornwallWarn && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Outside our current area</p>
                <p className="text-xs text-amber-700 mt-0.5">We're launching in Cornwall & Devon first (TR, PL, EX). Register and we'll notify you when we expand.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "forename",    label: "Forename *",  placeholder: "Jane" },
                { key: "middle_name", label: "Middle name", placeholder: "Optional" },
                { key: "surname",     label: "Surname *",   placeholder: "Smith" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
                  <input
                    type="text"
                    value={form[key]}
                    onChange={e => field(key, e.target.value)}
                    placeholder={placeholder}
                    className={`w-full border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB] transition-colors ${errors[key] ? "border-red-300" : "border-gray-200"}`}
                  />
                  {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email address *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => field("email", e.target.value)}
                placeholder="jane@example.com"
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB] transition-colors ${errors.email ? "border-red-300" : "border-gray-200"}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Your home postcode *</label>
              <input
                type="text"
                value={form.postcode}
                onChange={e => { field("postcode", e.target.value); setCornwallWarn(false); }}
                onBlur={() => { if (form.postcode && !isCornwallPostcode(form.postcode)) setCornwallWarn(true); }}
                placeholder="TR1 1AA"
                className={`w-full border rounded-xl px-4 py-3 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB] transition-colors ${errors.postcode || cornwallWarn ? "border-amber-400" : "border-gray-200"}`}
              />
              {errors.postcode && <p className="text-xs text-red-500 mt-1">{errors.postcode}</p>}
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-60 text-white font-bold text-sm rounded-xl py-4 transition-colors flex items-center justify-center gap-2"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                : isOutOfArea ? "Register my interest" : "Apply as a Founding Cleaner"
              }
            </button>

            {/* Stripe note */}
            <div className="border border-gray-100 rounded-xl px-4 py-4 bg-gray-50">
              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  <span className="font-semibold text-gray-500">Payments powered by Stripe.</span>{" "}
                  When you subscribe, you'll create a Stripe account as part of the setup process.
                  Stripe charges a small payment processing fee on guest transactions (typically 1.4% + 25p for European cards).
                  HostKeep receives none of this fee — it goes directly to Stripe for processing.
                </p>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400">
              Applications reviewed within 48 hours · No payment required to apply
            </p>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E3A5F] py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={LOGO_URL} alt="HostKeep Digital" className="h-8 w-auto" />
          <div className="flex gap-6 text-white/40 text-xs">
            <Link to="/PrivacyPolicy" className="hover:text-white/70 transition-colors">Privacy Policy</Link>
            <Link to="/TermsAndConditions" className="hover:text-white/70 transition-colors">Terms</Link>
            <a href="mailto:hello@hostkeepdigital.co.uk" className="hover:text-white/70 transition-colors">hello@hostkeepdigital.co.uk</a>
          </div>
          <p className="text-white/30 text-xs">© 2026 HostKeep Digital Ltd</p>
        </div>
      </footer>
    </div>
  );
}
