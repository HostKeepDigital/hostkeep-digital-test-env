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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Search as SearchIcon, MapPin, Calendar, Users, SlidersHorizontal, X } from "lucide-react";
import { format, parseISO, isWithinInterval, isBefore, isAfter, addDays } from "date-fns";
import PropertyCard from "@/components/properties/PropertyCard";

const AMENITIES = [
  "WiFi", "Pool", "Parking", "Air Conditioning", "Kitchen", "Washing Machine",
  "TV", "Hot Tub", "Garden", "BBQ", "Gym", "Beach Access"
];

export default function Search() {
  const urlParams = new URLSearchParams(window.location.search);
  
  const [filters, setFilters] = useState({
    location: urlParams.get('location') || "",
    checkIn: urlParams.get('checkIn') || "",
    checkOut: urlParams.get('checkOut') || "",
    guests: parseInt(urlParams.get('guests')) || 1,
    type: urlParams.get('type') || "all",
    minPrice: 0,
    maxPrice: 1000,
    amenities: [],
    petsAllowed: false,
  });

  const [sortBy, setSortBy] = useState("newest");

  const { data: allProperties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.filter({ status: 'published' }),
  });

  const { data: allBookings = [] } = useQuery({
    queryKey: ['all-bookings'],
    queryFn: () => base44.entities.Booking.filter({ booking_status: 'confirmed' }),
  });

  // Get all booked date ranges
  const getBookedDates = () => {
    const bookedDates = [];
    allBookings.forEach(booking => {
      if (booking.check_in && booking.check_out) {
        const checkIn = parseISO(booking.check_in);
        const checkOut = parseISO(booking.check_out);
        let current = checkIn;
        while (isBefore(current, checkOut) || current.getTime() === checkOut.getTime()) {
          bookedDates.push(new Date(current));
          current = addDays(current, 1);
        }
      }
    });
    return bookedDates;
  };

  const bookedDates = getBookedDates();

  const isDateBooked = (date) => {
    return bookedDates.some(bookedDate => 
      bookedDate.toDateString() === date.toDateString()
    );
  };

  const filteredProperties = allProperties.filter(property => {
    if (filters.location && !property.location?.city?.toLowerCase().includes(filters.location.toLowerCase()) &&
        !property.location?.postcode?.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }
    if (filters.type !== "all" && property.property_type !== filters.type) {
      return false;
    }
    if (filters.guests > property.guest_capacity) {
      return false;
    }
    if (property.nightly_rate < filters.minPrice || property.nightly_rate > filters.maxPrice) {
      return false;
    }
    if (filters.petsAllowed && !property.pets_allowed) {
      return false;
    }
    if (filters.amenities.length > 0) {
      const propertyAmenities = property.amenities || [];
      if (!filters.amenities.every(a => propertyAmenities.includes(a))) {
        return false;
      }
    }
    return true;
  });

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    switch (sortBy) {
      case "price_low": return (a.nightly_rate || 0) - (b.nightly_rate || 0);
      case "price_high": return (b.nightly_rate || 0) - (a.nightly_rate || 0);
      case "rating": return (b.average_rating || 0) - (a.average_rating || 0);
      default: return new Date(b.created_date) - new Date(a.created_date);
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 w-44 justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                  {filters.checkIn ? format(parseISO(filters.checkIn), "MMM d, yyyy") : "Check in"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={filters.checkIn ? parseISO(filters.checkIn) : undefined}
                  onSelect={(date) => handleFilterChange("checkIn", date ? format(date, "yyyy-MM-dd") : "")}
                  disabled={(date) => isBefore(date, new Date()) || isDateBooked(date)}
                  modifiers={{ booked: bookedDates }}
                  modifiersStyles={{
                    booked: { 
                      backgroundColor: '#FEE2E2', 
                      color: '#991B1B',
                      textDecoration: 'line-through'
                    }
                  }}
                  className="rounded-md border"
                  numberOfMonths={2}
                />
                <div className="p-3 border-t flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div>
                    <span>Booked</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-teal-600"></div>
                    <span>Selected</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 w-44 justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                  {filters.checkOut ? format(parseISO(filters.checkOut), "MMM d, yyyy") : "Check out"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={filters.checkOut ? parseISO(filters.checkOut) : undefined}
                  onSelect={(date) => handleFilterChange("checkOut", date ? format(date, "yyyy-MM-dd") : "")}
                  disabled={(date) => {
                    const checkInDate = filters.checkIn ? parseISO(filters.checkIn) : new Date();
                    return isBefore(date, addDays(checkInDate, 1)) || isDateBooked(date);
                  }}
                  modifiers={{ booked: bookedDates }}
                  modifiersStyles={{
                    booked: { 
                      backgroundColor: '#FEE2E2', 
                      color: '#991B1B',
                      textDecoration: 'line-through'
                    }
                  }}
                  className="rounded-md border"
                  numberOfMonths={2}
                />
                <div className="p-3 border-t flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div>
                    <span>Booked</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-teal-600"></div>
                    <span>Selected</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <div className="relative w-28">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="number"
                min="1"
                value={filters.guests}
                onChange={(e) => handleFilterChange("guests", parseInt(e.target.value) || 1)}
                className="pl-10 h-11"
              />
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-11 gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {(filters.amenities.length > 0 || filters.petsAllowed) && (
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center">
                      {filters.amenities.length + (filters.petsAllowed ? 1 : 0)}
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
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                        <SelectItem value="cabin">Cabin</SelectItem>
                        <SelectItem value="cottage">Cottage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Price Range: £{filters.minPrice} - £{filters.maxPrice}
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
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.petsAllowed}
                        onCheckedChange={(v) => handleFilterChange("petsAllowed", v)}
                      />
                      <span className="text-sm text-gray-600">Pets allowed</span>
                    </label>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

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
                <PropertyCard property={property} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}