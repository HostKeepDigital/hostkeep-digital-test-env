import { useState, useEffect, useRef } from "react";
import FoundingFooter from "@/components/founding/FoundingFooter";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { CheckCircle, AlertTriangle, Loader2, ArrowLeft, Home, ArrowRight, Shield } from "lucide-react";

const HOST_LIMIT        = 50;
const CORNWALL_PREFIXES = ["TR", "PL", "EX"];
const HERO_IMG          = "https://lh3.googleusercontent.com/d/1rRoDfT5XKQW3TtRwulxbIJoo7LJi98gK";
const LOOE_IMG          = "https://raw.githubusercontent.com/HostKeepDigital/hostkeep-assets/main/Mevagissey.jpeg";

function isCornwallPostcode(p) {
  return CORNWALL_PREFIXES.some(x => p.trim().toUpperCase().replace(/\s+/g,"").startsWith(x));
}

const COMPARISONS = [
  { label: "Commission per booking",  airbnb: "3%–16%",            booking: "15%–18%",            hostkeep: "0%" },
  { label: "£15,000 annual income",   airbnb: "Up to £2,400 lost", booking: "Up to £2,700 lost",  hostkeep: "You keep £15,000" },
  { label: "£25,000 annual income",   airbnb: "Up to £4,000 lost", booking: "Up to £4,500 lost",  hostkeep: "You keep £25,000" },
  { label: "Payout timing",           airbnb: "Platform holds",    booking: "Platform holds",      hostkeep: "Direct, 24hrs after check-in" },
  { label: "Guest surcharges",        airbnb: "12%–15% added",     booking: "Varies",              hostkeep: "None" },
  { label: "Your monthly cost",       airbnb: "£0 + commission",   booking: "£0 + commission",     hostkeep: "£19/mo (founding)" },
];

const BENEFITS = [
  "Founding rate of £19/month — locked permanently (standard is £29/month)",
  "Founding Host badge on your public profile",
  "Early access before public launch",
  "Shape the platform — direct input into features",
  "Priority support as a founding member",
  "Rate never increases, even as standard pricing rises",
];

const INCLUDES = [
  "Property listing with photos, description & amenities",
  "Booking calendar & availability management",
  "Guest messaging & booking requests",
  "Cleaner coordination & scheduling",
  "Review system for guests & hosts",
  "UK-based support",
];

const FOUNDING_PLANS = [
  { name: "Solo Host", price: 19, standard: 29, limit: "1 property", id: "founding_host_solo" },
  { name: "Multi Host", price: 49, standard: 59, limit: "Up to 5 properties", id: "founding_host_multi" },
  { name: "Portfolio Host", price: 89, standard: 99, limit: "Unlimited properties", id: "founding_host_portfolio" },
];

export default function FoundingHost() {
  const navigate = useNavigate();
  const formRef  = useRef(null);
  const { user, isAuthenticated, roles } = useAuth();
  const [hostCount,    setHostCount   ] = useState(0);
  const [loading,      setLoading     ] = useState(true);
  const [submitting,   setSubmitting  ] = useState(false);
  const [cornwallWarn, setCornwallWarn] = useState(false);
  const isGuest = isAuthenticated && roles?.some(r => r.role === 'guest' && r.approval_status === 'approved');
  const [refCode, setRefCode] = useState("");
  const [form, setForm] = useState({ forename: '', middle_name: '', surname: '', email: '', postcode: '' });

  useEffect(() => {
    if (isGuest && user) {
      setForm(f => ({
        ...f,
        forename: user.forename || '',
        surname: user.surname || '',
        email: user.email || '',
      }));
    }
  }, [isGuest, user]);
  const [errors, setErrors] = useState({});
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setRefCode(ref.toUpperCase());
  }, []);

  useEffect(() => {
    base44.functions.invoke("getFoundingCounts", {})
      .then(r => setHostCount(r.data?.hostCount || 0))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hostFull  = hostCount >= HOST_LIMIT;
  const remaining = Math.max(0, HOST_LIMIT - hostCount);
  const pct       = Math.min(100, (hostCount / HOST_LIMIT) * 100);
  const field     = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const fullName  = () => [form.forename.trim(), form.middle_name.trim(), form.surname.trim()].filter(Boolean).join(" ");
  const isOutOfArea = form.postcode && !isCornwallPostcode(form.postcode);

  const validate = () => {
   const e = {};
   if (!isGuest) {
     if (!form.forename.trim()) e.forename = "Required";
     if (!form.surname.trim())  e.surname  = "Required";
     if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
   }
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
        forename: form.forename.trim(),
        middle_name: form.middle_name.trim(),
        surname: form.surname.trim(),
        email: form.email.toLowerCase().trim(),
        postcode: form.postcode.toUpperCase().trim(), role: "host",
        is_existing_guest: isGuest,
        ...(refCode ? { ref_code: refCode } : {}),
      });
     if (result?.data?.error === "duplicate_email") {
        const s = result?.data?.status;
        if (s === "interest") {
          setDuplicateInfo({ type: "resend", email: form.email.toLowerCase().trim() });
        } else if (s === "out_of_area") {
          setDuplicateInfo({ type: "out_of_area" });
        } else {
          setDuplicateInfo({ type: "already_registered" });
        }
        setSubmitting(false);
        return;
      }
      if (refCode) {
        try { await base44.functions.invoke("linkReferral", { ref_code: refCode, referee_email: form.email.toLowerCase().trim(), referee_name: fullName() }); } catch (_) {}
      }

      // Store name parts so they can be saved to UserProfile after account activation
      if (!isGuest) {
        localStorage.setItem("pending_profile", JSON.stringify({
          forename: form.forename.trim(),
          middle_name: form.middle_name.trim(),
          surname: form.surname.trim(),
          email: form.email.toLowerCase().trim(),
        }));
      } else {
        // Already has a session — save profile immediately
        try {
          await fetch('/api/apps/698eee4108bd1d9467648326/functions/saveUserProfile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_token: localStorage.getItem('session_token'),
              email: form.email.toLowerCase().trim(),
              forename: form.forename.trim(),
              middle_name: form.middle_name.trim(),
              surname: form.surname.trim(),
              phone: '',
              location: '',
            }),
          });
        } catch (_) {}
      }

      if (result?.data?.out_of_area || isOutOfArea) {
        if (!isGuest) {
          try { await base44.functions.invoke("sendVerificationCode", { email: form.email.toLowerCase().trim(), name: form.forename.trim() }); } catch (_) {}
          navigate(`/verify-email?email=${encodeURIComponent(form.email.toLowerCase().trim())}&status=out_of_area`);
        } else {
          navigate('/founding-thankyou');
        }
        return;
      }
      if (!isGuest) {
        try { await base44.functions.invoke("sendVerificationCode", { email: form.email.toLowerCase().trim(), name: form.forename.trim() }); } catch (_) {}
        navigate(`/verify-email?email=${encodeURIComponent(form.email.toLowerCase().trim())}`);
      } else {
        navigate('/founding-thankyou');
      }
    } catch { setErrors({ submit: "Something went wrong. Please try again." }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-white">

      {refCode && (
        <div className="bg-teal-600 text-white text-center py-4 px-6">
          <p className="text-sm font-medium">
            🎉 You've been referred by a HostKeep host! Sign up today and get your <strong>first two months for the price of one</strong> when you activate your subscription.
          </p>
        </div>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#1E3A5F]">
        <img src={HERO_IMG} alt="Holiday home" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A5F] via-[#1E3A5F]/90 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-24">
          <Link to="/founding" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to overview
          </Link>
          <div className="max-w-2xl">
            <span className="inline-block bg-teal-500/20 border border-teal-500/30 text-teal-400 text-xs font-semibold uppercase tracking-wider rounded-full px-3 py-1 mb-4">HostKeep — Founding Host</span>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              Stop giving away<br />
              <span className="text-[#0d9488]">your income.</span>
            </h1>
            <p className="text-white/70 text-lg mb-6 max-w-xl">
              Airbnb takes up to 16% of every booking. On a property earning £20,000 a year, that's £3,200 that should stay with you.
              HostKeep charges a flat monthly fee and takes nothing from your bookings.
            </p>

            {/* Spots bar */}
            <div className="bg-white/10 border border-white/20 rounded-xl px-5 py-4 mb-6 max-w-sm">
              <div className="flex justify-between text-sm mb-2">
                <span className={`font-semibold ${hostFull ? "text-red-400" : "text-white/80"}`}>
                  {hostFull ? "All founding spots claimed" : `${remaining} of ${HOST_LIMIT} founding spots remaining`}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[#0d9488] transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <button
              onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-2 bg-[#0d9488] hover:bg-[#0f766e] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Apply for a founding host spot <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* KEY STATS */}
      <section className="bg-[#0d9488] py-7">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center gap-8 md:gap-16 text-center">
          {[
            { v: "0%",    l: "Commission on bookings" },
            { v: "£19",   l: "Per month (founding rate)" },
            { v: "£3,200",l: "Saved annually vs Airbnb (£20k property)" },
            { v: "100%",  l: "Of guest payments go to you*" },
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
          <h2 className="text-2xl font-bold text-gray-900">The real cost of commission</h2>
          <p className="text-gray-500 text-sm mt-1">What staying with the big platforms actually costs you</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-1/3"></th>
                  <th className="px-4 py-3 text-center"><span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Airbnb</span></th>
                  <th className="px-4 py-3 text-center"><span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Booking.com</span></th>
                  <th className="px-4 py-3 text-center bg-teal-50"><span className="text-xs font-bold text-teal-600 uppercase tracking-wider">HostKeep</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {COMPARISONS.map(row => (
                  <tr key={row.label} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-xs font-medium text-gray-700">{row.label}</td>
                    <td className="px-4 py-3 text-center text-xs text-red-500 font-medium">{row.airbnb}</td>
                    <td className="px-4 py-3 text-center text-xs text-orange-500 font-medium">{row.booking}</td>
                    <td className="px-4 py-3 text-center text-xs font-bold text-teal-600 bg-teal-50/40">{row.hostkeep}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED + BENEFITS */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">What's included in your subscription</h3>
              <div className="space-y-2.5">
                {INCLUDES.map(i => (
                  <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 text-sm">
                    <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    <span className="text-gray-700">{i}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="bg-[#1E3A5F] rounded-2xl p-6 text-white h-full">
                <span className="inline-block bg-[#0d9488]/25 border border-[#2dd4bf]/50 text-[#2dd4bf] text-xs font-semibold uppercase tracking-wider rounded-full px-3 py-1 mb-4">Founding Host Benefits</span>
                <p className="text-2xl font-black text-[#0d9488] mb-0.5">£19<span className="text-base font-semibold text-white/50">/month</span></p>
                <p className="text-white/40 text-xs mb-5">Standard price is £29/month. Founding rate locked permanently.</p>
                <div className="space-y-2.5">
                  {BENEFITS.map(b => (
                    <div key={b} className="flex items-start gap-2.5">
                      <CheckCircle className="w-3.5 h-3.5 text-[#0d9488] flex-shrink-0 mt-0.5" />
                      <span className="text-white/70 text-sm">{b}</span>
                    </div>
                  ))}
                </div>
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
            <p className="text-white text-2xl font-bold max-w-sm">Built in Cornwall. For Cornwall holiday lets.</p>
          </div>
        </div>
      </section>

      {/* APPLICATION FORM */}
      {/* FOUNDING PLAN TIERS */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Choose your founding plan</h2>
          <p className="text-gray-500 text-sm mt-1">All plans include every feature. Plans only differ by number of properties. Your rate is locked for life.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {FOUNDING_PLANS.map(plan => (
            <div key={plan.id} className="bg-white rounded-2xl border-2 border-[#1E3A5F]/20 p-5 text-center hover:border-teal-400 transition-colors">
              <p className="font-bold text-gray-900 text-lg mb-1">{plan.name}</p>
              <p className="text-3xl font-black text-[#1E3A5F] mb-0.5">£{plan.price}<span className="text-sm font-normal text-gray-400">/mo</span></p>
              <p className="text-xs text-gray-400 line-through mb-2">Standard £{plan.standard}/mo</p>
              <span className="inline-block bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full border border-teal-200">{plan.limit}</span>
            </div>
          ))}
        </div>

      </section>

      {/* APPLICATION FORM */}
      <section ref={formRef} className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Apply for a founding host spot</h2>
          <p className="text-gray-500 text-sm mt-1">We review every application and respond within 48 hours. No payment required.</p>
        </div>

        {hostFull && (
          <div className="mb-5 bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 text-center text-sm">
            <p className="font-semibold text-orange-800">All founding spots claimed — you'll be added to the waitlist.</p>
          </div>
        )}

        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-900 font-bold text-base mb-4">We're launching in Cornwall & Devon first (TR, PL, EX postcodes). Register and we'll notify you when we expand.</p>
              <p className="text-sm text-amber-800"><strong>Hosting multiple properties?</strong> Register with your <strong>Cornwall property first</strong> — this is your primary property for the beta. You can then add further properties from your dashboard; they'll be held in draft until beta ends, after which they can be published immediately once your documents, earnings bank account, and subscription are set up correctly.</p>
            </div>
          </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[["forename","Forename *","Jane"],["middle_name","Middle name","Optional"],["surname","Surname *","Smith"]].map(([k,l,p]) => (
              <div key={k}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{l}</label>
                <input type="text" inputMode="text" autoComplete={k === "forename" ? "given-name" : k === "surname" ? "family-name" : "off"} value={form[k]} onChange={e => field(k, e.target.value)} placeholder={p}
                  className={`w-full border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors ${errors[k] ? "border-red-300" : "border-gray-200"}`} />
                {errors[k] && <p className="text-xs text-red-500 mt-1">{errors[k]}</p>}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Email address *</label>
            <input type="email" inputMode="email" autoComplete="email" value={form.email} onChange={e => !isGuest && field("email", e.target.value)} placeholder="jane@example.com"
              readOnly={isGuest}
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors ${isGuest ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''} ${errors.email ? 'border-red-300' : 'border-gray-200'}`} />
            {isGuest && <p className="text-xs text-gray-400 mt-1">Email cannot be changed — linked to your account</p>}
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            {duplicateInfo?.type === "resend" && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                You've already started registering as a host with this email.{" "}
                <button type="button" className="underline font-medium" onClick={async () => {
                  try { await base44.functions.invoke("sendVerificationCode", { email: duplicateInfo.email, name: form.forename.trim() }); } catch (_) {}
                  navigate(`/verify-email?email=${encodeURIComponent(duplicateInfo.email)}`);
                }}>Send a new verification code.</button>
              </div>
            )}
            {duplicateInfo?.type === "out_of_area" && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                You've already registered your interest with this email. We'll be in touch when we launch in your area.
              </div>
            )}
            {duplicateInfo?.type === "already_registered" && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                This email is already registered as a host. If you need help, contact <a href="mailto:hello@hostkeepdigital.co.uk" className="underline font-medium">hello@hostkeepdigital.co.uk</a>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Property postcode *</label>
            <input type="text" inputMode="text" autoComplete="postal-code" autoCapitalize="characters" value={form.postcode}
              onChange={e => { field("postcode", e.target.value.toUpperCase()); setCornwallWarn(false); }}              
          onBlur={(e) => {
            const value = e.target.value;
            if (value && !isCornwallPostcode(value)) {
              setCornwallWarn(true);
            }
          }}
              placeholder="TR1 1AA"
              className={`w-full border rounded-xl px-4 py-3 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors ${errors.postcode || cornwallWarn ? "border-amber-400" : "border-gray-200"}`} />
            {errors.postcode && <p className="text-xs text-red-500 mt-1">{errors.postcode}</p>}
          </div>

          {errors.submit && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{errors.submit}</div>}

          <button type="submit" disabled={submitting || loading}
            className="w-full bg-[#0d9488] hover:bg-[#0f766e] disabled:opacity-60 text-white font-semibold text-sm rounded-xl py-3.5 min-h-[52px] transition-colors flex items-center justify-center gap-2">
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</>
              : isOutOfArea ? "Register my interest" : "Apply as a Founding Host"}
          </button>

          <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <Shield className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 leading-relaxed">
              <span className="font-medium text-gray-500">Payments via Stripe.</span> Stripe charges a small processing fee on transactions (typically 1.4% + 25p for European cards). HostKeep receives none of this.
            </p>
          </div>
          <div className="flex items-start gap-2.5 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
            <Shield className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-teal-700 leading-relaxed">
              <span className="font-medium">*Payout timing.</span> Guests pay in advance. Your funds are released <span className="font-medium">24 hours after guest check-in</span> — this gives guests a brief window to raise any issues before the payment is settled to you.
            </p>
          </div>
          <p className="text-center text-xs text-gray-400">No payment required to apply · Reviewed within 48 hours</p>
        </form>
      </section>
      <section className="max-w-7xl mx-auto px-4 pb-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold px-6 py-3 rounded-xl transition-colors">
            ← Back to Home
          </Link>
        </div>
      </section>
      <FoundingFooter />
    </div>
  );
}