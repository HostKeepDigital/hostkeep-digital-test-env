import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle, AlertTriangle, Loader2, ArrowLeft, TrendingDown, PoundSterling, Home, Star, Shield, Zap } from "lucide-react";

const HOST_LIMIT         = 50;
const CORNWALL_PREFIXES  = ["TR", "PL", "EX"];
const LOGO_URL           = "https://i.ibb.co/6cwz6PzN/Host-Keep-Digital-Navy-Background.png";
const HERO_IMG           = "https://drive.google.com/uc?export=view&id=1ZmljdO7m9HdHdT_KKSa0S-p2e9ctR5BU";

function isCornwallPostcode(postcode) {
  const clean = postcode.trim().toUpperCase().replace(/\s+/g, "");
  return CORNWALL_PREFIXES.some(p => clean.startsWith(p));
}

const HOST_STATS = [
  { value: "16%", label: "Max Airbnb commission", sub: "per booking, every booking" },
  { value: "18%", label: "Booking.com commission", sub: "industry standard" },
  { value: "£3,200", label: "Lost on £20k income", sub: "at 16% commission rate" },
  { value: "£228", label: "HostKeep founding host", sub: "per year — total cost" },
];

const COMPARISONS = [
  { label: "Commission per booking",     airbnb: "3%–16%",     booking: "15%–18%",     hostkeep: "0%" },
  { label: "£15,000 annual income",      airbnb: "Up to £2,400 lost", booking: "Up to £2,700 lost", hostkeep: "You keep £15,000" },
  { label: "£25,000 annual income",      airbnb: "Up to £4,000 lost", booking: "Up to £4,500 lost", hostkeep: "You keep £25,000" },
  { label: "Payout to host",            airbnb: "Platform holds then pays", booking: "Platform holds then pays", hostkeep: "Direct to your account" },
  { label: "Guest surcharges",           airbnb: "12%–15% added to bill", booking: "Varies by property",  hostkeep: "None" },
  { label: "Monthly cost",              airbnb: "£0 + commission", booking: "£0 + commission",    hostkeep: "£19/month (founding)" },
];

const HOST_BENEFITS = [
  "£10/month off your subscription — permanently locked in",
  "Founding Host badge displayed on your profile",
  "Access to the platform before public launch",
  "Shape features and pricing as a founding member",
  "Rate never increases — even when standard prices rise",
  "Priority support as a founding member",
];

export default function FoundingHost() {
  const navigate     = useNavigate();
  const formRef      = useRef(null);
  const [hostCount,  setHostCount  ] = useState(0);
  const [loading,    setLoading    ] = useState(true);
  const [submitting, setSubmitting ] = useState(false);
  const [cornwallWarn, setCornwallWarn] = useState(false);

  const [form, setForm] = useState({
    forename: "", middle_name: "", surname: "",
    email: "", postcode: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    base44.functions.invoke("getFoundingCounts", {})
      .then(res => setHostCount(res.data?.hostCount || 0))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hostFull    = hostCount >= HOST_LIMIT;
  const remaining   = Math.max(0, HOST_LIMIT - hostCount);
  const pct         = Math.min(100, (hostCount / HOST_LIMIT) * 100);
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
        role: "host",
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
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F]/96 via-[#1E3A5F]/85 to-[#0d9488]/50" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 border border-[#0d9488]/50 bg-[#0d9488]/10 rounded-full px-4 py-1.5 mb-6">
              <Home className="w-3.5 h-3.5 text-[#0d9488]" />
              <span className="text-[#0d9488] text-xs font-semibold tracking-widest uppercase">Founding Host Application</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white leading-[0.92] mb-5 tracking-tight">
              Stop giving away<br />
              <span className="text-[#0d9488]">your income.</span>
            </h1>
            <p className="text-white/65 text-lg leading-relaxed mb-8 max-w-lg">
              Every time a guest books through Airbnb or Booking.com, a percentage of your income goes to them. 
              HostKeep charges a flat monthly fee and takes nothing from your bookings.
            </p>
            <div className="bg-white/10 border border-white/20 rounded-xl p-5 mb-8 max-w-sm">
              <div className="flex justify-between text-sm mb-2">
                <span className={hostFull ? "text-red-400 font-semibold" : "text-white/80 font-semibold"}>
                  {hostFull ? "All founding spots claimed" : `${remaining} of ${HOST_LIMIT} spots remaining`}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[#0d9488] transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <button
              onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold px-8 py-4 rounded-xl transition-colors"
            >
              Apply for a founding host spot
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-16 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs font-semibold text-gray-400 tracking-widest uppercase mb-10">The numbers that matter</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {HOST_STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-4xl md:text-5xl font-black text-[#0d9488]">{s.value}</p>
                <p className="text-sm font-semibold text-[#1E3A5F] mt-1">{s.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-[#f4f4f5] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-[#0d9488] tracking-widest uppercase mb-3">The real cost of commission</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#1E3A5F]">How the platforms compare.</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-4 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider w-1/4"></th>
                    <th className="px-5 py-4 text-center">
                      <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Airbnb</span>
                    </th>
                    <th className="px-5 py-4 text-center">
                      <span className="text-xs font-semibold text-orange-500 uppercase tracking-wider">Booking.com</span>
                    </th>
                    <th className="px-5 py-4 text-center bg-teal-50/60">
                      <span className="text-xs font-semibold text-[#0d9488] uppercase tracking-wider">HostKeep</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {COMPARISONS.map(row => (
                    <tr key={row.label} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4 font-medium text-gray-700 text-xs">{row.label}</td>
                      <td className="px-5 py-4 text-center text-xs text-red-600 font-medium">{row.airbnb}</td>
                      <td className="px-5 py-4 text-center text-xs text-orange-600 font-medium">{row.booking}</td>
                      <td className="px-5 py-4 text-center text-xs text-[#0d9488] font-bold bg-teal-50/40">{row.hostkeep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-[#1E3A5F] py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#0d9488]/15 border border-[#0d9488]/30 rounded-full px-4 py-1.5 mb-5">
              <Star className="w-3.5 h-3.5 text-[#0d9488]" fill="currentColor" />
              <span className="text-[#0d9488] text-xs font-semibold tracking-wider uppercase">Founding Host Benefits</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-3">
              <span className="text-[#0d9488]">£19/month.</span> Forever.
            </h2>
            <p className="text-white/50 text-sm">Founding rate locked permanently. Standard price is £29/month.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HOST_BENEFITS.map(b => (
              <div key={b} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                <CheckCircle className="w-4 h-4 text-[#0d9488] flex-shrink-0 mt-0.5" />
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
            <h2 className="text-3xl font-black text-[#1E3A5F] mb-2">Apply for a founding host spot</h2>
            <p className="text-gray-500 text-sm">We review every application. You'll hear back within 48 hours.</p>
          </div>

          {hostFull && (
            <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 text-center">
              <p className="font-semibold text-orange-800 text-sm">All founding host spots have been claimed</p>
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
                    className={`w-full border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition-colors ${errors[key] ? "border-red-300" : "border-gray-200"}`}
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
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition-colors ${errors.email ? "border-red-300" : "border-gray-200"}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Property postcode *</label>
              <input
                type="text"
                value={form.postcode}
                onChange={e => { field("postcode", e.target.value); setCornwallWarn(false); }}
                onBlur={() => { if (form.postcode && !isCornwallPostcode(form.postcode)) setCornwallWarn(true); }}
                placeholder="TR1 1AA"
                className={`w-full border rounded-xl px-4 py-3 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition-colors ${errors.postcode || cornwallWarn ? "border-amber-400" : "border-gray-200"}`}
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
              className="w-full bg-[#0d9488] hover:bg-[#0f766e] disabled:opacity-60 text-white font-bold text-sm rounded-xl py-4 transition-colors flex items-center justify-center gap-2"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                : isOutOfArea ? "Register my interest" : "Apply as a Founding Host"
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
