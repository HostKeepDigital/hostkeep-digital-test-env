import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { 
  Home, Search, PoundSterling, Shield, Users, Star, 
  MessageSquare, CheckCircle, X, Heart, Headphones,
  MapPin, TreePine, Waves
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AboutUs() {
  const comparisonData = [
    { feature: "Booking fees", hostkeep: "None — subscription only", others: "15–20% per booking" },
    { feature: "Host earnings", hostkeep: "Keep 100%", others: "Lose a cut every time" },
    { feature: "Listing process", hostkeep: "Simple & fast", others: "Complex & restrictive" },
    { feature: "Hidden guest fees", hostkeep: "No hidden fees", others: "Service fees for guests" },
    { feature: "Pricing control", hostkeep: "You set your prices", others: "Platform may override" },
  ];

  const trustFeatures = [
    { icon: Shield, title: "Secure Payments", desc: "All transactions processed safely via Stripe" },
    { icon: Users, title: "Verified Users", desc: "Both hosts and guests are verified before booking" },
    { icon: Star, title: "Real Reviews", desc: "Honest reviews from genuine, completed bookings" },
    { icon: Headphones, title: "Customer Support", desc: "Friendly help when you need it" },
  ];

  const communityFeatures = [
    { icon: Heart, title: "Host-First", desc: "Every decision we make starts with what's best for our hosts." },
    { icon: MessageSquare, title: "Built on Feedback", desc: "We grow and improve based on real conversations with real owners." },
    { icon: CheckCircle, title: "Easier, Not Harder", desc: "Hosting should feel rewarding, not like a second job." },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-teal-600 to-teal-800 text-white py-20 lg:py-32">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl lg:text-5xl font-bold mb-6"
          >
            Built for Hosts Who Want to Keep More.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-teal-100 max-w-3xl mx-auto mb-10"
          >
            HostKeep helps holiday home owners rent their properties without losing a percentage of every booking. Hosts pay a simple monthly subscription and keep 100% of their booking income.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link to={createPageUrl("CreateProperty")}>
              <Button size="lg" className="bg-white text-teal-700 hover:bg-gray-100">
                <Home className="w-5 h-5 mr-2" /> List Your Home
              </Button>
            </Link>
            <Link to={createPageUrl("Search")}>
              <Button size="lg" variant="outline" className="border-2 border-white text-white bg-transparent hover:bg-white/10">
                <Search className="w-5 h-5 mr-2" /> Browse Homes
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
          <div className="prose prose-lg text-gray-600 space-y-4">
            <p>
              We started HostKeep because we saw something that didn't sit right. Holiday home owners across the UK were doing all the hard work — maintaining their properties, welcoming guests, handling every little detail — only to hand over a big chunk of their earnings to booking platforms.
            </p>
            <p>
              For many independent hosts, those commissions add up fast. A 15–20% cut on every booking isn't just a fee — it's money that should stay with the people who earned it.
            </p>
            <p>
              So we built HostKeep: a simple, subscription-based alternative. No percentage cuts. No surprise charges. Just a fair monthly fee that lets hosts list their homes and keep 100% of what they earn.
            </p>
            <p className="font-medium text-gray-800">
              Our goal is straightforward — simplicity, transparency, and giving hosts back the control they deserve.
            </p>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We exist to empower independent holiday home owners — making hosting simple, profitable, and free from hidden fees. We help guests discover unique stays, directly from the people who know them best.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <PoundSterling className="w-7 h-7 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Fair Pricing</h3>
                <p className="text-gray-600">A simple subscription — no commissions, no hidden fees. You keep what you earn.</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-7 h-7 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Host Control</h3>
                <p className="text-gray-600">Set your own prices, rules, and availability. Your property, your way.</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Simple Technology</h3>
                <p className="text-gray-600">Easy-to-use tools that make listing and managing bookings effortless.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Why HostKeep Is Different</h2>
          
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-100 font-semibold text-sm">
              <div className="p-4 text-gray-600"></div>
              <div className="p-4 text-center text-teal-700 bg-teal-50">HostKeep</div>
              <div className="p-4 text-center text-gray-600">Others</div>
            </div>
            {comparisonData.map((row, index) => (
              <div key={index} className="grid grid-cols-3 border-t border-gray-100">
                <div className="p-4 font-medium text-gray-800 text-sm">{row.feature}</div>
                <div className="p-4 text-center text-sm bg-teal-50/50">
                  <span className="inline-flex items-center gap-1 text-teal-700">
                    <CheckCircle className="w-4 h-4" /> {row.hostkeep}
                  </span>
                </div>
                <div className="p-4 text-center text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <X className="w-4 h-4 text-red-400" /> {row.others}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UK Focus */}
      <section className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Built for the UK Holiday Market</h2>
              <p className="text-lg text-gray-600 mb-8">
                HostKeep was born from a love of the British countryside and coastline. We're focused on helping local holiday home owners thrive — not competing on global scale, but delivering real value close to home.
              </p>
              <ul className="space-y-4">
                {[
                  { icon: MapPin, text: "Started in the UK, built for UK hosts" },
                  { icon: Waves, text: "Focus on coastal and countryside holiday homes" },
                  { icon: Heart, text: "Supporting local owners and the staycation movement" },
                  { icon: Star, text: "Quality listings over quantity" },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-teal-600" />
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=600&h=400&fit=crop" 
                alt="UK Coastline" 
                className="rounded-2xl shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Trust & Safety</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trustFeatures.map((feature, i) => (
              <Card key={i} className="border-0 shadow-md">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Community Focus */}
      <section className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Community Focus</h2>
            <p className="text-lg text-gray-600">
              HostKeep isn't just a platform — it's a community of independent hosts who believe there's a better way to do things.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {communityFeatures.map((feature, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-7 h-7 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-teal-600 to-teal-800 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Keep More of What You Earn?</h2>
          <p className="text-xl text-teal-100 mb-8">Join HostKeep today and take control of your holiday rental income.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to={createPageUrl("Subscription")}>
              <Button size="lg" className="bg-white text-teal-700 hover:bg-gray-100">
                View Pricing Plans
              </Button>
            </Link>
            <Link to={createPageUrl("CreateProperty")}>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                List Your Property
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}