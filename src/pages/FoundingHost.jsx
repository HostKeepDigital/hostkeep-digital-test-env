import { useState, useEffect, useRef } from "react";
import FoundingFooter from "@/components/founding/FoundingFooter";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
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

export default function FoundingHost() {
  const navigate = useNavigate();
  const formRef  = useRef(null);
  const [hostCount,    setHostCount   ] = useState(0);
  const [loading,      setLoading     ] = useState(true);
  const [submitting,   setSubmitting  ] = useState(false);
  const [cornwallWarn, setCornwallWarn] = useState(false);
  const [form, setForm] = useState({ forename: "", middle_name: "", surname: "", email: "", postcode: "" });
  const [errors, setErrors] = useState({});

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
        postcode: form.postcode.toUpperCase().trim(), role: "host",
      });
      if (result?.error === "duplicate_email") { setErrors({ email: "Email already registered." }); setSubmitting(false); return; }
      if (result?.data?.out_of_area || isOutOfArea) {
        navigate(`/verify-email?email=${encodeURIComponent(form.email.toLowerCase().trim())}&status=out_of_area`);
        return;
      }
      try { await base44.functions.invoke("sendVerificationCode", { email: form.email.toLowerCase().trim(), name: form.forename.trim() }); } catch (_) {}
      navigate(`/verify-email?email=${encodeURIComponent(form.email.toLowerCase().trim())}`);
    } catch { setErrors({ submit: "Something went wrong. Please try again." }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-white">

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
                  className={`w-full border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors ${errors[k] ? "border-red-300" : "border-gray-200"}`} />
                {errors[k] && <p className="text-xs text-red-500 mt-1">{errors[k]}</p>}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Email address *</label>
            <input type="email" value={form.email} onChange={e => field("email", e.target.value)} placeholder="jane@example.com"
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors ${errors.email ? "border-red-300" : "border-gray-200"}`} />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Property postcode *</label>
            <input type="text" value={form.postcode}
              onChange={e => { field("postcode", e.target.value); setCornwallWarn(false); }}              
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
            className="w-full bg-[#0d9488] hover:bg-[#0f766e] disabled:opacity-60 text-white font-semibold text-sm rounded-xl py-3.5 transition-colors flex items-center justify-center gap-2">
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

      <FoundingFooter />
    </div>
  );
}