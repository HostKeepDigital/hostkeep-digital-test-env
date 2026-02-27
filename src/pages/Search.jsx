import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search as SearchIcon, MapPin, Calendar, Users, SlidersHorizontal, X, Loader2 } from "lucide-react";
import PropertyCard from "@/components/properties/PropertyCard";
import { format, parseISO, addDays, getDay } from "date-fns";
import BookingCalendar from "@/components/shared/BookingCalendar";
import GuestSelector from "@/components/search/GuestSelector";

// Haversine distance in miles
const haversineDistanceMiles = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Detect if input looks like a UK postcode
const isPostcodeLike = (val) => /^[A-Z]{1,2}\d/i.test(val.trim().replace(/\s/g, ''));

// Geocode any UK location string (postcode or place name) to lat/lng
const geocodeLocation = async (input) => {
  const clean = input.trim();
  if (!clean) return null;

  if (isPostcodeLike(clean)) {
    const code = clean.toUpperCase().replace(/\s+/g, '');
    const res = await fetch(`https://api.postcodes.io/postcodes/${code}`);
    const data = await res.json();
    if (res.ok && data.status === 200 && data.result) {
      return { lat: data.result.latitude, lng: data.result.longitude, label: data.result.postcode };
    }
    return null;
  }

  // Place name: use Nominatim (OpenStreetMap) free geocoder
  const encoded = encodeURIComponent(clean + ', UK');
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=gb`, {
    headers: { 'Accept-Language': 'en' }
  });
  const data = await res.json();
  if (data && data[0]) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name.split(',')[0] };
  }
  return null;
};

const AMENITIES = [
  "WiFi", "Pool", "Parking", "Air Conditioning", "Kitchen", "Washing Machine",
  "TV", "Hot Tub", "Garden", "BBQ", "Gym", "Beach Access"
];

export default function Search() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Parse child ages from URL
  const parseChildAges = () => {
    const agesParam = urlParams.get('childAges');
    if (!agesParam) return [];
    return agesParam.split(',').map(a => parseInt(a)).filter(a => !isNaN(a));
  };

  const [filters, setFilters] = useState({
    location: urlParams.get('location') || "",
    checkIn: urlParams.get('checkIn') || "",
    duration: urlParams.get('duration') || "",
    adults: parseInt(urlParams.get('adults')) || 1,
    children: parseInt(urlParams.get('children')) || 0,
    childAges: parseChildAges(),
    type: urlParams.get('type') || "all",
    minPrice: 0,
    maxPrice: 1000,
    bedrooms: "any",
    amenities: [],
    petsAllowed: false,
    smokingAllowed: false,
    childrenAllowed: false,
    instantBook: false,
    radiusMiles: 25,
  });

  const [sortBy, setSortBy] = useState("recommended");
  const [debugLog, setDebugLog] = useState([]);

  // Postcode radius search state
  const [postcodeCoords, setPostcodeCoords] = useState(null); // { lat, lng, postcode }
  const [postcodeLoading, setPostcodeLoading] = useState(false);
  const [postcodeError, setPostcodeError] = useState("");
  const postcodeCache = useRef({});

  const { data: allProperties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.filter({ status: 'published' }),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['all-reviews'],
    queryFn: () => base44.entities.Review.filter({ visible: true, review_type: "guest_to_host" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: activeBookings = [] } = useQuery({
    queryKey: ['active-bookings'],
    queryFn: async () => {
      const bookings = await base44.entities.Booking.list();
      return bookings.filter(b => ['confirmed', 'blocked', 'checked_in', 'awaiting_decision', 'awaiting_payment'].includes(b.booking_status));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Calculate ratings for properties
  const propertyRatings = reviews.reduce((acc, review) => {
    if (!acc[review.property_id]) {
      acc[review.property_id] = { total: 0, count: 0 };
    }
    acc[review.property_id].total += review.rating;
    acc[review.property_id].count += 1;
    return acc;
  }, {});

  const filteredProperties = allProperties.map(property => {
    let isAvailable = true;
    let unavailableReason = null;
    let suggestion = null;
    
    if (filters.checkIn) {
      const requestedCheckIn = parseISO(filters.checkIn);
      const requestedDuration = filters.duration ? parseInt(filters.duration) : null;
      
      const propertyBookings = activeBookings.filter(b => b.property_id === property.id);
      
      const checkBookingConflict = (checkInDate, duration) => {
        if (!duration) return false;
        const coDate = addDays(checkInDate, duration);
        return propertyBookings.some(b => {
          if (!b.check_in || !b.check_out) return false;
          return checkInDate < parseISO(b.check_out) && coDate > parseISO(b.check_in);
        });
      };

      let hasConflict = false;
      let conflictingBooking = null;

      if (requestedDuration) {
          const coDate = addDays(requestedCheckIn, requestedDuration);
          conflictingBooking = propertyBookings.find(b => {
            if (!b.check_in || !b.check_out) return false;
            return requestedCheckIn < parseISO(b.check_out) && coDate > parseISO(b.check_in);
          });
          hasConflict = !!conflictingBooking;
      } else {
          conflictingBooking = propertyBookings.find(b => {
              if (!b.check_in || !b.check_out) return false;
              return requestedCheckIn >= parseISO(b.check_in) && requestedCheckIn < parseISO(b.check_out);
          });
          hasConflict = !!conflictingBooking;
      }
      
      if (hasConflict) {
        isAvailable = false;
        unavailableReason = "Not available for selected dates";
      }

      if (property.day_based_restrictions_enabled && property.booking_rules) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = new Date();
        today.setHours(0,0,0,0);

        const getValidDurationsForDate = (date) => {
          const rule = property.booking_rules[dayNames[getDay(date)]];
          if (!rule || rule.enabled === false) return [];
          const ruleType = rule.rule_type || 'any';
          const allowedVals = new Set();
          
          if (ruleType === 'fixed_or_multiples' || ruleType === 'fixed' || ruleType === 'multiples') {
            if (rule.fixed_values) rule.fixed_values.forEach(v => allowedVals.add(v));
            if (rule.multiple_of) {
              const multiples = Array.isArray(rule.multiple_of) ? rule.multiple_of : [rule.multiple_of];
              multiples.forEach(m => {
                if (typeof m === 'number' && m > 0) {
                  for (let i=1; i*m <= 28; i++) allowedVals.add(i*m);
                }
              });
            }
            return Array.from(allowedVals);
          } else {
            const minStay = rule.min_days || property.minimum_stay || 1;
            const maxStay = rule.max_days || 28;
            for(let i=minStay; i<=maxStay; i++) allowedVals.add(i);
            return Array.from(allowedVals);
          }
        };

        const reqValidDurations = getValidDurationsForDate(requestedCheckIn);
        const isReqCheckInValid = reqValidDurations.length > 0;
        const isReqDurationValid = requestedDuration ? reqValidDurations.includes(requestedDuration) : true;

        if (!isAvailable || !isReqCheckInValid || !isReqDurationValid) {
            isAvailable = false;
            if (!unavailableReason) unavailableReason = "Not available for selected dates";
            
            if (isReqCheckInValid && !isReqDurationValid && requestedDuration && !hasConflict) {
                // Case 1: Check-in valid, duration invalid
                const validWithoutConflict = reqValidDurations.filter(dur => !checkBookingConflict(requestedCheckIn, dur));
                
                // Find closest smaller and closest larger durations
                const smallerDurations = validWithoutConflict.filter(d => d < requestedDuration).sort((a, b) => b - a);
                const largerDurations = validWithoutConflict.filter(d => d > requestedDuration).sort((a, b) => a - b);
                
                const closestDurations = [];
                if (smallerDurations.length > 0) closestDurations.push(smallerDurations[0]);
                if (largerDurations.length > 0) closestDurations.push(largerDurations[0]);

                // If we don't have one below and one above, just take the two closest ones overall
                if (closestDurations.length < 2) {
                    const fallbackDurations = validWithoutConflict
                        .sort((a, b) => Math.abs(a - requestedDuration) - Math.abs(b - requestedDuration))
                        .slice(0, 2);
                    closestDurations.splice(0, closestDurations.length, ...fallbackDurations);
                }

                if (closestDurations.length > 0) {
                    suggestion = {
                        message: `This property requires specific stay durations. Try one of these options:`,
                        options: closestDurations.map(dur => ({
                            checkIn: format(requestedCheckIn, 'yyyy-MM-dd'),
                            duration: dur,
                            label: `${dur} nights`
                        }))
                    };
                }
            } 
            else {
                // Case 2: Check-in invalid or Booked (Start Date Validation)
                const options = [];

                // Helper to check if a specific date is blocked by an existing booking
                // Does NOT check duration/end date, only if the start date itself is occupied
                const isDateBlocked = (date) => {
                    return propertyBookings.some(b => {
                        if (!b.check_in || !b.check_out) return false;
                        // Check if date falls within [check_in, check_out)
                        return date >= parseISO(b.check_in) && date < parseISO(b.check_out);
                    });
                };

                const isValidCheckInDate = (date) => {
                    if (isDateBlocked(date)) return false;
                    const validDurs = getValidDurationsForDate(date);
                    return validDurs.length > 0;
                };

                // Find nearest available day before
                let prevDate = null;
                for (let i = 1; i <= 14; i++) {
                    const testDate = addDays(requestedCheckIn, -i);
                    if (testDate < today) break;
                    if (isValidCheckInDate(testDate)) {
                        prevDate = testDate;
                        break; 
                    }
                }

                // Find nearest available day after
                let nextDate = null;
                for (let i = 1; i <= 14; i++) {
                    const testDate = addDays(requestedCheckIn, i);
                    if (isValidCheckInDate(testDate)) {
                         nextDate = testDate;
                         break;
                    }
                }

                const addOptionForDate = (date) => {
                    let dur = null;
                    let label = format(date, 'EEEE do MMM yyyy');

                    // Check if there are ANY valid durations for this date that don't conflict with existing bookings
                    const validDurs = getValidDurationsForDate(date);
                    const bookableDurs = validDurs.filter(d => !checkBookingConflict(date, d));
                    
                    if (bookableDurs.length === 0) {
                        // No valid duration available for this date that doesn't conflict
                        return;
                    }

                    if (requestedDuration) {
                        // Find closest valid duration
                        dur = bookableDurs.reduce((prev, curr) => Math.abs(curr - requestedDuration) < Math.abs(prev - requestedDuration) ? curr : prev);
                        label += ` - ${dur} night${dur > 1 ? 's' : ''}`;
                    }
                    
                    options.push({
                        checkIn: format(date, 'yyyy-MM-dd'),
                        duration: dur,
                        label: label
                    });
                };

                if (prevDate) addOptionForDate(prevDate);
                if (nextDate) addOptionForDate(nextDate);
                
                // Sort by date
                options.sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

                if (options.length > 0) {
                    suggestion = {
                        message: hasConflict 
                            ? "This property is already booked for these dates."
                            : "Check-in is not available on this specific day.",
                        conflictDates: hasConflict && conflictingBooking ? {
                            start: conflictingBooking.check_in,
                            end: conflictingBooking.check_out
                        } : null,
                        suggestionLabel: "The closest available start dates are:",
                        options: options
                    };
                }
            }
            
            if (suggestion) unavailableReason = null;
        }
      }
    }

    const totalGuests = filters.adults + filters.children;
    if (isAvailable && totalGuests > property.guest_capacity) {
      isAvailable = false;
      unavailableReason = `Maximum occupancy is ${property.guest_capacity} guests`;
      suggestion = null;
    }

    if (isAvailable && filters.children > 0) {
      if (property.children_allowed === false) {
        isAvailable = false;
        unavailableReason = "This property does not accept children";
        suggestion = null;
      } else if (property.minimum_child_age != null && property.minimum_child_age > 0) {
        const hasUnderageChild = filters.childAges.some(age => age < property.minimum_child_age);
        if (hasUnderageChild) {
          isAvailable = false;
          unavailableReason = "This property does not accept children under the minimum age requirement.";
          suggestion = null;
        }
      }
    }

    return { ...property, isAvailable, unavailableReason, suggestion };
  const newDebugLog = [];

  }).filter(property => {
    // Location filter — postcode radius takes priority over text matching
    if (filters.location) {
      if (postcodeCoords) {
        const lat = property.property_lat ?? property.latitude;
        const lng = property.property_lng ?? property.longitude;

        if (!lat || !lng) {
          newDebugLog.push({
            id: property.id,
            title: property.title,
            status: "❌ NO COORDS",
            lat, lng,
            dist: null,
          });
          return false;
        }

        const dist = haversineDistanceMiles(
          postcodeCoords.lat, postcodeCoords.lng,
          lat, lng
        );
        const passes = dist <= filters.radiusMiles;
        newDebugLog.push({
          id: property.id,
          title: property.title,
          status: passes ? "✅ IN RANGE" : "❌ TOO FAR",
          lat, lng,
          dist: Math.round(dist * 10) / 10,
          radius: filters.radiusMiles,
        });

        if (!passes) return false;
        property._distance_miles = dist;
      } else if (!isPostcodeLike(filters.location)) {
        // Text-based fallback only for non-postcode searches
        const searchTerm = filters.location.toLowerCase();
        const locationMatch =
          property.county?.toLowerCase().includes(searchTerm) ||
          property.town?.toLowerCase().includes(searchTerm) ||
          property.location?.locality?.toLowerCase().includes(searchTerm) ||
          property.postcode?.toLowerCase().includes(searchTerm) ||
          property.title?.toLowerCase().includes(searchTerm);
        if (!locationMatch) return false;
      }
    }

    // Property type filter
    if (filters.type !== "all" && property.property_type !== filters.type) {
      return false;
    }

    // Bedroom filter
    if (filters.bedrooms !== "any") {
      const bedroomCount = parseInt(filters.bedrooms);
      if (property.bedrooms < bedroomCount) {
        return false;
      }
    }

    // Price range filter
    if (property.nightly_rate < filters.minPrice || property.nightly_rate > filters.maxPrice) {
      return false;
    }

    // Amenities filter
    if (filters.amenities.length > 0) {
      const propertyAmenities = property.amenities || [];
      if (!filters.amenities.every(a => propertyAmenities.includes(a))) {
        return false;
      }
    }

    // Special features filters
    if (filters.petsAllowed && !property.pets_allowed) {
      return false;
    }
    if (filters.smokingAllowed && !property.smoking_allowed) {
      return false;
    }
    if (filters.childrenAllowed && !property.children_allowed) {
      return false;
    }

    return true;
  });

  // Update debug log state after filter completes (only when postcode active)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (postcodeCoords && newDebugLog.length > 0) {
      setDebugLog(newDebugLog);
    } else if (!postcodeCoords) {
      setDebugLog([]);
    }
  });

  const effectiveSortBy = postcodeCoords ? "nearest" : sortBy;

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) {
      return a.isAvailable ? -1 : 1;
    }

    // When postcode coords resolved, sort by distance first
    if (effectiveSortBy === "nearest") {
      return (a._distance_miles ?? Infinity) - (b._distance_miles ?? Infinity);
    }

    const aRating = propertyRatings[a.id] 
      ? propertyRatings[a.id].total / propertyRatings[a.id].count 
      : 0;
    const bRating = propertyRatings[b.id] 
      ? propertyRatings[b.id].total / propertyRatings[b.id].count 
      : 0;
    const aReviewCount = propertyRatings[a.id]?.count || 0;
    const bReviewCount = propertyRatings[b.id]?.count || 0;

    switch (sortBy) {
      case "price_low": 
        return (a.nightly_rate || 0) - (b.nightly_rate || 0);
      case "price_high": 
        return (b.nightly_rate || 0) - (a.nightly_rate || 0);
      case "rating": 
        // Sort by rating, then by review count
        if (bRating !== aRating) return bRating - aRating;
        return bReviewCount - aReviewCount;
      case "newest": 
        return new Date(b.created_date) - new Date(a.created_date);
      case "recommended":
        // Weighted score: rating * 0.6 + reviewCount * 0.2 + recency * 0.2
        const aScore = (aRating * 0.6) + (Math.min(aReviewCount, 50) / 50 * 5 * 0.2) + 
          (new Date(a.created_date).getTime() / Date.now() * 5 * 0.2);
        const bScore = (bRating * 0.6) + (Math.min(bReviewCount, 50) / 50 * 5 * 0.2) + 
          (new Date(b.created_date).getTime() / Date.now() * 5 * 0.2);
        return bScore - aScore;
      default: 
        return new Date(b.created_date) - new Date(a.created_date);
    }
  });

  // Geocode any location (postcode or place name) with debounce + cache
  useEffect(() => {
    const loc = filters.location.trim();
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
        const coords = await geocodeLocation(loc);
        if (coords) {
          postcodeCache.current[cacheKey] = coords;
          setPostcodeCoords(coords);
        } else {
          setPostcodeCoords(null);
          setPostcodeError("Location not found. Try a postcode or place name.");
        }
      } catch {
        setPostcodeCoords(null);
      } finally {
        setPostcodeLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [filters.location]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleAmenity = (amenity) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Location or Postcode"
                value={filters.location}
                onChange={(e) => handleFilterChange("location", e.target.value)}
                className={`pl-10 h-11 ${postcodeError ? 'border-red-400' : postcodeCoords ? 'border-green-400' : ''}`}
              />
              {postcodeLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>
            {/* Radius selector — only shown when postcode resolved */}
            {postcodeCoords && (
              <Select value={String(filters.radiusMiles)} onValueChange={(v) => handleFilterChange("radiusMiles", parseInt(v))}>
                <SelectTrigger className="w-36 h-11 bg-teal-50 border-teal-200 text-teal-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Within 5 miles</SelectItem>
                  <SelectItem value="10">Within 10 miles</SelectItem>
                  <SelectItem value="25">Within 25 miles</SelectItem>
                  <SelectItem value="50">Within 50 miles</SelectItem>
                  <SelectItem value="100">Within 100 miles</SelectItem>
                </SelectContent>
              </Select>
            )}
            <div className="w-44">
              <BookingCalendar
                value={filters.checkIn}
                onSelect={(date) => {
                  setFilters(prev => ({
                    ...prev,
                    checkIn: date ? format(date, "yyyy-MM-dd") : "",
                    duration: ""
                  }));
                }}
                placeholder="Trip Start"
                className="h-11 bg-white"
                numberOfMonths={1}
              />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-40" {...(!filters.checkIn ? { tabIndex: 0 } : {})}>
                    <Select disabled={!filters.checkIn} value={filters.duration} onValueChange={(v) => handleFilterChange("duration", v)}>
                      <SelectTrigger className={`w-full h-11 bg-white ${!filters.checkIn ? "opacity-50 pointer-events-none" : ""}`}>
                        <SelectValue placeholder="Trip Duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(28)].map((_, i) => (
                          <SelectItem key={i+1} value={(i+1).toString()}>{i+1} night{i+1 !== 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipTrigger>
                {!filters.checkIn && (
                  <TooltipContent>
                    <p>Select your trip start date</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <div className="w-64">
              <GuestSelector 
                value={{
                  adults: filters.adults,
                  children: filters.children,
                  childAges: filters.childAges
                }}
                onChange={(val) => {
                  if (val.isValid) {
                    setFilters(prev => ({
                      ...prev,
                      adults: val.adults,
                      children: val.children,
                      childAges: val.childAges
                    }));
                  }
                }}
              />
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-11 gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {(filters.amenities.length > 0 || filters.petsAllowed) && (
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">
                      {filters.amenities.length + 
                       (filters.petsAllowed ? 1 : 0) + 
                       (filters.smokingAllowed ? 1 : 0) + 
                       (filters.childrenAllowed ? 1 : 0) +
                       (filters.bedrooms !== "any" ? 1 : 0)}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="border-b pb-4">
                  <SheetTitle className="text-xl text-gray-900">Filter Properties</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-8">
                  {/* Property Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-teal-700 uppercase tracking-wide">Property Details</h3>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900 mb-2 block">Property Type</label>
                      <Select value={filters.type} onValueChange={(v) => handleFilterChange("type", v)}>
                        <SelectTrigger className="border-gray-300 focus:border-teal-600 focus:ring-teal-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="lodges">Lodges</SelectItem>
                          <SelectItem value="house">House</SelectItem>
                          <SelectItem value="chalet">Chalet</SelectItem>
                          <SelectItem value="caravan">Caravan</SelectItem>
                          <SelectItem value="cabin">Cabin</SelectItem>
                          <SelectItem value="bungalow">Bungalow</SelectItem>
                          <SelectItem value="apartment">Apartment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-900 mb-2 block">Bedrooms</label>
                      <Select value={filters.bedrooms} onValueChange={(v) => handleFilterChange("bedrooms", v)}>
                        <SelectTrigger className="border-gray-300 focus:border-teal-600 focus:ring-teal-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="1">1+</SelectItem>
                          <SelectItem value="2">2+</SelectItem>
                          <SelectItem value="3">3+</SelectItem>
                          <SelectItem value="4">4+</SelectItem>
                          <SelectItem value="5">5+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-teal-700 uppercase tracking-wide">Price Range</h3>
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-medium text-gray-900">£{filters.minPrice}</span>
                        <span className="text-sm font-medium text-gray-900">£{filters.maxPrice}+</span>
                      </div>
                      <Slider
                        value={[filters.minPrice, filters.maxPrice]}
                        onValueChange={([min, max]) => {
                          handleFilterChange("minPrice", min);
                          handleFilterChange("maxPrice", max);
                        }}
                        max={1000}
                        step={10}
                        className="[&_[role=slider]]:bg-teal-600 [&_[role=slider]]:border-teal-600"
                      />
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-teal-700 uppercase tracking-wide">Amenities</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {AMENITIES.map(amenity => (
                        <label key={amenity} className="flex items-center gap-2.5 cursor-pointer group">
                          <Checkbox
                            checked={filters.amenities.includes(amenity)}
                            onCheckedChange={() => toggleAmenity(amenity)}
                            className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900">{amenity}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Special Features */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-teal-700 uppercase tracking-wide">Special Features</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <Checkbox
                          checked={filters.petsAllowed}
                          onCheckedChange={(v) => handleFilterChange("petsAllowed", v)}
                          className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">Pet-friendly</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <Checkbox
                          checked={filters.childrenAllowed}
                          onCheckedChange={(v) => handleFilterChange("childrenAllowed", v)}
                          className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">Family-friendly</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <Checkbox
                          checked={filters.smokingAllowed}
                          onCheckedChange={(v) => handleFilterChange("smokingAllowed", v)}
                          className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">Smoking allowed</span>
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t sticky bottom-0 bg-white pb-4">
                    <Button 
                      variant="outline" 
                      className="w-full border-teal-600 text-teal-700 hover:bg-teal-50"
                      onClick={() => setFilters({
                        location: "",
                        checkIn: "",
                        duration: "",
                        adults: 1,
                        children: 0,
                        childAges: [],
                        type: "all",
                        minPrice: 0,
                        maxPrice: 1000,
                        bedrooms: "any",
                        amenities: [],
                        petsAllowed: false,
                        smokingAllowed: false,
                        childrenAllowed: false,
                        instantBook: false,
                        radiusMiles: 25,
                      })}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {(filters.amenities.length > 0 || filters.petsAllowed || filters.smokingAllowed || 
        filters.childrenAllowed || filters.bedrooms !== "any" || filters.type !== "all") && (
        <div className="bg-gray-100 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {filters.type !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-sm">
                  {filters.type}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-600" 
                    onClick={() => handleFilterChange("type", "all")}
                  />
                </span>
              )}
              {filters.bedrooms !== "any" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-sm">
                  {filters.bedrooms}+ bedrooms
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-600" 
                    onClick={() => handleFilterChange("bedrooms", "any")}
                  />
                </span>
              )}
              {filters.petsAllowed && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-sm">
                  Pet-friendly
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-600" 
                    onClick={() => handleFilterChange("petsAllowed", false)}
                  />
                </span>
              )}
              {filters.childrenAllowed && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-sm">
                  Family-friendly
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-600" 
                    onClick={() => handleFilterChange("childrenAllowed", false)}
                  />
                </span>
              )}
              {filters.smokingAllowed && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-sm">
                  Smoking allowed
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-600" 
                    onClick={() => handleFilterChange("smokingAllowed", false)}
                  />
                </span>
              )}
              {filters.amenities.map(amenity => (
                <span key={amenity} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-sm">
                  {amenity}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-600" 
                    onClick={() => toggleAmenity(amenity)}
                  />
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {postcodeError && (
          <div className="mb-4 text-sm text-red-600 flex items-center gap-1.5">
            <X className="w-4 h-4" /> {postcodeError}
          </div>
        )}
        {postcodeCoords && (
          <div className="mb-4 text-sm text-teal-700 flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
            <MapPin className="w-4 h-4" />
            Showing properties within <strong className="mx-1">{filters.radiusMiles} miles</strong> of <strong className="ml-1">{postcodeCoords.label || filters.location}</strong>, sorted nearest first.
          </div>
        )}
        {postcodeCoords && debugLog.length > 0 && (
          <div className="mb-6 border border-amber-300 bg-amber-50 rounded-lg p-4 text-xs font-mono">
            <div className="font-bold text-amber-800 mb-2 text-sm">
              🔍 Radius Debug — search centre: {postcodeCoords.lat.toFixed(4)}, {postcodeCoords.lng.toFixed(4)} | radius: {filters.radiusMiles} mi
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-amber-700 border-b border-amber-300">
                  <th className="text-left py-1 pr-3">Property</th>
                  <th className="text-left py-1 pr-3">Lat / Lng</th>
                  <th className="text-left py-1 pr-3">Distance</th>
                  <th className="text-left py-1">Result</th>
                </tr>
              </thead>
              <tbody>
                {debugLog.map((row, i) => (
                  <tr key={i} className={`border-b border-amber-200 ${row.status.startsWith('✅') ? 'text-green-700' : 'text-red-700'}`}>
                    <td className="py-1 pr-3">{row.title || row.id}</td>
                    <td className="py-1 pr-3">{row.lat ?? 'null'} / {row.lng ?? 'null'}</td>
                    <td className="py-1 pr-3">{row.dist != null ? `${row.dist} mi` : '—'}</td>
                    <td className="py-1">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">
            {sortedProperties.length} {sortedProperties.length === 1 ? 'property' : 'properties'} found
          </h1>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        ) : sortedProperties.length === 0 ? (
          <div className="text-center py-16">
            <SearchIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-500">Try adjusting your filters or search location</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProperties.map((property, idx) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <PropertyCard 
                  property={property} 
                  isAvailable={property.isAvailable} 
                  unavailableReason={property.unavailableReason}
                  distanceMiles={property._distance_miles != null ? Math.round(property._distance_miles * 10) / 10 : null}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}