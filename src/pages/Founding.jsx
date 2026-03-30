import { Link } from "react-router-dom";
import { Shield, PoundSterling, Heart, Star, ArrowRight, Users, Home, CheckCircle } from "lucide-react";

const HERO_IMG = "https://drive.google.com/uc?export=view&id=1ZmljdO7m9HdHdT_KKSa0S-p2e9ctR5BU";
const LOOE_IMG = "https://drive.google.com/uc?export=view&id=1Vr07gcaaC19XEmxcvTbq-DTn8PZKn-_a";

const PILLARS = [
  {
    icon: PoundSterling,
    title: "0% commission. Always.",
    body: "Airbnb and Booking.com take up to 16% of every booking. HostKeep charges a flat monthly fee and keeps nothing from your income. What you earn is yours.",
  },
  {
    icon: Shield,
    title: "Safe, secure, transparent.",
    body: "Payments processed by Stripe — the same technology trusted by millions of businesses worldwide. Your guest data is protected under UK GDPR. We will never sell your information.",
  },
  {
    icon: Heart,
    title: "Built by a small host, for small hosts.",
    body: "HostKeep was created because the platforms were taking too much. We know what it's like to manage a small property and watch a percentage of every booking disappear. We built the alternative.",
  },
  {
    icon: Users,
    title: "Fair for everyone.",
    body: "Hosts keep their income. Cleaners keep their earnings. Guests pay fair prices without inflated platform fees. Everyone wins — except the middleman.",
  },
];

const VALUES = [
  "No commission on bookings — ever",
  "Direct payments from guests to you",
  "Full calendar, messaging and booking tools",
  "Host and cleaner coordination built in",
  "Transparent pricing with no hidden fees",
  "UK-based, GDPR compliant",
];

export default function Founding() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Cornwall" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A5F]/97 via-[#1E3A5F]/80 to-[#1E3A5F]/30" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-16 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 border border-[#0d9488]/50 bg-[#0d9488]/10 rounded-full px-4 py-1.5 mb-6">
              <Star className="w-3 h-3 text-[#0d9488]" fill="currentColor" />
              <span className="text-[#0d9488] text-xs font-semibold tracking-widest uppercase">
                Cornwall & Devon — Summer 2026 Launch
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[0.95] mb-6 tracking-tight">
              The holiday let<br />
              platform that<br />
              <span className="text-[#0d9488]">works for you.</span>
            </h1>

            <p className="text-white/65 text-lg leading-relaxed mb-3 max-w-lg">
              Everything you need to manage your holiday let or cleaning business — without giving away a percentage of every booking.
            </p>
            <p className="text-white/40 text-sm mb-10">Built in Cornwall. For Cornwall.</p>

            {/* Role chooser */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Link
                to="/foundinghost"
                className="group flex items-center justify-between gap-4 bg-[#0d9488] hover:bg-[#0f766e] text-white px-6 py-4 rounded-2xl transition-all font-bold"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Home className="w-4 h-4" />
                    <span className="text-base">I'm a Host</span>
                  </div>
                  <p className="text-white/60 text-xs font-normal">Apply for a founding host spot</p>
                </div>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </Link>

              <Link
                to="/foundingcleaner"
                className="group flex items-center justify-between gap-4 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-6 py-4 rounded-2xl transition-all font-bold"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Users className="w-4 h-4" />
                    <span className="text-base">I'm a Cleaner</span>
                  </div>
                  <p className="text-white/50 text-xs font-normal">Apply for a founding cleaner spot</p>
                </div>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </Link>
            </div>

            <p className="text-white/30 text-xs">Not sure? Read on to find out more ↓</p>
          </div>
        </div>
      </section>

      {/* ── THE HEADLINE STAT ────────────────────────────────────────────────── */}
      <section className="bg-[#0d9488] py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-5xl font-black text-white mb-2">0%</p>
          <p className="text-white/80 text-xl font-semibold">Commission on every booking. Every time. Forever.</p>
          <p className="text-white/50 text-sm mt-3 max-w-xl mx-auto">
            Airbnb and Booking.com charge up to 16% of every booking. On a property earning £20,000 a year,
            that's up to £3,200 going to a platform — not to you.
          </p>
        </div>
      </section>

      {/* ── OUR STORY ────────────────────────────────────────────────────────── */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-[#0d9488] tracking-widest uppercase mb-4">Our story</p>
              <h2 className="text-3xl font-bold text-gray-900 leading-tight mb-6">
                Built by a small host.<br />For small hosts.
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  HostKeep was born out of frustration. Managing a small holiday let in Cornwall should be
                  straightforward — but the big platforms make it complicated, and expensive.
                </p>
                <p>
                  We built HostKeep to prove there's a better way. A flat monthly fee. Direct payments.
                  Full calendar and booking management. Cleaner coordination. Everything you actually need —
                  without the percentage of your income that the platforms take.
                </p>
                <p className="font-semibold text-gray-900">
                  The guests still come. The bookings still happen. The only difference is who keeps the money.
                </p>
              </div>
            </div>
            <div className="relative">
              <img
                src={LOOE_IMG}
                alt="Polperro, Cornwall"
                className="rounded-2xl w-full h-72 object-cover shadow-lg"
              />
              <div className="absolute -bottom-4 -left-4 bg-[#1E3A5F] text-white rounded-xl px-5 py-3 shadow-xl">
                <p className="text-2xl font-black text-[#0d9488]">£19</p>
                <p className="text-xs text-white/60">Founding host rate / month</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PILLARS ──────────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-[#0d9488] tracking-widest uppercase mb-3">What we stand for</p>
            <h2 className="text-3xl font-bold text-gray-900">A platform built on fairness.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[#0d9488]" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT'S INCLUDED ──────────────────────────────────────────────────── */}
      <section className="bg-[#1E3A5F] py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">Everything Airbnb offers.</h2>
            <p className="text-white/50 text-lg">Without taking a cut of every booking.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {VALUES.map(v => (
              <div key={v} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <CheckCircle className="w-4 h-4 text-[#0d9488] flex-shrink-0" />
                <span className="text-white/80 text-sm">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-teal-600 to-teal-800 py-16 text-white">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to apply?</h2>
          <p className="text-teal-100 mb-8">
            We're launching in Cornwall & Devon in Summer 2026 with 50 host and 30 cleaner founding spots.
            Tell us who you are and we'll be in touch within 48 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/foundinghost"
              className="flex items-center justify-center gap-2 bg-white text-teal-700 hover:bg-gray-100 font-bold px-8 py-4 rounded-xl transition-colors"
            >
              <Home className="w-4 h-4" />
              Apply as a Host
            </Link>
            <Link
              to="/foundingcleaner"
              className="flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white hover:bg-white/10 font-bold px-8 py-4 rounded-xl transition-colors"
            >
              <Users className="w-4 h-4" />
              Apply as a Cleaner
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}