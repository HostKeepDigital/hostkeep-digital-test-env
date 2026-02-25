import { useState, useEffect } from "react";
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
import { Search as SearchIcon, MapPin, Calendar, Users, SlidersHorizontal, X } from "lucide-react";
import PropertyCard from "@/components/properties/PropertyCard";
import { format, parseISO, addDays, getDay } from "date-fns";
import BookingCalendar from "@/components/shared/BookingCalendar";
import GuestSelector from "@/components/search/GuestSelector";

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
  });

  const [sortBy, setSortBy] = useState("recommended");

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
    
    if (filters.checkIn && filters.duration) {
      const requestedCheckIn = parseISO(filters.checkIn);
      const requestedDuration = parseInt(filters.duration);
      const requestedCheckOut = addDays(requestedCheckIn, requestedDuration);
      
      const propertyBookings = activeBookings.filter(b => b.property_id === property.id);
      
      const checkBookingConflict = (checkInDate, duration) => {
        const coDate = addDays(checkInDate, duration);
        return propertyBookings.some(b => {
          if (!b.check_in || !b.check_out) return false;
          return checkInDate < parseISO(b.check_out) && coDate > parseISO(b.check_in);
        });
      };

      const hasConflict = checkBookingConflict(requestedCheckIn, requestedDuration);
      
      if (hasConflict) {
        isAvailable = false;
        unavailableReason = "Not available for selected dates";
      }

      if (isAvailable && property.day_based_restrictions_enabled && property.booking_rules) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        let allowedCheckInDays = [];
        
        dayNames.forEach(day => {
          if (property.booking_rules[day] && property.booking_rules[day].enabled !== false) {
            allowedCheckInDays.push(day);
          }
        });

        const reqDayName = dayNames[getDay(requestedCheckIn)];
        const reqDayRule = property.booking_rules[reqDayName];
        
        let checkInRestricted = false;
        let suggestedCheckIn = null;
        let checkInWelcomeMessage = null;
        let durationRestricted = false;
        let availableDurations = [];

        // 1. Check check-in day restriction
        if (!reqDayRule || reqDayRule.enabled === false) {
          isAvailable = false;
          checkInRestricted = true;
          
          const capitalizedDays = allowedCheckInDays.map(d => d.charAt(0).toUpperCase() + d.slice(1));
          let daysString = "";
          if (capitalizedDays.length > 1) {
            const lastDay = capitalizedDays.pop();
            daysString = capitalizedDays.join(', ') + ' and ' + lastDay;
          } else {
            daysString = capitalizedDays[0] || "";
          }
            
          checkInWelcomeMessage = `This property welcomes check-ins on: ${daysString}.`;

          // Find nearest valid date within +/- 3 days
          const offsets = [1, -1, 2, -2, 3, -3];
          for (const offset of offsets) {
            const testDate = addDays(requestedCheckIn, offset);
            const today = new Date();
            today.setHours(0,0,0,0);
            if (testDate < today) continue;

            const testDayName = dayNames[getDay(testDate)];
            const testDayRule = property.booking_rules[testDayName];
            
            if (testDayRule && testDayRule.enabled !== false) {
              const conflict = checkBookingConflict(testDate, requestedDuration);
              if (!conflict) {
                suggestedCheckIn = testDate;
                break;
              }
            }
          }
        }

        // 2. Check duration restriction (on the requested check-in or suggested check-in)
        const dateToCheck = suggestedCheckIn || requestedCheckIn;
        const dayRuleToCheck = property.booking_rules[dayNames[getDay(dateToCheck)]];
        
        if (dayRuleToCheck && dayRuleToCheck.enabled !== false) {
          const ruleType = dayRuleToCheck.rule_type || 'any';
          if (ruleType === 'fixed_or_multiples') {
            const allowedVals = new Set();
            if (dayRuleToCheck.fixed_values) dayRuleToCheck.fixed_values.forEach(v => allowedVals.add(v));
            if (dayRuleToCheck.multiple_of) {
              dayRuleToCheck.multiple_of.forEach(m => {
                for (let i=1; i*m <= 28; i++) allowedVals.add(i*m);
              });
            }
            
            if (allowedVals.size > 0 && !allowedVals.has(requestedDuration)) {
              if (!checkInRestricted && isAvailable) {
                 isAvailable = false;
              }
              durationRestricted = true;
              availableDurations = Array.from(allowedVals)
                .filter(dur => !checkBookingConflict(dateToCheck, dur))
                .sort((a, b) => a - b)
                .slice(0, 3);
            }
          } else {
            const minStay = property.minimum_stay || 1;
            if (requestedDuration < minStay) {
              if (!checkInRestricted && isAvailable) {
                 isAvailable = false;
              }
              durationRestricted = true;
              availableDurations = [minStay, minStay + 1, minStay + 2]
                .filter(dur => !checkBookingConflict(dateToCheck, dur));
            }
          }
        }

        if (checkInRestricted || durationRestricted) {
          suggestion = {
            checkInRestricted,
            checkInWelcomeMessage,
            suggestedCheckIn: suggestedCheckIn ? format(suggestedCheckIn, 'yyyy-MM-dd') : null,
            suggestedCheckInFormatted: suggestedCheckIn ? format(suggestedCheckIn, 'EEEE do') : null,
            durationRestricted,
            availableDurations,
            targetCheckIn: suggestedCheckIn ? format(suggestedCheckIn, 'yyyy-MM-dd') : filters.checkIn 
          };
          unavailableReason = null;
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
  }).filter(property => {
    // Location filter
    if (filters.location) {
      const searchTerm = filters.location.toLowerCase();
      const locationMatch = 
        property.location?.city?.toLowerCase().includes(searchTerm) ||
        property.location?.town_city?.toLowerCase().includes(searchTerm) ||
        property.location?.locality?.toLowerCase().includes(searchTerm) ||
        property.location?.postcode?.toLowerCase().includes(searchTerm) ||
        property.title?.toLowerCase().includes(searchTerm);
      if (!locationMatch) return false;
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

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) {
      return a.isAvailable ? -1 : 1;
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
                placeholder="Location"
                value={filters.location}
                onChange={(e) => handleFilterChange("location", e.target.value)}
                className="pl-10 h-11"
              />
            </div>
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
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Property Type</label>
                    <Select value={filters.type} onValueChange={(v) => handleFilterChange("type", v)}>
                      <SelectTrigger>
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
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Bedrooms</label>
                    <Select value={filters.bedrooms} onValueChange={(v) => handleFilterChange("bedrooms", v)}>
                      <SelectTrigger>
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

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Price Range: £{filters.minPrice} - £{filters.maxPrice}+
                    </label>
                    <Slider
                      value={[filters.minPrice, filters.maxPrice]}
                      onValueChange={([min, max]) => {
                        handleFilterChange("minPrice", min);
                        handleFilterChange("maxPrice", max);
                      }}
                      max={1000}
                      step={10}
                      className="mt-4"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block">Amenities</label>
                    <div className="grid grid-cols-2 gap-2">
                      {AMENITIES.map(amenity => (
                        <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={filters.amenities.includes(amenity)}
                            onCheckedChange={() => toggleAmenity(amenity)}
                          />
                          <span className="text-sm text-gray-600">{amenity}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block">Special Features</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.petsAllowed}
                          onCheckedChange={(v) => handleFilterChange("petsAllowed", v)}
                        />
                        <span className="text-sm text-gray-600">Pet-friendly</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.childrenAllowed}
                          onCheckedChange={(v) => handleFilterChange("childrenAllowed", v)}
                        />
                        <span className="text-sm text-gray-600">Family-friendly</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={filters.smokingAllowed}
                          onCheckedChange={(v) => handleFilterChange("smokingAllowed", v)}
                        />
                        <span className="text-sm text-gray-600">Smoking allowed</span>
                      </label>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
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
                    })}
                  >
                    Clear All Filters
                  </Button>
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
                <PropertyCard property={property} isAvailable={property.isAvailable} unavailableReason={property.unavailableReason} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}