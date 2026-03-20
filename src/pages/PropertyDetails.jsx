import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Star, MapPin, Users, Bed, Bath, Calendar, CheckCircle, X, AlertCircle,
  Wifi, Car, Wind, Waves, ChefHat, Tv, Flame, TreeDeciduous,
  Heart, Share2, ChevronLeft, ChevronRight, MessageSquare, Loader2
} from "lucide-react";
import { format, parseISO, differenceInDays, addDays, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";
import confetti from "canvas-confetti";
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
  const [checkIn, setCheckIn] = useState(() => urlParams.get('checkIn') || "");
  const [nights, setNights] = useState(() => urlParams.get('duration') || "");
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
  const [agreedHouseRules, setAgreedHouseRules] = useState(false);
  const [agreedCancellation, setAgreedCancellation] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

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
    queryFn: async () => {
      const bookings = await base44.entities.Booking.filter({ property_id: propertyId });
      return bookings.filter(b => ['confirmed', 'blocked', 'checked_in', 'awaiting_decision', 'awaiting_payment'].includes(b.booking_status));
    },
    enabled: !!propertyId,
  });

  const { data: wishlistStatus, refetch: refetchWishlist } = useQuery({
    queryKey: ['wishlist-status', propertyId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return false;
      const res = await base44.entities.WishlistProperty.filter({ property_id: propertyId, user_id: currentUser.id });
      return res.length > 0 ? res[0] : null;
    },
    enabled: !!propertyId && !!currentUser?.id,
  });

  const toggleWishlistMutation = useMutation({
    mutationFn: async (currentWishlistEntry) => {
      if (!currentUser) {
        return;
      }
      
      if (currentWishlistEntry) {
        await base44.entities.WishlistProperty.delete(currentWishlistEntry.id);
        return { action: 'removed' };
      } else {
        await base44.entities.WishlistProperty.create({
          property_id: propertyId,
          user_id: currentUser.id
        });
        return { action: 'added' };
      }
    },
    onSuccess: (data) => {
      if (!data) return;
      refetchWishlist();
      queryClient.invalidateQueries({ queryKey: ['wishlist-properties'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-status'] });
      
      if (data.action === 'added') {
        toast.success("This property has been added to your wishlist.");
      } else {
        toast.success("Removed from your wishlist.");
      }
    }
  });

  const handleWishlistClick = (e) => {
    if (!currentUser) {
      toast.info("Create an account to save properties to your wishlist.");
      setTimeout(() => base44.auth.redirectToLogin(), 1500);
      return;
    }

    const isAdding = !wishlistStatus;
    
    toggleWishlistMutation.mutate(wishlistStatus);
    
    if (isAdding) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      
      confetti({
        particleCount: 40,
        spread: 60,
        colors: ['#ef4444', '#f472b6', '#fcd34d'],
        origin: { x, y },
        disableForReducedMotion: true,
        ticks: 150,
        gravity: 0.8,
        scalar: 0.8
      });
    }
  };

  // Get booked dates for this specific property
  const getBookedDates = () => {
    const bookedDates = [];
    propertyBookings.forEach(booking => {
      if (booking.check_in && booking.check_out) {
        const checkInDate = parseISO(booking.check_in);
        const checkOutDate = parseISO(booking.check_out);
        let current = checkInDate;
        while (isBefore(current, checkOutDate)) {
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

    let result = [];

    // If no rule for this day or rule is disabled, use full range
    if (!checkInRule || checkInRule.enabled === false) {
      result = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    } else {
      const allowedSet = new Set();
      const ruleType = checkInRule?.rule_type || 'any';

      // Priority A: Fixed Days (rule_type === "fixed")
      if (ruleType === 'fixed' && checkInRule?.fixed_values?.length > 0) {
        checkInRule.fixed_values.forEach(val => {
          if (typeof val === 'number' && val > 0 && val <= max) {
            allowedSet.add(val);
          }
        });
      }
      // Priority B: Fixed AND Multiples (rule_type === "fixed_or_multiples")
      else if (ruleType === 'fixed_or_multiples') {
        const fixedVals = checkInRule?.fixed_values || [];
        const multipliers = checkInRule?.multiple_of || [];
        
        fixedVals.forEach(val => {
          if (typeof val === 'number' && val > 0 && val <= max) allowedSet.add(val);
        });
        
        if (Array.isArray(multipliers)) {
          multipliers.forEach(mult => {
            if (typeof mult === 'number' && mult > 0) {
              for (let i = 1; i * mult <= max; i++) allowedSet.add(i * mult);
            }
          });
        }
      }
      // Priority C: Only Multiples (rule_type === "multiples")
      else if (ruleType === 'multiples' && checkInRule?.multiple_of) {
        const multipliers = checkInRule.multiple_of;
        if (Array.isArray(multipliers)) {
          multipliers.forEach(mult => {
            if (typeof mult === 'number' && mult > 0) {
              for (let i = 1; i * mult <= max; i++) allowedSet.add(i * mult);
            }
          });
        }
      }
      
      if (allowedSet.size > 0) {
        result = Array.from(allowedSet).sort((a, b) => a - b);
      } else {
        // Priority D: Any (default range from min_days to max)
        const dayMin = checkInRule?.min_days || min;
        for (let i = dayMin; i <= max; i++) {
          allowedSet.add(i);
        }
        result = Array.from(allowedSet).sort((a, b) => a - b);
      }
    }

    // Filter out nights that overlap with existing bookings
    let maxAllowedNightsByBookings = max;
    
    const nextBookings = propertyBookings
      .filter(b => b.check_in)
      .map(b => parseISO(b.check_in))
      .filter(d => d > checkInDate)
      .sort((a, b) => a.getTime() - b.getTime());
      
    if (nextBookings.length > 0) {
      const nextBookingCheckIn = nextBookings[0];
      maxAllowedNightsByBookings = differenceInDays(nextBookingCheckIn, checkInDate);
    }

    const filteredResult = result.filter(n => n <= maxAllowedNightsByBookings);

    if (filteredResult.length === 0) {
      return { allowedNights: [], minNights: min, maxNights: max, displayMin: 0, displayMax: 0 };
    }

    return { 
      allowedNights: filteredResult, 
      minNights: min, 
      maxNights: max, 
      displayMin: filteredResult[0], 
      displayMax: filteredResult[filteredResult.length - 1] 
    };
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
  const securityDeposit = property?.security_deposit || 0;
  const total = subtotal + cleaningFee;

  const isWithin14Days = checkIn ? differenceInDays(parseISO(checkIn), startOfDay(new Date())) <= 14 : false;

  const depositAmount = (() => {
    if (isWithin14Days) return total;
    if (!property?.deposit_enabled || !property?.deposit_value) return 0;
    if (property.deposit_type === 'percentage') {
      return Number(((total * property.deposit_value) / 100).toFixed(2));
    }
    return property.deposit_value;
  })();

  const handleBooking = async () => {
    const newErrors = {};
    if (!guestName.trim()) newErrors.guestName = "Full name is required";
    if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) newErrors.guestEmail = "Valid email is required";
    if (guestPhone && !/^\+?[0-9\s\-()]{7,15}$/.test(guestPhone)) newErrors.guestPhone = "Invalid phone format";
    if (!agreedHouseRules) newErrors.agreedHouseRules = "Required";
    if (!agreedCancellation) newErrors.agreedCancellation = "Required";
    if (!agreedTerms) newErrors.agreedTerms = "Required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    
    try {
      const existingBookings = await base44.entities.Booking.filter({ property_id: propertyId });
      const conflicting = existingBookings.filter(b => ['confirmed', 'blocked', 'checked_in', 'awaiting_decision', 'awaiting_payment'].includes(b.booking_status));
      
      const newCheckIn = parseISO(checkIn);
      const newCheckOut = parseISO(checkOut);
      
      const hasConflict = conflicting.some(b => {
        if (!b.check_in || !b.check_out) return false;
        const bCheckIn = parseISO(b.check_in);
        const bCheckOut = parseISO(b.check_out);
        return newCheckIn < bCheckOut && bCheckIn < newCheckOut;
      });

      if (hasConflict) {
        toast.error("Sorry, these dates are no longer available. Please select different dates.");
        queryClient.invalidateQueries({ queryKey: ['property-bookings'] });
        return;
      }
    } catch (e) {
      console.error(e);
    }

    const totalGuests = guestData.adults + guestData.childrenAges.length;
    bookingMutation.mutate({
      property_id: propertyId,
      host_id: property.owner_id,
      guest_id: currentUser?.id,
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
      security_deposit: securityDeposit,
      total_amount: total,
      deposit_amount: depositAmount,
      remaining_balance: total - depositAmount,
      full_payment_due_date: isWithin14Days ? new Date().toISOString() : addDays(parseISO(checkIn), -14).toISOString(),
      booking_status: "awaiting_decision",
      booking_type: "request",
      request_timestamp: new Date().toISOString(),
      decision_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      guest_message: guestMessage,
      payment_link_id: crypto.randomUUID().slice(0, 8),
    });
  };

  const getStayDatesUI = () => {
    if (!checkIn || !checkOut) return null;
    const checkInFormatted = format(parseISO(checkIn), "MMM d, yyyy");
    const checkOutFormatted = format(parseISO(checkOut), "MMM d, yyyy");
    const inTime = property?.check_in_time || "15:00";
    const outTime = property?.check_out_time || "10:00";
    
    const formatTime = (timeStr) => {
      if (!timeStr) return "";
      const [h, m] = timeStr.split(':');
      let hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `${hour}:${m} ${ampm}`;
    };

    return (
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 my-3 text-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-500">Check-in:</span>
          <span className="font-medium text-gray-900">{checkInFormatted} – {formatTime(inTime)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Check-out:</span>
          <span className="font-medium text-gray-900">{checkOutFormatted} – {formatTime(outTime)}</span>
        </div>
      </div>
    );
  };

  const getPriceBreakdownUI = () => {
    if (!checkIn || numNights === 0) return null;
    const remainingBalance = total - depositAmount;
    const balanceDueDate = format(addDays(parseISO(checkIn), -14), "MMM d, yyyy");

    return (
      <div className="space-y-2 py-3 border-t border-gray-100">
        {priceBreakdown.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm text-gray-600">
            <span>{item.nights} × £{item.rate.toFixed(2)} per night</span>
            <span>£{(item.nights * item.rate).toFixed(2)}</span>
          </div>
        ))}
        {cleaningFee > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Cleaning fee</span>
            <span>£{cleaningFee.toFixed(2)}</span>
          </div>
        )}
        {securityDeposit > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Security deposit (refundable)</span>
            <span>£{securityDeposit.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
          <span>Total</span>
          <span>£{total.toFixed(2)}</span>
        </div>
        {isWithin14Days ? (
          <>
            <div className="flex justify-between text-sm font-semibold text-teal-700 pt-2 border-t border-gray-100 mt-2">
              <span>Full Payment Due Now</span>
              <span>£{total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              As your arrival date is within 14 days, full payment is required to secure this booking.
            </p>
          </>
        ) : depositAmount > 0 ? (
          <>
            <div className="flex justify-between text-sm font-semibold text-teal-700 pt-2 border-t border-gray-100 mt-2">
              <span>Deposit Due Now</span>
              <span>£{depositAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 pt-1">
              <span>Remaining Balance</span>
              <span>£{remainingBalance.toFixed(2)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Balance due by {balanceDueDate} (14 days before check-in)
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Your remaining balance will automatically be due 14 days before check-in.
            </p>
          </>
        ) : (
          <div className="flex justify-between text-sm font-semibold text-teal-700 pt-2 border-t border-gray-100 mt-2">
            <span>Amount Due Now</span>
            <span>£{total.toFixed(2)}</span>
          </div>
        )}
      </div>
    );
  };

  const { data: cancellationPolicy, isLoading: policyLoading } = useQuery({
    queryKey: ['cancellation-policy', property?.cancellation_policy_id],
    queryFn: () => {
      if (!property?.cancellation_policy_id) return null;
      return base44.entities.CancellationPolicy.filter({ id: property.cancellation_policy_id }).then(results => results[0]);
    },
    enabled: !!property?.cancellation_policy_id,
  });

  const getAcknowledgementsUI = () => (
    <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
        <h4 className="font-semibold text-blue-900 text-sm mb-1">Cancellation Policy</h4>
        <p className="text-sm text-blue-800">
          {policyLoading ? "Loading policy..." : (cancellationPolicy?.description || "Cancellation policy details not available.")}
        </p>
      </div>
      <div className="flex items-start space-x-2">
        <Checkbox 
          id="rules" 
          checked={agreedHouseRules} 
          onCheckedChange={(checked) => { setAgreedHouseRules(checked); setErrors(prev => ({...prev, agreedHouseRules: null})) }} 
        />
        <div className="grid gap-1.5 leading-none">
          <label htmlFor="rules" className="text-sm font-medium leading-none cursor-pointer">
            I agree to the house rules
          </label>
          {errors.agreedHouseRules && <p className="text-xs text-red-500">{errors.agreedHouseRules}</p>}
        </div>
      </div>
      <div className="flex items-start space-x-2">
        <Checkbox 
          id="cancellation" 
          checked={agreedCancellation} 
          onCheckedChange={(checked) => { setAgreedCancellation(checked); setErrors(prev => ({...prev, agreedCancellation: null})) }} 
        />
        <div className="grid gap-1.5 leading-none">
          <label htmlFor="cancellation" className="text-sm font-medium leading-none cursor-pointer">
            I agree to the cancellation policy
          </label>
          {errors.agreedCancellation && <p className="text-xs text-red-500">{errors.agreedCancellation}</p>}
        </div>
      </div>
      <div className="flex items-start space-x-2">
        <Checkbox 
          id="terms" 
          checked={agreedTerms} 
          onCheckedChange={(checked) => { setAgreedTerms(checked); setErrors(prev => ({...prev, agreedTerms: null})) }} 
        />
        <div className="grid gap-1.5 leading-none">
          <label htmlFor="terms" className="text-sm font-medium leading-none cursor-pointer">
            I agree to the terms & conditions{' '}
            <Link 
              to={`${createPageUrl('LegalCentre')}?propertyId=${propertyId}&checkIn=${checkIn}&nights=${nights}&adults=${guestData.adults}&childrenAges=${guestData.childrenAges.join(',')}`} 
              className="text-xs text-teal-600 hover:underline"
            >
              (See here)
            </Link>
          </label>
          {errors.agreedTerms && <p className="text-xs text-red-500">{errors.agreedTerms}</p>}
        </div>
      </div>
    </div>
  );

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
                {(property.town || property.county || property.postcode) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    {[property.town, property.county, property.postcode].filter(Boolean).join(', ')}
                  </span>
                )}
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
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className={`rounded-full shadow-sm transition-all ${wishlistStatus ? 'border-red-100 bg-red-50 hover:bg-red-100' : 'hover:bg-gray-100'}`}
                        onClick={handleWishlistClick}
                        disabled={toggleWishlistMutation.isPending}
                      >
                        <motion.div
                          animate={{ 
                            scale: wishlistStatus ? [1, 1.2, 1] : 1,
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          <Heart 
                            className={`w-5 h-5 transition-colors duration-300 ${
                              wishlistStatus 
                                ? 'fill-red-500 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                                : 'text-gray-600'
                            }`} 
                          />
                        </motion.div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{wishlistStatus ? 'Remove from Wishlist' : 'Add to Wishlist'}</p>
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
                    label="Trip Start"
                    value={checkIn}
                    onSelect={(date) => {
                      setCheckIn(date ? format(date, "yyyy-MM-dd") : "");
                      setNights("");
                    }}
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
                        <SelectValue placeholder="Trip Duration" />
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

                {getStayDatesUI()}
                {getPriceBreakdownUI()}

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
                          onChange={(e) => { setGuestName(e.target.value); setErrors(prev => ({...prev, guestName: null})) }}
                          placeholder="John Smith"
                          className={`mt-1 ${errors.guestName ? 'border-red-500' : ''}`}
                        />
                        {errors.guestName && <p className="text-xs text-red-500 mt-1">{errors.guestName}</p>}
                      </div>
                      <div>
                        <Label className="font-medium">Email *</Label>
                        <Input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => { setGuestEmail(e.target.value); setErrors(prev => ({...prev, guestEmail: null})) }}
                          placeholder="john@example.com"
                          className={`mt-1 ${errors.guestEmail ? 'border-red-500' : ''}`}
                        />
                        {errors.guestEmail && <p className="text-xs text-red-500 mt-1">{errors.guestEmail}</p>}
                      </div>
                      <div>
                        <Label className="font-medium">Phone</Label>
                        <Input
                          value={guestPhone}
                          onChange={(e) => { setGuestPhone(e.target.value); setErrors(prev => ({...prev, guestPhone: null})) }}
                          placeholder="+44 7123 456789"
                          className={`mt-1 ${errors.guestPhone ? 'border-red-500' : ''}`}
                        />
                        {errors.guestPhone && <p className="text-xs text-red-500 mt-1">{errors.guestPhone}</p>}
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
                      
                      {getAcknowledgementsUI()}

                      <Button 
                        className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold mt-4"
                        onClick={handleBooking}
                        disabled={bookingMutation.isPending}
                      >
                        {bookingMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
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
                    label="Trip Start"
                    value={checkIn}
                    onSelect={(date) => {
                      setCheckIn(date ? format(date, "yyyy-MM-dd") : "");
                      setNights("");
                    }}
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
                        <SelectValue placeholder="Trip Duration" />
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
                {getStayDatesUI()}
                <Separator />
                <div>
                  <Label className="font-medium">Full Name *</Label>
                  <Input
                    value={guestName}
                    onChange={(e) => { setGuestName(e.target.value); setErrors(prev => ({...prev, guestName: null})) }}
                    placeholder="Full name"
                    className={`mt-1 ${errors.guestName ? 'border-red-500' : ''}`}
                  />
                  {errors.guestName && <p className="text-xs text-red-500 mt-1">{errors.guestName}</p>}
                </div>
                <div>
                  <Label className="font-medium">Email *</Label>
                  <Input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => { setGuestEmail(e.target.value); setErrors(prev => ({...prev, guestEmail: null})) }}
                    placeholder="Email"
                    className={`mt-1 ${errors.guestEmail ? 'border-red-500' : ''}`}
                  />
                  {errors.guestEmail && <p className="text-xs text-red-500 mt-1">{errors.guestEmail}</p>}
                </div>
                <div>
                  <Label className="font-medium">Phone</Label>
                  <Input
                    value={guestPhone}
                    onChange={(e) => { setGuestPhone(e.target.value); setErrors(prev => ({...prev, guestPhone: null})) }}
                    placeholder="Phone"
                    className={`mt-1 ${errors.guestPhone ? 'border-red-500' : ''}`}
                  />
                  {errors.guestPhone && <p className="text-xs text-red-500 mt-1">{errors.guestPhone}</p>}
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
                
                <div className="bg-gray-50 rounded-lg px-3 py-1 border border-gray-200 mt-4">
                  {getPriceBreakdownUI()}
                </div>

                {getAcknowledgementsUI()}

                <Button 
                  className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold mt-4"
                  onClick={handleBooking}
                  disabled={bookingMutation.isPending || !checkIn || !nights}
                >
                  {bookingMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                  ) : "Confirm Booking Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}