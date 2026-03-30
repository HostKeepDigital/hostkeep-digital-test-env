import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Star,
  Home as HomeIcon,
  CheckCircle,
  ArrowRight,
  Building2,
  Mountain,
  Waves,
  TreePine,
  Caravan,
  Sparkles,
  Loader2,
} from "lucide-react";
import PropertyCard from "@/components/properties/PropertyCard";
import GuestSelector from "@/components/search/GuestSelector";
import { getUserRoles, hasRole } from "@/components/utils/roleHelpers";
import BookingCalendar from "@/components/shared/BookingCalendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { useAuth } from "@/lib/AuthContext";

const isPostcodeLike = (val) =>
  /^[A-Z]{1,2}\d/i.test(val.trim().replace(/\s/g, ""));

export default function Home() {
  const { user, isAuthenticated } = useAuth(); // ← custom auth

  const [searchLocation, setSearchLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [duration, setDuration] = useState("");
  const [guestData, setGuestData] = useState({
    adults: 1,
    children: 0,
    childAges: [],
    isValid: true,
  });

  const [userRoles, setUserRoles] = useState([]);
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [postcodeCoords, setPostcodeCoords] = useState(null);
  const [postcodeLoading, setPostcodeLoading] = useState(false);
  const [postcodeError, setPostcodeError] = useState("");
  const postcodeCache = useRef({});

  // Load roles when user changes
  useEffect(() => {
    if (user?.id) {
      getUserRoles(user.id).then(setUserRoles);
    }
  }, [user]);

  // Featured properties
  const { data: featuredProperties = [] } = useQuery({
    queryKey: ["featured-properties"],
    queryFn: () =>
      base44.entities.Property.filter(
        { status: "published" },
        "-created_date",
        6
      ),
  });

  // Geocode location with debounce + cache
  useEffect(() => {
    const loc = searchLocation.trim();
    if (!loc) {
      setPostcodeCoords(null);
      setPostcodeError("");
      return;
    }

    const cacheKey = loc.toLowerCase();
    if (postcodeCache.current[cacheKey]) {
      setPostcodeCoords(postcodeCache.current[cacheKey]);
      setPostcodeError("");
      return;
    }

    const timer = setTimeout(async () => {
      setPostcodeLoading(true);
      setPostcodeError("");

      try {
        let coords = null;

        if (isPostcodeLike(loc)) {
          const clean = loc.toUpperCase().replace(/\s+/g, "");
          const res = await fetch(
            `https://api.postcodes.io/postcodes/${clean}`
          );
          const data = await res.json();

          if (res.ok && data.status === 200 && data.result) {
            coords = {
              lat: data.result.latitude,
              lng: data.result.longitude,
              label: data.result.postcode,
            };
          }
        } else {
          const encoded = encodeURIComponent(loc + ", UK");
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=gb`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();

          if (data && data[0]) {
            coords = {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
              label: data[0].display_name.split(",")[0],
            };
          }
        }

        if (coords) {
          postcodeCache.current[cacheKey] = coords;
          setPostcodeCoords(coords);
        } else {
          setPostcodeCoords(null);
          setPostcodeError("Location not found.");
        }
      } catch {
        setPostcodeCoords(null);
      } finally {
        setPostcodeLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [searchLocation]);

  const handleSearch = () => {
    if (guestData.children > 0 && !guestData.isValid) return;

    const params = new URLSearchParams();

    if (searchLocation) params.set("location", searchLocation);
    if (checkIn) params.set("checkIn", checkIn);
    if (duration) params.set("duration", duration);

    params.set("adults", guestData.adults);
    params.set("children", guestData.children);

    if (guestData.childAges.length > 0) {
      params.set("childAges", guestData.childAges.join(","));
    }

    if (postcodeCoords) params.set("radius", radiusMiles);

    window.location.href =
      createPageUrl("Search") + "?" + params.toString();
  };

  const propertyTypes = [
    { icon: TreePine, label: "Lodges", type: "lodges" },
    { icon: HomeIcon, label: "Houses", type: "house" },
    { icon: Mountain, label: "Chalets", type: "chalet" },
    { icon: Caravan, label: "Caravans", type: "caravan" },
    { icon: Waves, label: "Cabins", type: "cabin" },
    { icon: Building2, label: "Bungalows", type: "bungalow" },
    { icon: Building2, label: "Apartments", type: "apartment" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* HERO SECTION */}
      <section className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/d/1dO0GP74-0q34O64CKSL0gGCan9qeELf5')] bg-cover bg-center opacity-20" />

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

          {/* SEARCH BOX */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl p-4 md:p-6 max-w-4xl mx-auto"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* LOCATION */}
              <div className="md:col-span-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Location or postcode
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                    <Input
                      placeholder="Location or Postcode"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className={`pl-10 h-12 border-gray-200 ${
                        postcodeError
                          ? "border-red-400"
                          : postcodeCoords
                          ? "border-teal-400"
                          : ""
                      }`}
                    />

                    {postcodeLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                    )}
                  </div>

                  {postcodeCoords && (
                    <Select
                      value={String(radiusMiles)}
                      onValueChange={(v) => setRadiusMiles(parseInt(v))}
                    >
                      <SelectTrigger className="w-36 h-12 bg-teal-50 border-teal-200 text-teal-800 shrink-0">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="5">Within 5 mi</SelectItem>
                        <SelectItem value="10">Within 10 mi</SelectItem>
                        <SelectItem value="25">Within 25 mi</SelectItem>
                        <SelectItem value="50">Within 50 mi</SelectItem>
                        <SelectItem value="100">Within 100 mi</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* CHECK-IN */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Trip start
                </label>

                <BookingCalendar
                  value={checkIn}
                  onSelect={(date) => {
                    setCheckIn(date ? format(date, "yyyy-MM-dd") : "");
                    setDuration("");
                  }}
                  placeholder="Select date"
                  className="h-12 bg-white w-full border-gray-200"
                  numberOfMonths={1}
                />
              </div>

              {/* DURATION */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Duration
                </label>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full">
                        <Select
                          disabled={!checkIn}
                          value={duration}
                          onValueChange={setDuration}
                        >
                          <SelectTrigger
                            className={`w-full h-12 bg-white border-gray-200 ${
                              !checkIn ? "opacity-50 pointer-events-none" : ""
                            }`}
                          >
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>

                          <SelectContent>
                            {[...Array(28)].map((_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {i + 1} night{i + 1 !== 1 ? "s" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TooltipTrigger>

                    {!checkIn && (
                      <TooltipContent>
                        <p>Select your trip start date</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* GUESTS */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Guests
                </label>

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

      {/* PROPERTY TYPES */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
          Browse by property type
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {propertyTypes.map((type, idx) => (
            <motion.div
              key={type.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link
                to={createPageUrl("Search") + `?type=${type.type}`}
                className="block p-6 bg-gray-50 rounded-2xl hover:bg-teal-50 hover:border-teal-200 border-2 border-transparent transition-all group"
              >
                <type.icon className="w-10 h-10 text-teal-600 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-gray-900">{type.label}</h3>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURED PROPERTIES */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Featured Properties
            </h2>

            <Link
              to={createPageUrl("Search")}
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

      {/* HOST CTA */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-3xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="p-8 md:p-12 text-white">
              <Badge className="bg-white/20 text-white border-0 mb-4">
                For Hosts
              </Badge>

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
                  "No hidden fees or surprises",
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-teal-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isAuthenticated ? (
                hasRole(userRoles, "host") ? (
                  <Link to={createPageUrl("HostDashboard")}>
                    <Button
                      size="lg"
                      className="bg-white text-teal-700 hover:bg-teal-50"
                    >
                      Go to Host Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <Link to={createPageUrl("BecomeHost")}>
                    <Button
                      size="lg"
                      className="bg-white text-teal-700 hover:bg-teal-50"
                    >
                      Become a Host
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )
              ) : (
                <Link to="/founding">
                  <Button
                    size="lg"
                    className="bg-white text-teal-700 hover:bg-teal-50"
                  >
                    Become a Host
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>

            <div className="hidden md:block h-full">
               <img
                src="https://lh3.googleusercontent.com/d/1rRoDfT5XKQW3TtRwulxbIJoo7LJi98gK"
                alt="Beautiful holiday home"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CleanKeep CTA Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="hidden md:block h-full">
              <img
                src="https://lh3.googleusercontent.com/d/1dO0GP74-0q34O64CKSL0gGCan9qeELf5"
                alt="Cornwall coastline"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-8 md:p-12 text-white">
              <Badge className="bg-white/20 text-white border-0 mb-4">
                For Cleaners
              </Badge>

              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Get consistent work.<br />Keep 100% of earnings.
              </h2>

              <p className="text-blue-100 text-lg mb-6">
                Join CleanKeep and connect directly with holiday home owners in Cornwall. Set your rates, build your reputation.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  "Professional public profile",
                  "Availability calendar & messaging",
                  "Build your reputation with reviews",
                  "No commission on your earnings",
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isAuthenticated ? (
                hasRole(userRoles, "cleaner") ? (
                  <Link to={createPageUrl("CleanerDashboard")}>
                    <Button
                      size="lg"
                      className="bg-white text-blue-700 hover:bg-blue-50"
                    >
                      Go to Cleaner Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/founding">
                    <Button
                      size="lg"
                      className="bg-white text-blue-700 hover:bg-blue-50"
                    >
                      Become a Cleaner
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )
              ) : (
                <Link to="/founding">
                  <Button
                    size="lg"
                    className="bg-white text-blue-700 hover:bg-blue-50"
                  >
                    Become a Cleaner
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}