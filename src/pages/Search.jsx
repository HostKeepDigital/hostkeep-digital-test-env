import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Search as SearchIcon,
  MapPin,
  Calendar,
  Users,
  SlidersHorizontal,
  X,
  Loader2,
} from "lucide-react";
import PropertyCard from "@/components/properties/PropertyCard";
import {
  format,
  parseISO,
  addDays,
  getDay,
} from "date-fns";
import BookingCalendar from "@/components/shared/BookingCalendar";
import GuestSelector from "@/components/search/GuestSelector";

import { AMENITY_GROUPS, AMENITY_MAP } from "@/data/amenities";

// Haversine distance in miles
const haversineDistanceMiles = (lat1, lon1, lat2, lon2) => {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Detect if input looks like a UK postcode
const isPostcodeLike = (val) =>
  /^[A-Z]{1,2}\d/i.test(val.trim().replace(/\s/g, ""));

// Geocode any UK location string (postcode or place name)
const geocodeLocation = async (input) => {
  const clean = input.trim();
  if (!clean) return null;

  if (isPostcodeLike(clean)) {
    const code = clean.toUpperCase().replace(/\s+/g, "");

    const res = await fetch(
      `https://api.postcodes.io/postcodes/${code}`
    );
    const data = await res.json();
    if (res.ok && data.status === 200 && data.result) {
      return {
        lat: data.result.latitude,
        lng: data.result.longitude,
        label: data.result.postcode,
      };
    }

    const termRes = await fetch(
      `https://api.postcodes.io/terminated_postcodes/${code}`
    );
    const termData = await termRes.json();
    if (termRes.ok && termData.status === 200 && termData.result) {
      return {
        lat: termData.result.latitude,
        lng: termData.result.longitude,
        label: termData.result.postcode,
      };
    }

    const encoded = encodeURIComponent(clean + ", UK");
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=gb`,
      { headers: { "Accept-Language": "en" } }
    );
    const nomData = await nomRes.json();
    if (nomData && nomData[0]) {
      return {
        lat: parseFloat(nomData[0].lat),
        lng: parseFloat(nomData[0].lon),
        label: clean.toUpperCase(),
      };
    }

    return null;
  }

  const encoded = encodeURIComponent(clean + ", UK");
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=gb`,
    { headers: { "Accept-Language": "en" } }
  );
  const data = await res.json();
  if (data && data[0]) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      label: data[0].display_name.split(",")[0],
    };
  }
  return null;
};

export default function Search() {
  const { refreshing } = usePullToRefresh([["properties"], ["all-reviews"], ["active-bookings"]]);
  const urlParams = new URLSearchParams(window.location.search);

  const parseChildAges = () => {
    const agesParam = urlParams.get("childAges");
    if (!agesParam) return [];
    return agesParam
      .split(",")
      .map((a) => parseInt(a))
      .filter((a) => !isNaN(a));
  };

  const [filters, setFilters] = useState({
    location: urlParams.get("location") || "",
    checkIn: urlParams.get("checkIn") || "",
    duration: urlParams.get("duration") || "",
    adults: parseInt(urlParams.get("adults")) || 1,
    children: parseInt(urlParams.get("children")) || 0,
    childAges: parseChildAges(),
    type: urlParams.get("type") || "all",
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

  const [postcodeCoords, setPostcodeCoords] = useState(null);
  const [postcodeLoading, setPostcodeLoading] = useState(false);
  const [postcodeError, setPostcodeError] = useState("");
  const postcodeCache = useRef({});

  const { data: allProperties = [], isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: () =>
      base44.entities.Property.filter({ status: "published" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["all-reviews"],
    queryFn: () =>
      base44.entities.Review.filter({
        visible: true,
        review_type: "guest_to_host",
      }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: activeBookings = [] } = useQuery({
    queryKey: ["active-bookings"],
    queryFn: async () => {
      const bookings = await base44.entities.Booking.list();
      return bookings.filter((b) =>
        [
          "confirmed",
          "blocked",
          "checked_in",
          "awaiting_decision",
          "awaiting_payment",
        ].includes(b.booking_status)
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const propertyRatings = reviews.reduce((acc, review) => {
    if (!acc[review.property_id]) {
      acc[review.property_id] = { total: 0, count: 0 };
    }
    acc[review.property_id].total += review.rating;
    acc[review.property_id].count += 1;
    return acc;
  }, {});

  const mappedProperties = allProperties.map((property) => {
    let isAvailable = true;
    let unavailableReason = null;
    let suggestion = null;

    if (filters.checkIn) {
      const requestedCheckIn = parseISO(filters.checkIn);
      const requestedDuration = filters.duration
        ? parseInt(filters.duration)
        : null;

      const propertyBookings = activeBookings.filter(
        (b) => b.property_id === property.id
      );

      const checkBookingConflict = (checkInDate, duration) => {
        if (!duration) return false;
        const coDate = addDays(checkInDate, duration);
        return propertyBookings.some((b) => {
          if (!b.check_in || !b.check_out) return false;
          return (
            checkInDate < parseISO(b.check_out) &&
            coDate > parseISO(b.check_in)
          );
        });
      };

      let hasConflict = false;
      let conflictingBooking = null;

      if (requestedDuration) {
        const coDate = addDays(requestedCheckIn, requestedDuration);
        conflictingBooking = propertyBookings.find((b) => {
          if (!b.check_in || !b.check_out) return false;
          return (
            requestedCheckIn < parseISO(b.check_out) &&
            coDate > parseISO(b.check_in)
          );
        });
        hasConflict = !!conflictingBooking;
      } else {
        conflictingBooking = propertyBookings.find((b) => {
          if (!b.check_in || !b.check_out) return false;
          return (
            requestedCheckIn >= parseISO(b.check_in) &&
            requestedCheckIn < parseISO(b.check_out)
          );
        });
        hasConflict = !!conflictingBooking;
      }

      if (hasConflict) {
        isAvailable = false;
        unavailableReason = "Not available for selected dates";
      }

      if (
        property.day_based_restrictions_enabled &&
        property.booking_rules
      ) {
        const dayNames = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const getValidDurationsForDate = (date) => {
          const rule = property.booking_rules[dayNames[getDay(date)]];
          if (!rule || rule.enabled === false) return [];
          const ruleType = rule.rule_type || "any";
          const allowedVals = new Set();

          if (
            ruleType === "fixed_or_multiples" ||
            ruleType === "fixed" ||
            ruleType === "multiples"
          ) {
            if (rule.fixed_values)
              rule.fixed_values.forEach((v) => allowedVals.add(v));
            if (rule.multiple_of) {
              const multiples = Array.isArray(rule.multiple_of)
                ? rule.multiple_of
                : [rule.multiple_of];
              multiples.forEach((m) => {
                if (typeof m === "number" && m > 0) {
                  for (let i = 1; i * m <= 28; i++)
                    allowedVals.add(i * m);
                }
              });
            }
            return Array.from(allowedVals);
          } else {
            const minStay = rule.min_days || property.minimum_stay || 1;
            const maxStay = rule.max_days || 28;
            for (let i = minStay; i <= maxStay; i++)
              allowedVals.add(i);
            return Array.from(allowedVals);
          }
        };

        const reqValidDurations =
          getValidDurationsForDate(requestedCheckIn);
        const isReqCheckInValid = reqValidDurations.length > 0;
        const isReqDurationValid = requestedDuration
          ? reqValidDurations.includes(requestedDuration)
          : true;

        if (
          !isAvailable ||
          !isReqCheckInValid ||
          !isReqDurationValid
        ) {
          isAvailable = false;
          if (!unavailableReason)
            unavailableReason = "Not available for selected dates";

          if (
            isReqCheckInValid &&
            !isReqDurationValid &&
            requestedDuration &&
            !hasConflict
          ) {
            const validWithoutConflict = reqValidDurations.filter(
              (dur) =>
                !checkBookingConflict(requestedCheckIn, dur)
            );

            const smallerDurations = validWithoutConflict
              .filter((d) => d < requestedDuration)
              .sort((a, b) => b - a);
            const largerDurations = validWithoutConflict
              .filter((d) => d > requestedDuration)
              .sort((a, b) => a - b);

            const closestDurations = [];
            if (smallerDurations.length > 0)
              closestDurations.push(smallerDurations[0]);
            if (largerDurations.length > 0)
              closestDurations.push(largerDurations[0]);

            if (closestDurations.length < 2) {
              const fallbackDurations = validWithoutConflict
                .sort(
                  (a, b) =>
                    Math.abs(a - requestedDuration) -
                    Math.abs(b - requestedDuration)
                )
                .slice(0, 2);
              closestDurations.splice(
                0,
                closestDurations.length,
                ...fallbackDurations
              );
            }

            if (closestDurations.length > 0) {
              suggestion = {
                message:
                  "This property requires specific stay durations. Try one of these options:",
                options: closestDurations.map((dur) => ({
                  checkIn: format(
                    requestedCheckIn,
                    "yyyy-MM-dd"
                  ),
                  duration: dur,
                  label: `${dur} nights`,
                })),
              };
            }
          } else {
            const options = [];

            const isDateBlocked = (date) => {
              return propertyBookings.some((b) => {
                if (!b.check_in || !b.check_out) return false;
                return (
                  date >= parseISO(b.check_in) &&
                  date < parseISO(b.check_out)
                );
              });
            };

            const isValidCheckInDate = (date) => {
              if (isDateBlocked(date)) return false;
              const validDurs = getValidDurationsForDate(date);
              return validDurs.length > 0;
            };

            let prevDate = null;
            for (let i = 1; i <= 14; i++) {
              const testDate = addDays(requestedCheckIn, -i);
              if (testDate < today) break;
              if (isValidCheckInDate(testDate)) {
                prevDate = testDate;
                break;
              }
            }

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
              let label = format(date, "EEEE do MMM yyyy");

              const validDurs = getValidDurationsForDate(date);
              const bookableDurs = validDurs.filter(
                (d) => !checkBookingConflict(date, d)
              );

              if (bookableDurs.length === 0) return;

              if (requestedDuration) {
                dur = bookableDurs.reduce((prev, curr) =>
                  Math.abs(curr - requestedDuration) <
                  Math.abs(prev - requestedDuration)
                    ? curr
                    : prev
                );
                label += ` - ${dur} night${
                  dur > 1 ? "s" : ""
                }`;
              }

              options.push({
                checkIn: format(date, "yyyy-MM-dd"),
                duration: dur,
                label,
              });
            };

            if (prevDate) addOptionForDate(prevDate);
            if (nextDate) addOptionForDate(nextDate);

            options.sort(
              (a, b) =>
                new Date(a.checkIn) - new Date(b.checkIn)
            );

            if (options.length > 0) {
              suggestion = {
                message: hasConflict
                  ? "This property is already booked for these dates."
                  : "Check-in is not available on this specific day.",
                conflictDates:
                  hasConflict && conflictingBooking
                    ? {
                        start: conflictingBooking.check_in,
                        end: conflictingBooking.check_out,
                      }
                    : null,
                suggestionLabel:
                  "The closest available start dates are:",
                options,
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
        unavailableReason =
          "This property does not accept children";
        suggestion = null;
      } else if (
        property.minimum_child_age != null &&
        property.minimum_child_age > 0
      ) {
        const hasUnderageChild = filters.childAges.some(
          (age) => age < property.minimum_child_age
        );
        if (hasUnderageChild) {
          isAvailable = false;
          unavailableReason =
            "This property does not accept children under the minimum age requirement.";
          suggestion = null;
        }
      }
    }

    return {
      ...property,
      isAvailable,
      unavailableReason,
      suggestion,
    };
  });

  const newDebugLog = [];
  const filteredProperties = mappedProperties.filter((property) => {
    if (filters.location) {
      if (postcodeCoords) {
        const lat = property.property_lat ?? property.latitude;
        const lng = property.property_lng ?? property.longitude;

        if (!lat || !lng) return false;

        const dist = haversineDistanceMiles(
          postcodeCoords.lat,
          postcodeCoords.lng,
          lat,
          lng
        );
        const passes = dist <= filters.radiusMiles;

        if (!passes) return false;
        property._distance_miles = dist;
      } else {
        const searchTerm = filters.location.toLowerCase();
        const locationMatch =
          property.county?.toLowerCase().includes(searchTerm) ||
          property.town?.toLowerCase().includes(searchTerm) ||
          property.location?.locality
            ?.toLowerCase()
            .includes(searchTerm) ||
          property.postcode
            ?.toLowerCase()
            .includes(searchTerm) ||
          property.title?.toLowerCase().includes(searchTerm);
        if (!locationMatch) return false;
      }
    }

    if (
      filters.type !== "all" &&
      property.property_type !== filters.type
    )
      return false;

    if (filters.bedrooms !== "any") {
      if (property.bedrooms < parseInt(filters.bedrooms))
        return false;
    }

    if (
      property.nightly_rate < filters.minPrice ||
      property.nightly_rate > filters.maxPrice
    )
      return false;

    if (filters.amenities.length > 0) {
      const propertyAmenities = property.amenities || [];
      if (!filters.amenities.every((a) => propertyAmenities.includes(a)))
        return false;
    }

    if (filters.petsAllowed && !property.pets_allowed) return false;
    if (filters.smokingAllowed && !property.smoking_allowed) return false;
    if (filters.childrenAllowed && !property.children_allowed) return false;

    return true;
  });

  const effectiveSortBy = postcodeCoords ? "nearest" : sortBy;

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) {
      return a.isAvailable ? -1 : 1;
    }

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
        if (bRating !== aRating) return bRating - aRating;
        return bReviewCount - aReviewCount;
      case "newest":
        return new Date(b.created_date) - new Date(a.created_date);
      case "recommended":
        const aScore =
          aRating * 0.6 +
          (Math.min(aReviewCount, 50) / 50) * 5 * 0.2 +
          (new Date(a.created_date).getTime() / Date.now()) * 5 * 0.2;
        const bScore =
          bRating * 0.6 +
          (Math.min(bReviewCount, 50) / 50) * 5 * 0.2 +
          (new Date(b.created_date).getTime() / Date.now()) * 5 * 0.2;
        return bScore - aScore;
      default:
        return new Date(b.created_date) - new Date(a.created_date);
    }
  });

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
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAmenity = (slug) => {
    setFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(slug)
        ? prev.amenities.filter((a) => a !== slug)
        : [...prev.amenities, slug],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {refreshing && (
        <div className="fixed top-16 left-0 right-0 z-50 flex justify-center py-2">
          <div className="bg-white rounded-full shadow px-4 py-1.5 text-xs text-teal-600 font-medium flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            Refreshing…
          </div>
        </div>
      )}
      {/* Search Header */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">

          {/* Mobile: stacked 2-row layout. Desktop: single scrolling row */}
          <div className="flex flex-col gap-2 md:hidden">
            {/* Row 1: Location + Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="Location or Postcode"
                  value={filters.location}
                  onChange={(e) => handleFilterChange("location", e.target.value)}
                  className={`pl-9 h-11 text-sm ${
                    postcodeError ? "border-red-400" : postcodeCoords ? "border-green-400" : ""
                  }`}
                />
                {postcodeLoading ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                ) : postcodeCoords ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-xs font-medium">✓</span>
                ) : null}
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="flex-shrink-0 h-11 px-3 gap-1.5">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="text-sm">Filters</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                  <SheetHeader className="border-b pb-4">
                    <SheetTitle className="text-xl text-gray-900">Filter Properties</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-8">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-teal-700 uppercase tracking-wide">Property Details</h3>
                      <div>
                        <label className="text-sm font-medium text-gray-900 mb-2 block">Property Type</label>
                        <Select value={filters.type} onValueChange={(v) => handleFilterChange("type", v)}>
                          <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
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
                          <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
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
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-teal-700 uppercase tracking-wide">Price Range</h3>
                      <Slider
                        value={[filters.minPrice, filters.maxPrice]}
                        onValueChange={([min, max]) => setFilters((prev) => ({ ...prev, minPrice: min, maxPrice: max }))}
                        min={0} max={1000} step={10}
                      />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>£{filters.minPrice}</span>
                        <span>£{filters.maxPrice}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-teal-700 uppercase tracking-wide">Amenities</h3>
                      <div className="space-y-6">
                        {Object.entries(AMENITY_GROUPS).map(([groupName, slugs]) => (
                          <div key={groupName}>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">{groupName}</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {slugs.map((slug) => {
                                const amenity = AMENITY_MAP[slug];
                                if (!amenity) return null;
                                return (
                                  <label key={slug} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <Checkbox checked={filters.amenities.includes(slug)} onCheckedChange={() => toggleAmenity(slug)} />
                                    <span className="text-sm">{amenity.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-teal-700 uppercase tracking-wide">Additional Filters</h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={filters.petsAllowed} onCheckedChange={(v) => handleFilterChange("petsAllowed", v)} />
                        <span>Pet Friendly</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={filters.smokingAllowed} onCheckedChange={(v) => handleFilterChange("smokingAllowed", v)} />
                        <span>Smoking Allowed</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={filters.childrenAllowed} onCheckedChange={(v) => handleFilterChange("childrenAllowed", v)} />
                        <span>Children Allowed</span>
                      </label>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setFilters((prev) => ({ ...prev, amenities: [], petsAllowed: false, smokingAllowed: false, childrenAllowed: false, bedrooms: "any", minPrice: 0, maxPrice: 1000 }))}>
                      Clear Filters
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Row 2: Check-in + Nights (equal halves) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <BookingCalendar
                  value={filters.checkIn}
                  onSelect={(date) => setFilters((prev) => ({ ...prev, checkIn: date ? format(date, "yyyy-MM-dd") : "", duration: "" }))}
                  placeholder="Check-in date"
                  className="h-11 w-full text-sm"
                  numberOfMonths={1}
                />
              </div>
              <div>
                <Select
                  disabled={!filters.checkIn}
                  value={filters.duration}
                  onValueChange={(v) => handleFilterChange("duration", v)}
                >
                  <SelectTrigger className="w-full h-11 text-sm">
                    <SelectValue placeholder="Nights" />
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
            </div>

            {/* Row 3: Guests full-width (dropdown expands downward) */}
            <div className="w-full">
              <GuestSelector
                value={{ adults: filters.adults, children: filters.children, childAges: filters.childAges }}
                onChange={(val) => {
                  if (val.isValid) setFilters((prev) => ({ ...prev, adults: val.adults, children: val.children, childAges: val.childAges }));
                }}
              />
            </div>

            {/* Radius pill (when location matched) */}
            {postcodeCoords && (
              <Select value={String(filters.radiusMiles)} onValueChange={(v) => handleFilterChange("radiusMiles", parseInt(v))}>
                <SelectTrigger className="h-9 bg-teal-50 border-teal-200 text-teal-800 text-sm">
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
          </div>

          {/* Desktop: original single-row scrollable layout */}
          <div className="hidden md:flex gap-3 items-center overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="relative flex-shrink-0 w-44 md:flex-1 md:min-w-[200px] md:w-auto">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Location or Postcode"
                value={filters.location}
                onChange={(e) => handleFilterChange("location", e.target.value)}
                className={`pl-10 h-11 ${
                  postcodeError ? "border-red-400" : postcodeCoords ? "border-green-400" : ""
                }`}
              />
              {postcodeLoading ? (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
              ) : postcodeCoords ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-xs font-medium">✓</span>
              ) : null}
            </div>
            {postcodeCoords && (
              <Select value={String(filters.radiusMiles)} onValueChange={(v) => handleFilterChange("radiusMiles", parseInt(v))}>
                <SelectTrigger className="flex-shrink-0 w-32 md:w-36 h-11 bg-teal-50 border-teal-200 text-teal-800">
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
            <div className="flex-shrink-0 w-40 md:w-44">
              <BookingCalendar
                value={filters.checkIn}
                onSelect={(date) => setFilters((prev) => ({ ...prev, checkIn: date ? format(date, "yyyy-MM-dd") : "", duration: "" }))}
                placeholder="Trip Start"
                className="h-11 bg-white"
                numberOfMonths={1}
              />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-shrink-0 w-36 md:w-40">
                    <Select disabled={!filters.checkIn} value={filters.duration} onValueChange={(v) => handleFilterChange("duration", v)}>
                      <SelectTrigger className="w-full h-11 bg-white">
                        <SelectValue placeholder="Trip Duration" />
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
                {!filters.checkIn && (<TooltipContent><p>Select your trip start date</p></TooltipContent>)}
              </Tooltip>
            </TooltipProvider>
            <div className="flex-shrink-0 w-52 md:w-64">
              <GuestSelector
                value={{ adults: filters.adults, children: filters.children, childAges: filters.childAges }}
                onChange={(val) => {
                  if (val.isValid) setFilters((prev) => ({ ...prev, adults: val.adults, children: val.children, childAges: val.childAges }));
                }}
              />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-shrink-0 h-11 gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="border-b pb-4">
                  <SheetTitle className="text-xl text-gray-900">Filter Properties</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-teal-700 uppercase tracking-wide">Property Details</h3>
                    <div>
                      <label className="text-sm font-medium text-gray-900 mb-2 block">Property Type</label>
                      <Select value={filters.type} onValueChange={(v) => handleFilterChange("type", v)}>
                        <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
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
                        <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
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
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-teal-700 uppercase tracking-wide">Price Range</h3>
                    <Slider
                      value={[filters.minPrice, filters.maxPrice]}
                      onValueChange={([min, max]) => setFilters((prev) => ({ ...prev, minPrice: min, maxPrice: max }))}
                      min={0} max={1000} step={10}
                    />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>£{filters.minPrice}</span>
                      <span>£{filters.maxPrice}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-teal-700 uppercase tracking-wide">Amenities</h3>
                    <div className="space-y-6">
                      {Object.entries(AMENITY_GROUPS).map(([groupName, slugs]) => (
                        <div key={groupName}>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">{groupName}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {slugs.map((slug) => {
                              const amenity = AMENITY_MAP[slug];
                              if (!amenity) return null;
                              return (
                                <label key={slug} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                  <Checkbox checked={filters.amenities.includes(slug)} onCheckedChange={() => toggleAmenity(slug)} />
                                  <span className="text-sm">{amenity.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-teal-700 uppercase tracking-wide">Additional Filters</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={filters.petsAllowed} onCheckedChange={(v) => handleFilterChange("petsAllowed", v)} />
                      <span>Pet Friendly</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={filters.smokingAllowed} onCheckedChange={(v) => handleFilterChange("smokingAllowed", v)} />
                      <span>Smoking Allowed</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={filters.childrenAllowed} onCheckedChange={(v) => handleFilterChange("childrenAllowed", v)} />
                      <span>Children Allowed</span>
                    </label>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setFilters((prev) => ({ ...prev, amenities: [], petsAllowed: false, smokingAllowed: false, childrenAllowed: false, bedrooms: "any", minPrice: 0, maxPrice: 1000 }))}>
                    Clear Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Results count + sort */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{sortedProperties.length}</span> {sortedProperties.length === 1 ? "property" : "properties"} found
            </p>
            <Select value={effectiveSortBy === "nearest" ? "nearest" : sortBy} onValueChange={setSortBy} disabled={effectiveSortBy === "nearest"}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="price_low">Price: Low–High</SelectItem>
                <SelectItem value="price_high">Price: High–Low</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                {effectiveSortBy === "nearest" && <SelectItem value="nearest">Nearest</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        )}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : sortedProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <SearchIcon className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No properties found</h3>
            <p className="text-sm text-gray-500">Try adjusting your filters or search area</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {sortedProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isAvailable={property.isAvailable}
                unavailableReason={property.unavailableReason}
                distanceMiles={
                  property._distance_miles
                    ? Math.round(property._distance_miles * 10) / 10
                    : null
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}