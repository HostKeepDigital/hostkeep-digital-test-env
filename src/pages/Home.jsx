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
  Search, MapPin, Calendar, Home as HomeIcon, 
  CheckCircle, ArrowRight, Building2, PoundSterling, Sparkles, Star
} from "lucide-react";
import PropertyCard from "@/components/properties/PropertyCard";
import GuestSelector from "@/components/search/GuestSelector";

export default function Home() {
  const [searchLocation, setSearchLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestData, setGuestData] = useState({ adults: 1, children: 0, childAges: [], isValid: true });

  const { data: featuredProperties = [] } = useQuery({
    queryKey: ['featured-properties'],
    queryFn: () => base44.entities.Property.filter({ status: 'published' }, '-created_date', 6),
  });

  const handleSearch = () => {
    if (guestData.children > 0 && !guestData.isValid) {
      return;
    }
    const params = new URLSearchParams();
    if (searchLocation) params.set('location', searchLocation);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    params.set('adults', guestData.adults);
    params.set('children', guestData.children);
    if (guestData.childAges.length > 0) {
      params.set('childAges', guestData.childAges.join(','));
    }
    window.location.href = createPageUrl('Search') + '?' + params.toString();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with 3 Main CTAs */}
      <section className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1920')] bg-cover bg-center opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-white mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Your Holiday Home Marketplace
            </h1>
            <p className="text-xl md:text-2xl text-teal-100 max-w-3xl mx-auto">
              Book amazing stays. List your property. Earn as a cleaner.
            </p>
          </motion.div>

          {/* 3 Main Conversion CTAs - Above the Fold */}
          <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-6xl mx-auto">
            {/* CTA 1: Book a Stay */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-8 text-center shadow-2xl hover:shadow-3xl transition-all group"
            >
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <HomeIcon className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Book a Stay</h3>
              <p className="text-gray-600 mb-6">
                Discover unique holiday homes and book directly with owners
              </p>
              <Link to={createPageUrl('Search')}>
                <Button className="w-full bg-teal-600 hover:bg-teal-700" size="lg">
                  Browse Properties
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </motion.div>

            {/* CTA 2: Become a Host */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-8 text-center shadow-2xl hover:shadow-3xl transition-all group relative overflow-hidden"
            >
              <Sparkles className="absolute top-4 right-4 w-6 h-6 text-white opacity-50" />
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Become a Host</h3>
              <p className="text-orange-100 mb-4">
                List your property and earn up to <span className="font-bold text-white">£2,000/month</span>
              </p>
              <Link to={createPageUrl('BecomeHost')}>
                <Button className="w-full bg-white text-orange-600 hover:bg-orange-50" size="lg">
                  Start Earning
                  <PoundSterling className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </motion.div>

            {/* CTA 3: Join CleanKeep */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-center shadow-2xl hover:shadow-3xl transition-all group relative overflow-hidden"
            >
              <Star className="absolute top-4 right-4 w-6 h-6 text-white opacity-50" />
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Join CleanKeep</h3>
              <p className="text-blue-100 mb-4">
                Flexible cleaning work. Earn <span className="font-bold text-white">£15-25/hour</span>
              </p>
              <Link to={createPageUrl('BecomeCleaner')}>
                <Button className="w-full bg-white text-blue-600 hover:bg-blue-50" size="lg">
                  Apply Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
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
                  <div className="flex-1">
                    <GuestSelector value={guestData} onChange={setGuestData} />
                  </div>
                  <Button 
                    onClick={handleSearch}
                    className="h-12 px-6 bg-teal-600 hover:bg-teal-700"
                    disabled={guestData.children > 0 && !guestData.isValid}
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
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

      {/* Trust Indicators */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { number: "10,000+", label: "Happy Guests" },
              { number: "500+", label: "Properties Listed" },
              { number: "4.8★", label: "Average Rating" },
              { number: "100%", label: "Direct Bookings" }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="text-4xl font-bold text-teal-600 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose HostKeep */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">Why Choose HostKeep?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: PoundSterling,
                title: "Zero Commission",
                description: "Hosts keep 100% of bookings. Cleaners keep 100% of earnings. Just a small monthly fee."
              },
              {
                icon: CheckCircle,
                title: "Direct Bookings",
                description: "Connect directly with guests and hosts. No middleman. Full control over your business."
              },
              {
                icon: Star,
                title: "Build Your Reputation",
                description: "Earn reviews and ratings. Build trust. Grow your hosting or cleaning business."
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}