import { Link } from "react-router-dom";
import { Shield, PoundSterling, Heart, Star, ArrowRight, Users, Home, CheckCircle, Zap } from "lucide-react";
import FoundingFooter from "@/components/founding/FoundingFooter";

const HERO_IMG  = "https://lh3.googleusercontent.com/d/1ZmljdO7m9HdHdT_KKSa0S-p2e9ctR5BU";
const LOOE_IMG  = "https://lh3.googleusercontent.com/d/1Vr07gcaaC19XEmxcvTbq-DTn8PZKn-_a";
const CLEAN_IMG = "https://lh3.googleusercontent.com/d/1dO0GP74-0q34O64CKSL0gGCan9qeELf5";

const PLATFORM_COMPARE = [
  { feature: "Commission per booking", hostkeep: "0% — always", others: "Up to 16% per booking" },
  { feature: "Who gets paid",          hostkeep: "Direct to your account", others: "Platform holds & releases" },
  { feature: "Guest surcharges",       hostkeep: "None", others: "10–15% added on top" },
  { feature: "Your pricing",           hostkeep: "You set your prices", others: "Platform can override" },
  { feature: "Monthly cost",           hostkeep: "Flat subscription", others: "£0 upfront + % of all income" },
];

const VALUES = [
  { icon: PoundSterling, title: "0% Commission", body: "Hosts pay a flat monthly fee. Every pound a guest pays goes directly to the host — we take nothing." },
  { icon: Shield, title: "Transparent & Secure", body: "Payments via Stripe. No hidden fees. No surprise charges. Your data protected under UK GDPR." },
  { icon: Heart, title: "Built for Small Hosts", body: "Created by a holiday let owner who was tired of losing a cut of every single booking to big platforms." },
  { icon: Zap, title: "Everything You Need", body: "Calendar, messaging, booking management, cleaner coordination — all in one place, at one flat price." },
];

export default function Founding() {
  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#1E3A5F]">
        <img src={HERO_IMG} alt="Cornwall" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A5F] via-[#1E3A5F]/90 to-[#1E3A5F]/60" />

        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-[#0d9488]/20 border border-[#0d9488]/40 rounded-full px-3 py-1 mb-5">
              <Star className="w-3 h-3 text-[#0d9488]" fill="currentColor" />
              <span className="text-[#0d9488] text-xs font-semibold tracking-widest uppercase">Cornwall & Devon — Summer 2026 Launch</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              The holiday let platform<br />
              that <span className="text-[#0d9488]">works for you.</span>
            </h1>
            <p className="text-white/70 text-lg mb-4 max-w-xl">
              Everything you need to run your holiday let — without losing a percentage of every booking to Airbnb or Booking.com.
              One flat monthly fee. You keep 100% of the booking*.
            </p>
            <p className="text-white/40 text-xs mb-8 max-w-xl">*Stripe payment processing fees apply</p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/foundinghost"
                className="group flex items-center justify-between gap-4 bg-[#0d9488] hover:bg-[#0f766e] text-white px-6 py-4 rounded-xl transition-all font-semibold"
              >
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  <div>
                    <div className="text-sm font-bold">I'm a Host</div>
                    <div className="text-xs text-white/60 font-normal">Apply for a founding host spot</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/foundingcleaner"
                className="group flex items-center justify-between gap-4 bg-white/10 hover:bg-white/15 border border-white/25 text-white px-6 py-4 rounded-xl transition-all font-semibold"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <div>
                    <div className="text-sm font-bold">I'm a Cleaner</div>
                    <div className="text-xs text-white/50 font-normal">Apply for a founding cleaner spot</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* THE NUMBER */}
      <section className="bg-[#0d9488] py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-center gap-8 md:gap-16 text-center">
          {[
            { value: "0%", label: "Commission on bookings" },
            { value: "£19/mo", label: "Founding host rate" },
            { value: "50", label: "Host founding spots" },
            { value: "30", label: "Cleaner founding spots" },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-white/60 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY HOSTKEEP */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Built for hosts who are tired of losing their income.</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">Airbnb and Booking.com charge up to 16% of every booking. On a property earning £20,000 a year that's up to £3,200 going to a platform — not to you.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Why HostKeep is different</h2>
            <p className="text-gray-500 text-sm mt-2">A direct comparison with the big platforms</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"></th>
                    <th className="px-5 py-3 text-center bg-teal-50"><span className="text-xs font-bold text-teal-600 uppercase tracking-wider">HostKeep</span></th>
                    <th className="px-5 py-3 text-center"><span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Others</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {PLATFORM_COMPARE.map(row => (
                    <tr key={row.feature}>
                      <td className="px-5 py-3 font-medium text-gray-700 text-xs">{row.feature}</td>
                      <td className="px-5 py-3 text-center text-xs font-bold text-teal-600 bg-teal-50/40">
                        <span className="inline-flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />{row.hostkeep}</span>
                      </td>
                      <td className="px-5 py-3 text-center text-xs text-red-500 font-medium">{row.others}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* HOST CTA */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-3xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0 items-stretch">
            <div className="p-8 md:p-12 text-white">
              <span className="inline-block bg-white/20 text-white text-xs font-semibold uppercase tracking-wider rounded-full px-3 py-1 mb-4">For Hosts — HostKeep</span>
              <h2 className="text-3xl font-bold mb-3">List your property.<br />Keep 100% of bookings.</h2>
              <p className="text-teal-100 mb-6">One flat monthly fee of £19/month (founding rate). Zero commission on any booking. Direct payments from guests to you.</p>
              <ul className="space-y-2 mb-8">
                {["No commission — ever", "Direct guest payments", "Full calendar & messaging", "Cleaner coordination built in"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-teal-300 flex-shrink-0" />{f}</li>
                ))}
              </ul>
              <Link to="/foundinghost" className="inline-flex items-center gap-2 bg-white text-teal-700 hover:bg-teal-50 font-bold px-6 py-3 rounded-xl transition-colors">
                Apply as a Founding Host <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="hidden md:block">
              <img src={LOOE_IMG} alt="Cornwall holiday home" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* CLEANER CTA */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0 items-stretch">
            <div className="hidden md:block">
              <img src={CLEAN_IMG} alt="Cornwall coastline" className="w-full h-full object-cover" />
            </div>
            <div className="p-8 md:p-12 text-white">
              <span className="inline-block bg-white/20 text-white text-xs font-semibold uppercase tracking-wider rounded-full px-3 py-1 mb-4">For Cleaners — CleanKeep</span>
              <h2 className="text-3xl font-bold mb-3">Your rate.<br />Your clients.<br />Your income.</h2>
              <p className="text-blue-100 mb-6">Agencies take up to 40%. CleanKeep takes nothing. Connect directly with holiday let hosts in your area and keep every penny.</p>
              <ul className="space-y-2 mb-8">
                {["0% taken from your earnings", "Direct bookings from hosts", "Build your profile & reviews", "First 3 months free (founding)"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-blue-300 flex-shrink-0" />{f}</li>
                ))}
              </ul>
              <Link to="/foundingcleaner" className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold px-6 py-3 rounded-xl transition-colors">
                Apply as a Founding Cleaner <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <FoundingFooter />
    </div>
  );
}