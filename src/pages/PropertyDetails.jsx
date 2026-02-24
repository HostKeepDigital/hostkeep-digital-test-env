import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import PropertyShareModal from "@/components/properties/PropertyShareModal";
import { getAllowedNights } from "@/functions/getAllowedNights";

const AMENITY_ICONS = {
  "WiFi": Wifi, "Parking": Car, "Air Conditioning": Wind, "Pool": Waves,
  "Kitchen": ChefHat, "TV": Tv, "Hot Tub": Flame, "Garden": TreeDeciduous,
};

export default function PropertyDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageOverlay, setShowImageOverlay] = useState(false);
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
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  // Wishlist Logic
  const { data: wishlistItems = [] } = useQuery({
    queryKey: ['wishlist-properties', currentUser?.id],
    queryFn: () => base44.entities.WishlistProperty.filter({ user_id: currentUser?.id }),
    enabled: !!currentUser?.id,
  });

  const isWishlisted = wishlistItems.some(item => item.property_id === propertyId);
  const wishlistItem = wishlistItems.find(item => item.property_id === propertyId);

  const addToWishlistMutation = useMutation({
    mutationFn: () => base44.entities.WishlistProperty.create({
      user_id: currentUser.id,
      property_id: propertyId
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['wishlist-properties']);
      toast.success("This property has been added to your wishlist.", {
        duration: 3000,
        position: window.innerWidth < 768 ? "top-center" : "top-right"
      });
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: () => base44.entities.WishlistProperty.delete(wishlistItem.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['wishlist-properties']);
      toast.success("Removed from your wishlist.", {
        duration: 3000,
      });
    },
  });

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
       toast("Create an account to save properties to your wishlist.", {
         action: {
           label: "Login",
           onClick: () => base44.auth.redirectToLogin()
         }
       });
       return;
    }

    if (isWishlisted) {
      removeFromWishlistMutation.mutate();
    } else {
      addToWishlistMutation.mutate();
    }
  };

  // Prevent scrolling when image overlay is open
  useEffect(() => {
    if (showImageOverlay) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showImageOverlay]);

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
  
  // Calculate nightly rate with seasonal pricing
  const calculateNightlyRate = (dateString) => {
    if (!dateString || !property) return property?.nightly_rate || 0;
    
    const pricingSettings = property.pricing_settings;
    if (!pricingSettings) return property.nightly_rate || 0;
    
    const date = parseISO(dateString);
    const dateKey = format(date, "yyyy-MM-dd");
    const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // Fri, Sat, Sun
    
    // Priority 1: Date override
    if (pricingSettings.date_overrides?.[dateKey]?.rate) {
      return pricingSettings.date_overrides[dateKey].rate;
    }
    
    // Priority 2: Seasonal rate
    if (pricingSettings.seasons?.length > 0) {
      for (const season of pricingSettings.seasons) {
        const seasonStart = parseISO(season.start_date);
        const seasonEnd = parseISO(season.end_date);
        if (date >= seasonStart && date <= seasonEnd) {
          let rate = season.nightly_rate || property.nightly_rate;
          // Apply weekend modifier if set
          if (isWeekend && season.weekend_modifier) {
            rate = rate * (1 + season.weekend_modifier / 100);
          }
          // Apply rounding if set
          if (pricingSettings.price_rounding) {
            rate = Math.round(rate / pricingSettings.price_rounding) * pricingSettings.price_rounding;
          }
          return rate;
        }
      }
    }
    
    // Priority 3: Weekday/Weekend rates
    if (isWeekend && pricingSettings.weekend_rate) {
      return pricingSettings.weekend_rate;
    }
    if (!isWeekend && pricingSettings.weekday_rate) {
      return pricingSettings.weekday_rate;
    }
    
    // Default: base rate
    return pricingSettings.base_rate || property.nightly_rate || 0;
  };
  
  // Calculate lowest rate for a given month (defaults to current month)
  const getLowestMonthlyRate = (dateString = null) => {
    if (!property) return property?.nightly_rate || 0;
    
    const referenceDate = dateString ? parseISO(dateString) : new Date();
    const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const endOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    
    let lowestRate = Infinity;
    for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      const rate = calculateNightlyRate(format(d, "yyyy-MM-dd"));
      if (rate < lowestRate) {
        lowestRate = rate;
      }
    }
    
    return lowestRate === Infinity ? (property?.nightly_rate || 0) : lowestRate;
  };
  
  const displayStartingRate = getLowestMonthlyRate(checkIn);
  
  // Calculate total for all nights
  const subtotal = (() => {
    if (!checkIn || numNights === 0) return 0;
    let total = 0;
    for (let i = 0; i < numNights; i++) {
      const nightDate = format(addDays(parseISO(checkIn), i), "yyyy-MM-dd");
      total += calculateNightlyRate(nightDate);
    }
    return total;
  })();
  
  // Group nights by same rate value for breakdown
  const getPriceBreakdown = () => {
    if (!checkIn || numNights === 0) return [];
    
    const rateCount = {};
    
    for (let i = 0; i < numNights; i++) {
      const nightDate = format(addDays(parseISO(checkIn), i), "yyyy-MM-dd");
      const rate = calculateNightlyRate(nightDate);
      
      rateCount[rate] = (rateCount[rate] || 0) + 1;
    }
    
    return Object.entries(rateCount)
      .map(([rate, nights]) => ({ rate: Number(rate), nights }))
      .sort((a, b) => a.rate - b.rate);
  };
  
  const priceBreakdown = getPriceBreakdown();
  
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
      booking_status: "awaiting_decision",
      booking_type: "request",
      request_timestamp: new Date().toISOString(),
      decision_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
      {/* Professional Photo Gallery - Upgraded */}
       <div className="bg-white">
         <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 md:py-6">
           {/* Mobile: Carousel */}
           <div className="md:hidden mb-4">
             <div 
               className="relative aspect-video overflow-hidden bg-gray-200 rounded-lg cursor-pointer"
               onClick={() => setShowImageOverlay(true)}
             >
               <img 
                 src={photos[currentImageIndex]} 
                 alt={property.title}
                 className="w-full h-full object-cover"
               />
               {photos.length > 1 && (
                 <>
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       setCurrentImageIndex(prev => prev === 0 ? photos.length - 1 : prev - 1);
                     }}
                     className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-all"
                   >
                     <ChevronLeft className="w-5 h-5" />
                   </button>
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       setCurrentImageIndex(prev => prev === photos.length - 1 ? 0 : prev + 1);
                     }}
                     className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-all"
                   >
                     <ChevronRight className="w-5 h-5" />
                   </button>
                 </>
               )}
               <div className="absolute bottom-3 left-3 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium">
                 {currentImageIndex + 1} / {photos.length}
               </div>
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

           {/* Desktop: Enhanced Grid Layout */}
           <div className="hidden md:grid md:grid-cols-4 gap-2 h-96">
             {/* Main large image - 2x2 */}
             <div 
               className="col-span-2 row-span-2 overflow-hidden rounded-lg bg-gray-300 cursor-pointer group relative"
               onClick={() => setShowImageOverlay(true)}
             >
               <img 
                 src={photos[0]} 
                 alt="Cover"
                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
               />
               <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
             </div>

             {/* Top right grid */}
             {photos[1] && (
               <div 
                 className="overflow-hidden rounded-lg bg-gray-300 cursor-pointer group relative"
                 onClick={() => { setCurrentImageIndex(1); setShowImageOverlay(true); }}
               >
                 <img 
                   src={photos[1]} 
                   alt="Photo 2"
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                 />
                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
               </div>
             )}
             {photos[2] && (
               <div 
                 className="overflow-hidden rounded-lg bg-gray-300 cursor-pointer group relative"
                 onClick={() => { setCurrentImageIndex(2); setShowImageOverlay(true); }}
               >
                 <img 
                   src={photos[2]} 
                   alt="Photo 3"
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                 />
                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
               </div>
             )}

             {/* Bottom right grid */}
             {photos[3] && (
               <div 
                 className="overflow-hidden rounded-lg bg-gray-300 cursor-pointer group relative"
                 onClick={() => { setCurrentImageIndex(3); setShowImageOverlay(true); }}
               >
                 <img 
                   src={photos[3]} 
                   alt="Photo 4"
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                 />
                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
               </div>
             )}
             {photos[4] && (
               <div 
                 className="overflow-hidden rounded-lg bg-gray-300 cursor-pointer group relative"
                 onClick={() => { setCurrentImageIndex(4); setShowImageOverlay(true); }}
               >
                 <img 
                   src={photos[4]} 
                   alt="Photo 5"
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                 />
                 {photos.length > 5 && (
                   <>
                     <div className="absolute inset-0 bg-black/40" />
                     <span className="absolute inset-0 flex items-center justify-center text-white font-semibold text-xl">
                       +{photos.length - 5}
                     </span>
                   </>
                 )}
                 {photos.length <= 5 && (
                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                 )}
               </div>
             )}
           </div>
         </div>
       </div>

       {/* Fullscreen Image Overlay Modal */}
       {showImageOverlay && (
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-50 bg-black flex items-center justify-center scrollbar-hide"
           onClick={() => setShowImageOverlay(false)}
         >
           <div className="w-full h-full flex items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
             <img 
               src={photos[currentImageIndex]} 
               alt={`Photo ${currentImageIndex + 1}`}
               className="max-h-screen max-w-screen object-contain"
             />
             
             {/* Navigation Buttons */}
             {photos.length > 1 && (
               <>
                 <button
                   onClick={() => setCurrentImageIndex(prev => prev === 0 ? photos.length - 1 : prev - 1)}
                   className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-all"
                 >
                   <ChevronLeft className="w-8 h-8" />
                 </button>
                 <button
                   onClick={() => setCurrentImageIndex(prev => prev === photos.length - 1 ? 0 : prev + 1)}
                   className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-all"
                 >
                   <ChevronRight className="w-8 h-8" />
                 </button>
               </>
             )}

             {/* Close Button */}
             <button
               onClick={() => setShowImageOverlay(false)}
               className="absolute top-4 right-4 w-12 h-12 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-all"
             >
               <X className="w-6 h-6" />
             </button>

             {/* Photo Counter */}
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium">
               {currentImageIndex + 1} / {photos.length}
             </div>
           </div>
         </motion.div>
       )}

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 md:py-8">
        {/* Header Section with Title & Quick Info */}
        <div className="mb-4 md:mb-8">
          <div className="flex items-start justify-between gap-2 md:gap-4 mb-3 md:mb-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-gray-900 mb-2">{property.title}</h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm md:text-base text-gray-600 mb-3">
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
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleToggleWishlist}
                        className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 ${
                          isWishlisted 
                            ? "bg-red-50 border-red-200 text-red-500 shadow-md" 
                            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm"
                        }`}
                      >
                        <motion.div
                          initial={false}
                          animate={{ 
                            scale: isWishlisted ? [1, 1.2, 1] : 1,
                            color: isWishlisted ? "#ef4444" : "#4b5563"
                          }}
                          transition={{ duration: 0.4, type: "spring" }}
                        >
                          <Heart 
                            className={`w-5 h-5 ${isWishlisted ? "fill-current" : ""}`} 
                          />
                        </motion.div>
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <PropertyShareModal 
                  propertyTitle={property.title}
                  propertyUrl={window.location.href}
                />
              </div>
              {host && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0">
                    {host.profile_photo ? (
                      <img src={host.profile_photo} alt={host.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold text-lg">
                        {host.full_name?.charAt(0)?.toUpperCase() || 'H'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Hosted by</p>
                    <p className="font-semibold text-gray-900">{host.full_name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Two Column Layout: Content (70%) + Booking Widget (30%) */}
        <div className="grid md:grid-cols-12 gap-4 md:gap-8">
          {/* Left Column - Main Content */}
          <div className="md:col-span-7 space-y-4 md:space-y-8">
            {/* Description Card */}
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="p-4 md:pt-6">
                <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-2 md:mb-3">About this property</h2>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed whitespace-pre-line">{property.description || "No description provided."}</p>
              </CardContent>
            </Card>

            {/* Amenities Card */}
            {property.amenities?.length > 0 && (
              <Card className="border-0 bg-white shadow-sm">
                <CardContent className="p-4 md:pt-6">
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {property.amenities.map(amenity => {
                      const Icon = AMENITY_ICONS[amenity] || CheckCircle;
                      return (
                        <div key={amenity} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                          <Icon className="w-4 h-4 text-teal-600 flex-shrink-0" />
                          <span className="text-gray-700 text-xs md:text-sm">{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* House Rules Card */}
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="p-4 md:pt-6">
                <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">House Rules</h2>
                <div className="grid grid-cols-2 gap-2 md:gap-4 text-xs md:text-sm mb-3 md:mb-4">
                  <div className="flex items-center gap-1.5 md:gap-2 p-2 md:p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-teal-600" />
                    <div>
                      <p className="text-[10px] md:text-xs text-gray-500">Check-in</p>
                      <p className="font-medium text-gray-900 text-xs md:text-sm">{property.check_in_time || "3:00 PM"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 p-2 md:p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-teal-600" />
                    <div>
                      <p className="text-[10px] md:text-xs text-gray-500">Check-out</p>
                      <p className="font-medium text-gray-900 text-xs md:text-sm">{property.check_out_time || "10:00 AM"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 p-2 md:p-3 bg-gray-50 rounded-lg">
                    {property.pets_allowed ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500" />
                        <span className="text-gray-700 text-xs md:text-sm">Pets allowed</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-500" />
                        <span className="text-gray-700 text-xs md:text-sm">No pets</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 p-2 md:p-3 bg-gray-50 rounded-lg">
                    {property.smoking_allowed ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500" />
                        <span className="text-gray-700 text-xs md:text-sm">Smoking allowed</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-500" />
                        <span className="text-gray-700 text-xs md:text-sm">No smoking</span>
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
              <CardContent className="p-4 md:pt-6">
                <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4 md:mb-6">
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
                    <div className="p-2 md:p-3 bg-amber-50 rounded-lg">
                      <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">Overall</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">{averageRating}</p>
                    </div>
                    {reviews.some(r => r.cleanliness_rating) && (
                      <div className="p-2 md:p-3 bg-blue-50 rounded-lg">
                        <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">Cleanliness</p>
                        <p className="text-xl md:text-2xl font-bold text-gray-900">
                          {(reviews
                            .filter(r => r.cleanliness_rating)
                            .reduce((sum, r) => sum + r.cleanliness_rating, 0) / 
                            reviews.filter(r => r.cleanliness_rating).length
                          ).toFixed(1)}
                        </p>
                      </div>
                    )}
                    {reviews.some(r => r.communication_rating) && (
                      <div className="p-2 md:p-3 bg-green-50 rounded-lg">
                        <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">Communication</p>
                        <p className="text-xl md:text-2xl font-bold text-gray-900">
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
                    <span className="text-3xl font-bold text-gray-900">£{displayStartingRate}</span>
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
                    {priceBreakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-gray-600">
                        <span>{item.nights} × £{item.rate} per night</span>
                        <span>£{item.nights * item.rate}</span>
                      </div>
                    ))}
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">From</p>
            <span className="text-2xl font-bold text-gray-900">£{displayStartingRate}</span>
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
                    {priceBreakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.nights} × £{item.rate} per night</span>
                        <span>£{item.nights * item.rate}</span>
                      </div>
                    ))}
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