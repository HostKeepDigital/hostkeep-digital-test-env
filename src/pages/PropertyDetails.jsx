import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Star, MapPin, Users, Bed, Bath, Calendar, CheckCircle, X,
  Wifi, Car, Wind, Waves, ChefHat, Tv, Flame, TreeDeciduous,
  Heart, Share2, ChevronLeft, ChevronRight, MessageSquare, Loader2
} from "lucide-react";
import { format, parseISO, differenceInDays, addDays, isBefore } from "date-fns";
import { toast } from "sonner";
import ReviewList from "@/components/reviews/ReviewList";
import BookingCalendar from "@/components/shared/BookingCalendar";
import { getAllowedNights } from "@/functions/getAllowedNights";

const AMENITY_ICONS = {
  "WiFi": Wifi, "Parking": Car, "Air Conditioning": Wind, "Pool": Waves,
  "Kitchen": ChefHat, "TV": Tv, "Hot Tub": Flame, "Garden": TreeDeciduous,
};

export default function PropertyDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [checkIn, setCheckIn] = useState("");
  const [nights, setNights] = useState("");
  const [guestData, setGuestData] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const adults = parseInt(params.get('adults')) || 1;
    const childrenAges = params.get('childrenAges') ? params.get('childrenAges').split(',').map(a => parseInt(a)) : [];
    return { adults, childrenAges };
  });
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  // Check if check-in date is allowed based on booking rules
  const isDayAllowedForCheckIn = (date) => {
    // If day-based restrictions not enabled, allow all days
    if (!property?.day_based_restrictions_enabled || !property?.booking_rules) {
      return true;
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];
    const dayRule = property.booking_rules[dayName];

    // If no rule defined or rule is enabled, allow the day
    if (!dayRule || dayRule.enabled !== false) {
      return true;
    }

    // Rule explicitly disabled this day
    return false;
  };

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const results = await base44.entities.Property.filter({ id: propertyId });
      return results[0];
    },
    enabled: !!propertyId,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['property-reviews', propertyId],
    queryFn: () => base44.entities.Review.filter({ 
      property_id: propertyId, 
      visible: true,
      review_type: "guest_to_host"
    }),
    enabled: !!propertyId,
  });

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const { data: host } = useQuery({
    queryKey: ['host', property?.owner_id],
    queryFn: async () => {
      if (!property?.owner_id) return null;
      const users = await base44.entities.User.filter({ id: property.owner_id });
      return users[0];
    },
    enabled: !!property?.owner_id,
  });

  const { data: propertyBookings = [] } = useQuery({
    queryKey: ['property-bookings', propertyId],
    queryFn: () => base44.entities.Booking.filter({ property_id: propertyId, booking_status: 'confirmed' }),
    enabled: !!propertyId,
  });

  // Get booked dates for this specific property
  const getBookedDates = () => {
    const bookedDates = [];
    propertyBookings.forEach(booking => {
      if (booking.check_in && booking.check_out) {
        const checkInDate = parseISO(booking.check_in);
        const checkOutDate = parseISO(booking.check_out);
        let current = checkInDate;
        while (isBefore(current, checkOutDate) || current.getTime() === checkOutDate.getTime()) {
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

  // Calculate allowed nights based on booking rules (only after check-in selected)
  const { allowedNights, minNights, maxNights, displayMin, displayMax } = (() => {
    if (!checkIn || !property?.booking_rules) {
      return { allowedNights: [], minNights: 1, maxNights: 28, displayMin: 1, displayMax: 28 };
    }

    const min = property.minimum_stay || 1;
    const max = 28;
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    // Get the check-in day
    const checkInDate = parseISO(checkIn);
    const checkInDayName = dayNames[checkInDate.getDay()];
    const checkInRule = property.booking_rules[checkInDayName];

    // If no rule for this day or rule is disabled, use full range
    if (!checkInRule || checkInRule.enabled === false) {
      const result = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return { allowedNights: result, minNights: min, maxNights: max, displayMin: min, displayMax: max };
    }

    const allowedSet = new Set();
    const ruleType = checkInRule?.rule_type || 'any';

    // Priority A: Fixed Days (rule_type === "fixed")
    if (ruleType === 'fixed' && checkInRule?.fixed_values?.length > 0) {
      checkInRule.fixed_values.forEach(val => {
        if (typeof val === 'number' && val > 0 && val <= max) {
          allowedSet.add(val);
        }
      });
      if (allowedSet.size > 0) {
        const result = Array.from(allowedSet).sort((a, b) => a - b);
        return { allowedNights: result, minNights: min, maxNights: max, displayMin: result[0], displayMax: result[result.length - 1] };
      }
    }

    // Priority B: Fixed AND Multiples (rule_type === "fixed_or_multiples")
    if (ruleType === 'fixed_or_multiples') {
      const fixedVals = checkInRule?.fixed_values || [];
      const multipliers = checkInRule?.multiple_of || [];
      
      // Add fixed values
      fixedVals.forEach(val => {
        if (typeof val === 'number' && val > 0 && val <= max) {
          allowedSet.add(val);
        }
      });
      
      // Add multiples
      if (Array.isArray(multipliers)) {
        multipliers.forEach(mult => {
          if (typeof mult === 'number' && mult > 0) {
            for (let i = 1; i * mult <= max; i++) {
              allowedSet.add(i * mult);
            }
          }
        });
      }
      
      if (allowedSet.size > 0) {
        const result = Array.from(allowedSet).sort((a, b) => a - b);
        return { allowedNights: result, minNights: min, maxNights: max, displayMin: result[0], displayMax: result[result.length - 1] };
      }
    }

    // Priority C: Only Multiples (rule_type === "multiples")
    if (ruleType === 'multiples' && checkInRule?.multiple_of) {
      const multipliers = checkInRule.multiple_of;
      if (Array.isArray(multipliers)) {
        multipliers.forEach(mult => {
          if (typeof mult === 'number' && mult > 0) {
            for (let i = 1; i * mult <= max; i++) {
              allowedSet.add(i * mult);
            }
          }
        });
      }
      if (allowedSet.size > 0) {
        const result = Array.from(allowedSet).sort((a, b) => a - b);
        return { allowedNights: result, minNights: min, maxNights: max, displayMin: result[0], displayMax: result[result.length - 1] };
      }
    }

    // Priority D: Any (default range from min_days to max)
    const dayMin = checkInRule?.min_days || min;
    for (let i = dayMin; i <= max; i++) {
      allowedSet.add(i);
    }

    const result = Array.from(allowedSet).sort((a, b) => a - b);
    return { allowedNights: result, minNights: min, maxNights: max, displayMin: result[0], displayMax: result[result.length - 1] };
  })();

  const bookingMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Booking.create(data);
    },
    onSuccess: () => {
      toast.success("Booking request sent! The host will respond shortly.");
      setShowBookingDialog(false);
    },
  });

  const photos = property?.photos?.length > 0 
    ? property.photos 
    : ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"];

  const numNights = nights ? parseInt(nights) : 0;
  const checkOut = checkIn && numNights ? format(addDays(parseISO(checkIn), numNights), "yyyy-MM-dd") : "";
  const subtotal = numNights * (property?.nightly_rate || 0);
  const cleaningFee = property?.cleaning_fee || 0;
  const total = subtotal + cleaningFee;

  const handleBooking = () => {
    if (!checkIn || !checkOut || !guestName || !guestEmail) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    const totalGuests = guestData.adults + guestData.childrenAges.length;
    bookingMutation.mutate({
      property_id: propertyId,
      host_id: property.owner_id,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      check_in: checkIn,
      check_out: checkOut,
      guests_count: totalGuests,
      nightly_rate: property.nightly_rate,
      nights: numNights,
      subtotal: subtotal,
      cleaning_fee: cleaningFee,
      total_amount: total,
      booking_status: "pending",
      booking_type: "request",
      guest_message: guestMessage,
      payment_link_id: crypto.randomUUID().slice(0, 8),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Property not found</h2>
          <p className="text-gray-500">This property may have been removed or is no longer available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      {/* Professional Photo Gallery - Booking.com style */}
       <div className="bg-white">
         <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 md:py-6">
           {/* Mobile: Carousel */}
           <div className="md:hidden mb-4">
             <div className="relative aspect-square overflow-hidden bg-gray-200 rounded-lg">
               <img 
                 src={photos[currentImageIndex]} 
                 alt={property.title}
                 className="w-full h-full object-cover"
               />
               {photos.length > 1 && (
                 <>
                   <button
                     onClick={() => setCurrentImageIndex(prev => prev === 0 ? photos.length - 1 : prev - 1)}
                     className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-all"
                   >
                     <ChevronLeft className="w-5 h-5" />
                   </button>
                   <button
                     onClick={() => setCurrentImageIndex(prev => prev === photos.length - 1 ? 0 : prev + 1)}
                     className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-all"
                   >
                     <ChevronRight className="w-5 h-5" />
                   </button>
                 </>
               )}
             </div>
             <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
               {photos.map((photo, idx) => (
                 <button
                   key={idx}
                   onClick={() => setCurrentImageIndex(idx)}
                   className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden transition-all ${
                     idx === currentImageIndex ? 'ring-2 ring-teal-600' : 'opacity-60 hover:opacity-100'
                   }`}
                 >
                   <img 
                     src={photo} 
                     alt={`Thumbnail ${idx + 1}`}
                     className="w-full h-full object-cover"
                   />
                 </button>
               ))}
             </div>
           </div>

           {/* Desktop: Booking.com style - Main image top, thumbnails below */}
           <div className="hidden md:block">
             {/* Main Image */}
             <div className="relative overflow-hidden bg-gray-300 rounded-lg mb-3 group h-96">
               <img 
                 src={photos[currentImageIndex]} 
                 alt={property.title}
                 className="w-full h-full object-cover"
               />
               {photos.length > 1 && (
                 <>
                   <button
                     onClick={() => setCurrentImageIndex(prev => prev === 0 ? photos.length - 1 : prev - 1)}
                     className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/95 hover:bg-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                   >
                     <ChevronLeft className="w-6 h-6" />
                   </button>
                   <button
                     onClick={() => setCurrentImageIndex(prev => prev === photos.length - 1 ? 0 : prev + 1)}
                     className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/95 hover:bg-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                   >
                     <ChevronRight className="w-6 h-6" />
                   </button>
                 </>
               )}
             </div>

             {/* Thumbnails Grid - 5 columns */}
             <div className="grid grid-cols-5 gap-2">
               {photos.slice(0, 5).map((photo, idx) => (
                 <button
                   key={idx}
                   onClick={() => setCurrentImageIndex(idx)}
                   className={`relative overflow-hidden rounded-lg aspect-square transition-all cursor-pointer group ${
                     idx === currentImageIndex 
                       ? 'ring-2 ring-teal-600 ring-offset-0' 
                       : 'hover:opacity-80'
                   }`}
                 >
                   <img 
                     src={photo} 
                     alt={`View ${idx + 1}`}
                     className="w-full h-full object-cover"
                   />
                 </button>
               ))}
               {photos.length > 5 && (
                 <button 
                   onClick={() => setCurrentImageIndex(5)}
                   className="relative overflow-hidden rounded-lg aspect-square bg-gray-400 hover:bg-gray-500 transition-all flex items-center justify-center"
                 >
                   <span className="text-white font-semibold text-lg">+{photos.length - 5}</span>
                 </button>
               )}
             </div>
           </div>
         </div>
       </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 md:py-8">
        {/* Header Section with Title & Quick Info */}
        <div className="mb-4 md:mb-8">
          <div className="flex items-start justify-between gap-2 md:gap-4 mb-3 md:mb-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-gray-900 mb-2">{property.title}</h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm md:text-base text-gray-600">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  {property.location?.city || property.location?.town_city}, {property.location?.country || 'UK'}
                </span>
                {reviews.length > 0 && (
                  <span className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 bg-amber-50 rounded-full text-sm">
                    <Star className="w-3 h-3 md:w-4 md:h-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-gray-900">{averageRating}</span>
                    <span className="text-gray-600">({reviews.length})</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="rounded-full">
                <Heart className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Info Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-0 text-xs">
              <Users className="w-3 h-3 mr-1" /> {property.guest_capacity} guests
            </Badge>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-0 text-xs">
              <Bed className="w-3 h-3 mr-1" /> {property.bedrooms} beds
            </Badge>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-0 text-xs">
              <Bath className="w-3 h-3 mr-1" /> {property.bathrooms} baths
            </Badge>
          </div>
        </div>

        {/* Two Column Layout: Content (70%) + Booking Widget (30%) */}
        <div className="grid md:grid-cols-12 gap-4 md:gap-8">
          {/* Left Column - Main Content */}
          <div className="md:col-span-7 space-y-8">
            {/* Description Card */}
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About this property</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{property.description || "No description provided."}</p>
              </CardContent>
            </Card>

            {/* Amenities Card */}
            {property.amenities?.length > 0 && (
              <Card className="border-0 bg-white shadow-sm">
                <CardContent className="pt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {property.amenities.map(amenity => {
                      const Icon = AMENITY_ICONS[amenity] || CheckCircle;
                      return (
                        <div key={amenity} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <Icon className="w-5 h-5 text-teal-600 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* House Rules Card */}
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">House Rules</h2>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <div>
                      <p className="text-xs text-gray-500">Check-in</p>
                      <p className="font-medium text-gray-900">{property.check_in_time || "3:00 PM"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <div>
                      <p className="text-xs text-gray-500">Check-out</p>
                      <p className="font-medium text-gray-900">{property.check_out_time || "10:00 AM"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    {property.pets_allowed ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-gray-700">Pets allowed</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-red-500" />
                        <span className="text-gray-700">No pets</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    {property.smoking_allowed ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-gray-700">Smoking allowed</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-red-500" />
                        <span className="text-gray-700">No smoking</span>
                      </>
                    )}
                  </div>
                </div>
                {property.house_rules && (
                  <p className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg border border-blue-100">{property.house_rules}</p>
                )}
              </CardContent>
            </Card>

            {/* Reviews Card */}
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  {reviews.length > 0 ? (
                    <span className="flex items-center gap-2">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                      {averageRating} • {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                    </span>
                  ) : (
                    "Reviews"
                  )}
                </h2>
                
                {reviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Overall</p>
                      <p className="text-2xl font-bold text-gray-900">{averageRating}</p>
                    </div>
                    {reviews.some(r => r.cleanliness_rating) && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Cleanliness</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {(reviews
                            .filter(r => r.cleanliness_rating)
                            .reduce((sum, r) => sum + r.cleanliness_rating, 0) / 
                            reviews.filter(r => r.cleanliness_rating).length
                          ).toFixed(1)}
                        </p>
                      </div>
                    )}
                    {reviews.some(r => r.communication_rating) && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Communication</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {(reviews
                            .filter(r => r.communication_rating)
                            .reduce((sum, r) => sum + r.communication_rating, 0) / 
                            reviews.filter(r => r.communication_rating).length
                          ).toFixed(1)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <ReviewList 
                  reviews={reviews} 
                  propertyOwnerId={property?.owner_id}
                  currentUserId={currentUser?.id}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Booking Widget (30%) */}
          <div className="md:col-span-5">
            <Card className="border-0 bg-white shadow-lg sticky top-24">
              <CardContent className="p-4 space-y-4">
                {/* Price Header */}
                <div className="border-b border-gray-100 pb-3">
                  <p className="text-gray-600 text-xs mb-0.5">Starting from</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">£{property.nightly_rate}</span>
                    <span className="text-gray-500 text-xs">per night</span>
                  </div>
                </div>

                {/* Booking Inputs */}
                <div className="space-y-3">
                  <BookingCalendar
                    label="Check-in"
                    value={checkIn}
                    onSelect={(date) => setCheckIn(date ? format(date, "yyyy-MM-dd") : "")}
                    disabled={(date) => 
                      isBefore(date, new Date()) || 
                      isDateBooked(date) || 
                      !isDayAllowedForCheckIn(date)
                    }
                    bookedDates={bookedDates}
                    placeholder="Add date"
                  />
                  
                  <div>
                    <Label className="text-xs font-medium text-gray-900 mb-1 block">Duration</Label>
                    <Select value={nights} onValueChange={(value) => setNights(value)} disabled={!checkIn}>
                      <SelectTrigger className="h-11 border-gray-200">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedNights.map(night => (
                          <SelectItem key={night} value={night.toString()}>
                            {night} {night === 1 ? 'night' : 'nights'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {checkIn && (
                      <p className="text-xs text-gray-500 mt-2">Available: {displayMin}–{displayMax} nights</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-900 mb-1 block">Guests</Label>
                    <div className="h-11 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 flex items-center">
                      <Users className="w-4 h-4 text-gray-400 mr-2" />
                      {guestData.adults} {guestData.adults === 1 ? 'adult' : 'adults'}
                      {guestData.childrenAges.length > 0 && (
                        <>, {guestData.childrenAges.length} {guestData.childrenAges.length === 1 ? 'child' : 'children'}</>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                {numNights > 0 && (
                  <div className="space-y-1.5 py-3 border-t border-gray-100">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>£{property.nightly_rate} × {numNights} {numNights === 1 ? 'night' : 'nights'}</span>
                      <span>£{subtotal}</span>
                    </div>
                    {cleaningFee > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Cleaning fee</span>
                        <span>£{cleaningFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
                      <span>Total</span>
                      <span>£{total}</span>
                    </div>
                  </div>
                )}

                {/* CTA Button */}
                <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg text-sm" disabled={!checkIn || !nights}>
                      Request to Book
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Complete your booking</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label className="font-medium">Full Name *</Label>
                        <Input
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="John Smith"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="font-medium">Email *</Label>
                        <Input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="font-medium">Phone</Label>
                        <Input
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="+44 7123 456789"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="font-medium">Message to host</Label>
                        <Textarea
                          value={guestMessage}
                          onChange={(e) => setGuestMessage(e.target.value)}
                          placeholder="Tell the host about yourself..."
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                      <Button 
                        className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                        onClick={handleBooking}
                        disabled={bookingMutation.isPending}
                      >
                        {bookingMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                        ) : (
                          "Confirm Booking Request"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <p className="text-center text-xs text-gray-500 text-[11px]">You won't be charged until the host approves</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Booking Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">From</p>
            <span className="text-2xl font-bold text-gray-900">£{property.nightly_rate}</span>
          </div>
          <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
            <DialogTrigger asChild>
              <Button className="flex-1 h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg">
                Book Now
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Book this property</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-3">
                  <BookingCalendar
                    label="Check-in"
                    value={checkIn}
                    onSelect={(date) => setCheckIn(date ? format(date, "yyyy-MM-dd") : "")}
                    disabled={(date) => 
                      isBefore(date, new Date()) || 
                      isDateBooked(date) || 
                      !isDayAllowedForCheckIn(date)
                    }
                    bookedDates={bookedDates}
                    placeholder="Select date"
                  />
                  <div>
                    <Label className="text-sm font-medium">Duration</Label>
                    <Select value={nights} onValueChange={(value) => setNights(value)} disabled={!checkIn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select nights" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedNights.map(night => (
                          <SelectItem key={night} value={night.toString()}>
                            {night} {night === 1 ? 'night' : 'nights'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {checkIn && (
                      <p className="text-xs text-gray-500 mt-2">Available: {displayMin}–{displayMax} nights</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Guests</Label>
                  <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                    {guestData.adults} {guestData.adults === 1 ? 'adult' : 'adults'}
                    {guestData.childrenAges.length > 0 && (
                      <>, {guestData.childrenAges.length} {guestData.childrenAges.length === 1 ? 'child' : 'children'}</>
                    )}
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="font-medium">Full Name *</Label>
                  <Input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Full name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-medium">Email *</Label>
                  <Input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="Email"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-medium">Phone</Label>
                  <Input
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="Phone"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="font-medium">Message</Label>
                  <Textarea
                    value={guestMessage}
                    onChange={(e) => setGuestMessage(e.target.value)}
                    placeholder="Tell the host about yourself..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
                {numNights > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span>£{property.nightly_rate} × {numNights}</span>
                      <span>£{subtotal}</span>
                    </div>
                    {cleaningFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Cleaning fee</span>
                        <span>£{cleaningFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t text-gray-900">
                      <span>Total</span>
                      <span>£{total}</span>
                    </div>
                  </div>
                )}
                <Button 
                  className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                  onClick={handleBooking}
                  disabled={bookingMutation.isPending || !checkIn || !nights}
                >
                  {bookingMutation.isPending ? "Sending..." : "Confirm Booking"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}