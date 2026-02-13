import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, MapPin, Calendar, Users, Star, Home as HomeIcon, 
  CheckCircle, ArrowRight, Building2, Palmtree, Mountain, Waves
} from "lucide-react";
import PropertyCard from "@/components/properties/PropertyCard";

export default function Home() {
  const [searchLocation, setSearchLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  const { data: featuredProperties = [] } = useQuery({
    queryKey: ['featured-properties'],
    queryFn: () => base44.entities.Property.filter({ status: 'published' }, '-created_date', 6),
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchLocation) params.set('location', searchLocation);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests) params.set('guests', guests);
    window.location.href = createPageUrl('Search') + '?' + params.toString();
  };

  const propertyTypes = [
    { icon: HomeIcon, label: "Houses", type: "house" },
    { icon: Building2, label: "Apartments", type: "apartment" },
    { icon: Palmtree, label: "Villas", type: "villa" },
    { icon: Mountain, label: "Cabins", type: "cabin" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1920')] bg-cover bg-center opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-white mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Find Your Perfect<br />Holiday Home
            </h1>
            <p className="text-xl md:text-2xl text-teal-100 max-w-2xl mx-auto">
              Book directly with owners. No hidden fees. Just unforgettable stays.
            </p>
          </motion.div>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl p-4 md:p-6 max-w-4xl mx-auto"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Where to?"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="pl-10 h-12 border-gray-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Check in</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="pl-10 h-12 border-gray-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Check out</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="pl-10 h-12 border-gray-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Guests</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="number"
                      min="1"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="pl-10 h-12 border-gray-200"
                    />
                  </div>
                  <Button 
                    onClick={handleSearch}
                    className="h-12 px-6 bg-teal-600 hover:bg-teal-700"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Property Types */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Browse by property type</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {propertyTypes.map((type, idx) => (
            <motion.div
              key={type.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link 
                to={createPageUrl('Search') + `?type=${type.type}`}
                className="block p-6 bg-gray-50 rounded-2xl hover:bg-teal-50 hover:border-teal-200 border-2 border-transparent transition-all group"
              >
                <type.icon className="w-10 h-10 text-teal-600 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-gray-900">{type.label}</h3>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Properties */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Featured Properties</h2>
            <Link 
              to={createPageUrl('Search')}
              className="text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProperties.map((property, idx) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <PropertyCard property={property} />
              </motion.div>
            ))}
            {featuredProperties.length === 0 && (
              <div className="col-span-3 text-center py-16 text-gray-500">
                <HomeIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No properties listed yet. Be the first host!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Host CTA Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-3xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="p-8 md:p-12 text-white">
              <Badge className="bg-white/20 text-white border-0 mb-4">For Hosts</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                List your property.<br />Keep 100% of bookings.
              </h2>
              <p className="text-teal-100 text-lg mb-6">
                Pay one flat monthly fee. No commission on your bookings. Ever.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Direct payments to your account",
                  "Full control over your listings",
                  "Built-in messaging & calendar",
                  "No hidden fees or surprises"
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-teal-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link to={createPageUrl('HostDashboard')}>
                <Button size="lg" className="bg-white text-teal-700 hover:bg-teal-50">
                  Become a Host
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="hidden md:block h-full">
              <img 
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800" 
                alt="Beautiful holiday home"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
          <p className="text-gray-600 mb-12 max-w-2xl mx-auto">
            Choose the plan that works for you. No commissions, no hidden fees.
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { name: "Basic", price: "19", properties: "1 property", features: ["Calendar management", "Direct bookings", "Messaging"] },
              { name: "Pro", price: "39", properties: "Up to 5 properties", features: ["Everything in Basic", "Priority support", "Analytics dashboard"], popular: true },
              { name: "Premium", price: "79", properties: "Unlimited properties", features: ["Everything in Pro", "Featured listings", "API access"] }
            ].map((plan, idx) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`bg-white rounded-2xl p-6 border-2 ${plan.popular ? 'border-teal-500 shadow-lg' : 'border-gray-100'} relative`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500">Most Popular</Badge>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">£{plan.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{plan.properties}</p>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-teal-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button 
                  variant={plan.popular ? "default" : "outline"} 
                  className={`w-full ${plan.popular ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
                >
                  Get Started
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
              <HomeIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">StayDirect</span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2026 StayDirect. Book directly with holiday home owners.
          </p>
        </div>
      </footer>
    </div>
  );
}