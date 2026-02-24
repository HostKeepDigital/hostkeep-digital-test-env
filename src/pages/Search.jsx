import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search as SearchIcon, MapPin, Calendar, Users, SlidersHorizontal, X } from "lucide-react";
import PropertyCard from "@/components/properties/PropertyCard";
import { format, parseISO, addDays } from "date-fns";

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
    duration: urlParams.get('duration') || "1",
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
    if (filters.checkIn && filters.duration) {
      const requestedCheckIn = parseISO(filters.checkIn);
      const requestedCheckOut = addDays(requestedCheckIn, parseInt(filters.duration));
      
      const propertyBookings = activeBookings.filter(b => b.property_id === property.id);
      
      const hasConflict = propertyBookings.some(b => {
        if (!b.check_in || !b.check_out) return false;
        const bCheckIn = parseISO(b.check_in);
        const bCheckOut = parseISO(b.check_out);
        return requestedCheckIn < bCheckOut && requestedCheckOut > bCheckIn;
      });
      
      if (hasConflict) isAvailable = false;
    }
    return { ...property, isAvailable };
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

    // Guest capacity filter
    const totalGuests = filters.adults + filters.children;
    if (totalGuests > property.guest_capacity) {
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

    // Children age restrictions
    if (filters.children > 0) {
      if (property.children_allowed === false) {
        return false;
      }
      if (property.minimum_child_age != null && property.minimum_child_age > 0) {
        for (const age of filters.childAges) {
          if (age < property.minimum_child_age) {
            return false;
          }
        }
      }
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
            <Input
              type="date"
              value={filters.checkIn}
              onChange={(e) => handleFilterChange("checkIn", e.target.value)}
              className="w-40 h-11 bg-white"
              placeholder="Check in"
            />
            <Select value={filters.duration} onValueChange={(v) => handleFilterChange("duration", v)}>
              <SelectTrigger className="w-40 h-11 bg-white">
                <SelectValue placeholder="Duration" />
              </SelectTrigger>
              <SelectContent>
                {[...Array(28)].map((_, i) => (
                  <SelectItem key={i+1} value={(i+1).toString()}>{i+1} night{i+1 !== 1 ? 's' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg h-11">
              <Users className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700">
                {filters.adults} adult{filters.adults !== 1 ? 's' : ''}
                {filters.children > 0 && `, ${filters.children} child${filters.children !== 1 ? 'ren' : ''}`}
              </span>
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
                      duration: "1",
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
                <PropertyCard property={property} isAvailable={property.isAvailable} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}