import { useState } from "react";
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
  Star,
  MapPin,
  Users,
  Bed,
  Bath,
  Calendar,
  CheckCircle,
  X,
  AlertCircle,
  Wifi,
  Car,
  Wind,
  Waves,
  ChefHat,
  Tv,
  Flame,
  TreeDeciduous,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { format, parseISO, differenceInDays, addDays, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import ReviewList from "@/components/reviews/ReviewList";
import BookingCalendar from "@/components/shared/BookingCalendar";
import PropertyShareModal from "@/components/properties/PropertyShareModal";
import { useAuth } from "@/lib/AuthContext";

const AMENITY_ICONS = {
  WiFi: Wifi,
  Parking: Car,
  "Air Conditioning": Wind,
  Pool: Waves,
  Kitchen: ChefHat,
  TV: Tv,
  "Hot Tub": Flame,
  Garden: TreeDeciduous,
};

export default function PropertyDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get("id");

  const { user: currentUser } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageOverlay, setShowImageOverlay] = useState(false);
  const [checkIn, setCheckIn] = useState(() => urlParams.get("checkIn") || "");
  const [nights, setNights] = useState(() => urlParams.get("duration") || "");
  const [guestData, setGuestData] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const adults = parseInt(params.get("adults")) || 1;
    const childrenAges = params.get("childrenAges")
      ? params.get("childrenAges").split(",").map((a) => parseInt(a))
      : [];
    return { adults, childrenAges };
  });
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [agreedHouseRules, setAgreedHouseRules] = useState(false);
  const [agreedCancellation, setAgreedCancellation] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  // Prevent scrolling when image overlay is open
  if (showImageOverlay) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "unset";
  }

  // Check if check-in date is allowed based on booking rules
  const isDayAllowedForCheckIn = (date, property) => {
    if (!property?.day_based_restrictions_enabled || !property?.booking_rules) {
      return true;
    }

    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayName = dayNames[date.getDay()];
    const dayRule = property.booking_rules[dayName];

    if (!dayRule || dayRule.enabled !== false) {
      return true;
    }

    return false;
  };

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const results = await base44.entities.Property.filter({ id: propertyId });
      return results[0];
    },
    enabled: !!propertyId,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["property-reviews", propertyId],
    queryFn: () =>
      base44.entities.Review.filter({
        property_id: propertyId,
        visible: true,
        review_type: "guest_to_host",
      }),
    enabled: !!propertyId,
  });

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

  const { data: host } = useQuery({
    queryKey: ["host", property?.owner_id],
    queryFn: async () => {
      if (!property?.owner_id) return null;
      try {
        const creds = await base44.entities.UserCredentials.filter({ user_id: property.owner_id });
        return creds[0] || null;
      } catch {
        return null;
      }
    },
    enabled: !!property?.owner_id,
  });

  const hostStripeVerified = host?.stripe_connect_status === "verified";
  const bookingBlocked = property?.status === "published" && host && !hostStripeVerified;

  const { data: propertyBookings = [] } = useQuery({
    queryKey: ["property-bookings", propertyId],
    queryFn: async () => {
      const bookings = await base44.entities.Booking.filter({ property_id: propertyId });
      return bookings.filter((b) =>
        ["confirmed", "blocked", "checked_in", "awaiting_decision", "awaiting_payment"].includes(
          b.booking_status
        )
      );
    },
    enabled: !!propertyId,
  });

  const { data: wishlistStatus, refetch: refetchWishlist } = useQuery({
    queryKey: ["wishlist-status", propertyId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return false;
      const res = await base44.entities.WishlistProperty.filter({
        property_id: propertyId,
        user_id: currentUser.id,
      });
      return res.length > 0 ? res[0] : null;
    },
    enabled: !!propertyId && !!currentUser?.id,
  });

  const toggleWishlistMutation = useMutation({
    mutationFn: async (currentWishlistEntry) => {
      if (!currentUser) return;

      if (currentWishlistEntry) {
        await base44.entities.WishlistProperty.delete(currentWishlistEntry.id);
        return { action: "removed" };
      } else {
        await base44.entities.WishlistProperty.create({
          property_id: propertyId,
          user_id: currentUser.id,
        });
        return { action: "added" };
      }
    },
    onSuccess: (data) => {
      if (!data) return;
      refetchWishlist();
      queryClient.invalidateQueries({ queryKey: ["wishlist-properties"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist-status"] });

      if (data.action === "added") {
        toast.success("This property has been added to your wishlist.");
      } else {
        toast.success("Removed from your wishlist.");
      }
    },
  });

  const handleWishlistClick = (e) => {
    if (!currentUser) {
      toast.info("Create an account to save properties to your wishlist.");
      setTimeout(() => { window.location.href = "/SignIn"; }, 1500);
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
        colors: ["#ef4444", "#f472b6", "#fcd34d"],
        origin: { x, y },
        disableForReducedMotion: true,
        ticks: 150,
        gravity: 0.8,
        scalar: 0.8,
      });
    }
  };

  const getBookedDates = () => {
    const bookedDates = [];
    propertyBookings.forEach((booking) => {
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
    return bookedDates.some(
      (bookedDate) => bookedDate.toDateString() === date.toDateString()
    );
  };

  const { allowedNights, minNights, maxNights, displayMin, displayMax } = (() => {
    if (!checkIn || !property?.booking_rules) {
      return {
        allowedNights: [],
        minNights: 1,
        maxNights: 28,
        displayMin: 1,
        displayMax: 28,
      };
    }

    const min = property.minimum_stay || 1;
    const max = 28;
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    const checkInDate = parseISO(checkIn);
    const checkInDayName = dayNames[checkInDate.getDay()];
    const checkInRule = property.booking_rules[checkInDayName];

    let result = [];

    if (!checkInRule || checkInRule.enabled === false) {
      result = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    } else {
      const allowedSet = new Set();
      const ruleType = checkInRule?.rule_type || "any";

      if (ruleType === "fixed" && checkInRule?.fixed_values?.length > 0) {
        checkInRule.fixed_values.forEach((val) => {
          if (typeof val === "number" && val > 0 && val <= max) {
            allowedSet.add(val);
          }
        });
      } else if (ruleType === "fixed_or_multiples") {
        const fixedVals = checkInRule?.fixed_values || [];
        const multipliers = checkInRule?.multiple_of || [];

        fixedVals.forEach((val) => {
          if (typeof val === "number" && val > 0 && val <= max) allowedSet.add(val);
        });

        if (Array.isArray(multipliers)) {
          multipliers.forEach((mult) => {
            if (typeof mult === "number" && mult > 0) {
              for (let i = 1; i * mult <= max; i++) allowedSet.add(i * mult);
            }
          });
        }
      } else if (ruleType === "multiples" && checkInRule?.multiple_of) {
        const multipliers = checkInRule.multiple_of;
        if (Array.isArray(multipliers)) {
          multipliers.forEach((mult) => {
            if (typeof mult === "number" && mult > 0) {
              for (let i = 1; i * mult <= max; i++) allowedSet.add(i * mult);
            }
          });
        }
      }

      if (allowedSet.size > 0) {
        result = Array.from(allowedSet).sort((a, b) => a - b);
      } else {
        const dayMin = checkInRule?.min_days || min;
        for (let i = dayMin; i <= max; i++) {
          allowedSet.add(i);
        }
        result = Array.from(allowedSet).sort((a, b) => a - b);
      }
    }

    let maxAllowedNightsByBookings = max;

    const nextBookings = propertyBookings
      .filter((b) => b.check_in)
      .map((b) => parseISO(b.check_in))
      .filter((d) => d > checkInDate)
      .sort((a, b) => a.getTime() - b.getTime());

    if (nextBookings.length > 0) {
      const nextBookingCheckIn = nextBookings[0];
      maxAllowedNightsByBookings = differenceInDays(nextBookingCheckIn, checkInDate);
    }

    const filteredResult = result.filter((n) => n <= maxAllowedNightsByBookings);

    if (filteredResult.length === 0) {
      return {
        allowedNights: [],
        minNights: min,
        maxNights: max,
        displayMin: 0,
        displayMax: 0,
      };
    }

    return {
      allowedNights: filteredResult,
      minNights: min,
      maxNights: max,
      displayMin: filteredResult[0],
      displayMax: filteredResult[filteredResult.length - 1],
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

  const photos =
    property?.photos?.length > 0
      ? property.photos
      : ["https://lh3.googleusercontent.com/d/1Vr07gcaaC19XEmxcvTbq-DTn8PZKn-_a"];

  const numNights = nights ? parseInt(nights) : 0;
  const checkOut =
    checkIn && numNights
      ? format(addDays(parseISO(checkIn), numNights), "yyyy-MM-dd")
      : "";

  const calculateNightlyRate = (dateString) => {
    if (!dateString || !property) return property?.nightly_rate || 0;

    const pricingSettings = property.pricing_settings;
    if (!pricingSettings) return property.nightly_rate || 0;

    const date = parseISO(dateString);
    const dateKey = format(date, "yyyy-MM-dd");
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;

    if (pricingSettings.date_overrides?.[dateKey]?.rate) {
      return pricingSettings.date_overrides[dateKey].rate;
    }

    if (pricingSettings.seasons?.length > 0) {
      for (const season of pricingSettings.seasons) {
        const seasonStart = parseISO(season.start_date);
        const seasonEnd = parseISO(season.end_date);
        if (date >= seasonStart && date <= seasonEnd) {
          let rate = season.nightly_rate || property.nightly_rate;
          if (isWeekend && season.weekend_modifier) {
            rate = rate * (1 + season.weekend_modifier / 100);
          }
          if (pricingSettings.price_rounding) {
            rate =
              Math.round(rate / pricingSettings.price_rounding) *
              pricingSettings.price_rounding;
          }
          return rate;
        }
      }
    }

    if (isWeekend && pricingSettings.weekend_rate) {
      return pricingSettings.weekend_rate;
    }
    if (!isWeekend && pricingSettings.weekday_rate) {
      return pricingSettings.weekday_rate;
    }

    return pricingSettings.base_rate || property.nightly_rate || 0;
  };

  const getLowestMonthlyRate = (dateString = null) => {
    if (!property) return property?.nightly_rate || 0;

    const referenceDate = dateString ? parseISO(dateString) : new Date();
    const startOfMonth = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() + 1,
      0
    );

    let lowestRate = Infinity;
    for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      const rate = calculateNightlyRate(format(d, "yyyy-MM-dd"));
      if (rate < lowestRate) {
        lowestRate = rate;
      }
    }

    return lowestRate === Infinity ? property?.nightly_rate || 0 : lowestRate;
  };

  const displayStartingRate = getLowestMonthlyRate(checkIn);

  const subtotal = (() => {
    if (!checkIn || numNights === 0) return 0;
    let total = 0;
    for (let i = 0; i < numNights; i++) {
      const nightDate = format(addDays(parseISO(checkIn), i), "yyyy-MM-dd");
      total += calculateNightlyRate(nightDate);
    }
    return total;
  })();

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

  const isWithin14Days = checkIn
    ? differenceInDays(parseISO(checkIn), startOfDay(new Date())) <= 14
    : false;

  const depositAmount = (() => {
    if (isWithin14Days) return total;
    if (!property?.deposit_enabled || !property?.deposit_value) return 0;
    if (property.deposit_type === "percentage") {
      return Number(((total * property.deposit_value) / 100).toFixed(2));
    }
    return property.deposit_value;
  })();

  const handleBooking = async () => {
    const newErrors = {};
    if (!guestName.trim()) newErrors.guestName = "Full name is required";
    if (
      !guestEmail.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)
    )
      newErrors.guestEmail = "Valid email is required";
    if (guestPhone && !/^\+?[0-9\s\-()]{7,15}$/.test(guestPhone))
      newErrors.guestPhone = "Invalid phone format";
    if (!agreedHouseRules) newErrors.agreedHouseRules = "Required";
    if (!agreedCancellation) newErrors.agreedCancellation = "Required";
    if (!agreedTerms) newErrors.agreedTerms = "Required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      const existingBookings = await base44.entities.Booking.filter({
        property_id: propertyId,
      });
      const conflicting = existingBookings.filter((b) =>
        ["confirmed", "blocked", "checked_in", "awaiting_decision", "awaiting_payment"].includes(
          b.booking_status
        )
      );

      const newCheckIn = parseISO(checkIn);
      const newCheckOut = parseISO(checkOut);

      const hasConflict = conflicting.some((b) => {
        if (!b.check_in || !b.check_out) return false;
        const bCheckIn = parseISO(b.check_in);
        const bCheckOut = parseISO(b.check_out);
        return newCheckIn < bCheckOut && bCheckIn < newCheckOut;
      });

      if (hasConflict) {
        toast.error(
          "Sorry, these dates are no longer available. Please select different dates."
        );
        queryClient.invalidateQueries({ queryKey: ["property-bookings"] });
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
      full_payment_due_date: isWithin14Days
        ? new Date().toISOString()
        : addDays(parseISO(checkIn), -14).toISOString(),
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
      const [h, m] = timeStr.split(":");
      let hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      hour = hour % 12 || 12;
      return `${hour}:${m} ${ampm}`;
    };

    return (
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 my-3 text-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-500">Check-in:</span>
          <span className="font-medium text-gray-900">
            {checkInFormatted} – {formatTime(inTime)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Check-out:</span>
          <span className="font-medium text-gray-900">
            {checkOutFormatted} – {formatTime(outTime)}
          </span>
        </div>
      </div>
    );
  };

  const getPriceBreakdownUI = () => {
    if (!checkIn || numNights === 0) return null;
    const remainingBalance = total - depositAmount;
    const balanceDueDate = format(
      addDays(parseISO(checkIn), -14),
      "MMM d, yyyy"
    );

    return (
      <div className="space-y-2 py-3 border-t border-gray-100">
        {priceBreakdown.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm text-gray-600">
            <span>
              {item.nights} × £{item.rate.toFixed(2)} per night
            </span>
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
              As your arrival date is within 14 days, full payment is required to
              secure this booking.
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
              Your remaining balance will automatically be due 14 days before
              check-in.
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
    queryKey: ["cancellation-policy", property?.cancellation_policy_id],
    queryFn: () => {
      if (!property?.cancellation_policy_id) return null;
      return base44.entities.CancellationPolicy.filter({
        id: property.cancellation_policy_id,
      }).then((results) => results[0]);
    },
    enabled: !!property?.cancellation_policy_id,
  });

  const getAcknowledgementsUI = () => (
    <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
        <h4 className="font-semibold text-blue-900 text-sm mb-1">
          Cancellation Policy
        </h4>
        <p className="text-sm text-blue-800">
          {policyLoading
            ? "Loading policy..."
            : cancellationPolicy?.description ||
              "Cancellation policy details not available."}
        </p>
      </div>
      <div className="flex items-start space-x-2">
        <Checkbox
          id="rules"
          checked={agreedHouseRules}
          onCheckedChange={(checked) => {
            setAgreedHouseRules(!!checked);
            setErrors((prev) => ({ ...prev, agreedHouseRules: null }));
          }}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="rules"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            I agree to the house rules
          </label>
          {errors.agreedHouseRules && (
            <p className="text-xs text-red-500">{errors.agreedHouseRules}</p>
          )}
        </div>
      </div>
      <div className="flex items-start space-x-2">
        <Checkbox
          id="cancellation"
          checked={agreedCancellation}
          onCheckedChange={(checked) => {
            setAgreedCancellation(!!checked);
            setErrors((prev) => ({ ...prev, agreedCancellation: null }));
          }}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="cancellation"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            I agree to the cancellation policy
          </label>
          {errors.agreedCancellation && (
            <p className="text-xs text-red-500">{errors.agreedCancellation}</p>
          )}
        </div>
      </div>
      <div className="flex items-start space-x-2">
        <Checkbox
          id="terms"
          checked={agreedTerms}
          onCheckedChange={(checked) => {
            setAgreedTerms(!!checked);
            setErrors((prev) => ({ ...prev, agreedTerms: null }));
          }}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            I agree to the terms & conditions{" "}
            <Link
              to={`${createPageUrl(
                "LegalCentre"
              )}?propertyId=${propertyId}&checkIn=${checkIn}&nights=${nights}&adults=${
                guestData.adults
              }&childrenAges=${guestData.childrenAges.join(",")}`}
              className="text-xs text-teal-600 hover:underline"
            >
              (See here)
            </Link>
          </label>
          {errors.agreedTerms && (
            <p className="text-xs text-red-500">{errors.agreedTerms}</p>
          )}
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
          <p className="text-gray-500">
            This property may have been removed or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
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
                      setCurrentImageIndex((prev) =>
                        prev === 0 ? photos.length - 1 : prev - 1
                      );
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) =>
                        prev === photos.length - 1 ? 0 : prev + 1
                      );
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                {currentImageIndex + 1} / {photos.length}
              </div>
            </div>
          </div>

          {/* Desktop: Grid */}
          <div className="hidden md:grid grid-cols-12 gap-2 h-[480px] rounded-2xl overflow-hidden">
            {/* Main large photo */}
            <div
              className="col-span-7 relative cursor-pointer overflow-hidden group"
              onClick={() => setShowImageOverlay(true)}
            >
              <img
                src={photos[0]}
                alt={property.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>

            {/* Right 2x2 grid */}
            <div className="col-span-5 grid grid-cols-2 grid-rows-2 gap-2">
              {[1, 2, 3, 4].map((idx) => {
                const photo = photos[idx];
                const isLast = idx === 4;
                const remaining = photos.length - 4; // photos not shown (index 5+)
                if (!photo && idx > 1) return null;
                return (
                  <div
                    key={idx}
                    className="relative cursor-pointer overflow-hidden group bg-gray-200"
                    onClick={() => setShowImageOverlay(true)}
                  >
                    {photo ? (
                      <img
                        src={photo}
                        alt={`${property.title} ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : null}
                    {isLast && remaining > 0 && (
                      <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">+{remaining}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{[property.location?.street, property.location?.locality, property.town !== property.postcode_district ? property.town : null, property.county, property.postcode].filter(Boolean).join(', ')}</span>
                    </div>
                    {averageRating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{averageRating}</span>
                        <span className="text-gray-500">({reviews.length})</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleWishlistClick}
                    className="h-10 w-10 rounded-lg"
                  >
                    <Heart
                      className={`w-5 h-5 ${wishlistStatus ? "fill-red-500 text-red-500" : "text-gray-600"}`}
                    />
                  </Button>
                  <PropertyShareModal
                    propertyTitle={property?.title}
                    propertyUrl={`https://hostkeepdigital.co.uk/PropertyDetails?id=${propertyId}`}
                  />
                </div>
              </div>
            </div>

            {/* Property Basics */}
            <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gray-400" />
                {property.guest_capacity} guests
              </span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1.5">
                <Bed className="w-4 h-4 text-gray-400" />
                {property.bedrooms} bedroom{property.bedrooms !== 1 ? 's' : ''}
              </span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1.5">
                <Bath className="w-4 h-4 text-gray-400" />
                {property.bathrooms} bathroom{property.bathrooms !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Description */}
              {property.description && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-900">About this property</h2>
                <p className="text-gray-700 leading-relaxed">{property.description}</p>
              </div>
            )}

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-900">What this place offers</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {property.amenities.map((amenity, idx) => {
                    const IconComponent = AMENITY_ICONS[amenity] || CheckCircle;
                    return (
                      <div key={idx} className="flex items-center gap-2.5 py-2 px-3 bg-gray-50 rounded-lg">
                        <IconComponent className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{amenity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* House Rules */}
            {property.house_rules && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-900">House rules</h2>
                <p className="text-gray-700 whitespace-pre-line">{property.house_rules}</p>
              </div>
            )}

            {/* Cancellation Policy */}
            {!policyLoading && cancellationPolicy && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-900">Cancellation policy</h2>
                <p className="text-gray-700">{cancellationPolicy.description}</p>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Reviews</h2>
                <ReviewList reviews={reviews} />
              </div>
            )}
          </div>

          {/* Right Column: Booking Card */}
          <div className="lg:sticky lg:top-24">
            <Card>
              <CardContent className="pt-6 space-y-4">
                {/* Pricing */}
                <div className="text-center pb-4 border-b">
                  <p className="text-gray-600 text-sm mb-1">From</p>
                  <p className="text-3xl font-bold text-gray-900">£{displayStartingRate.toFixed(0)}</p>
                  <p className="text-gray-600 text-sm">per night</p>
                </div>

                {/* Dates & Guests */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-600 font-medium">Check-in</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal mt-1 h-10"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          {checkIn ? format(parseISO(checkIn), "MMM d, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={checkIn ? parseISO(checkIn) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setCheckIn(format(date, "yyyy-MM-dd"));
                              setNights("");
                            }
                          }}
                          disabled={(date) =>
                            date < startOfDay(new Date()) ||
                            isDateBooked(date) ||
                            !isDayAllowedForCheckIn(date, property)
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 font-medium">Nights</Label>
                    <Select value={nights} onValueChange={setNights}>
                      <SelectTrigger className="mt-1 h-10">
                        <SelectValue placeholder="Select nights" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedNights.map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} night{n > 1 ? "s" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 font-medium">Guests</Label>
                    <div className="flex gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setGuestData((prev) => ({
                            ...prev,
                            adults: Math.max(1, prev.adults - 1),
                          }))
                        }
                      >
                        −
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled
                      >
                        {guestData.adults + guestData.childrenAges.length} guests
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setGuestData((prev) => ({
                            ...prev,
                            adults: prev.adults + 1,
                          }))
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                {getPriceBreakdownUI()}

                {/* Booking Blocked Warning */}
                {bookingBlocked && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>This host hasn't verified their payment method yet. Booking is temporarily unavailable.</span>
                  </div>
                )}

                {/* Reserve Button */}
                <Button
                  onClick={() => {
                    if (!currentUser) {
                      toast.info("Please sign in to book this property.");
                      setTimeout(() => { window.location.href = "/SignIn"; }, 1500);
                      return;
                    }
                    if (!checkIn || !nights) {
                      toast.error("Please select dates.");
                      return;
                    }
                    setShowBookingDialog(true);
                  }}
                  disabled={bookingBlocked || !checkIn || !nights || numNights === 0}
                  className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold"
                >
                  {bookingBlocked ? "Booking Unavailable" : "Reserve"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Your Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {getStayDatesUI()}
            <Input
              placeholder="Full name"
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value);
                setErrors((prev) => ({ ...prev, guestName: null }));
              }}
              className={errors.guestName ? "border-red-500" : ""}
            />
            {errors.guestName && <p className="text-xs text-red-500">{errors.guestName}</p>}
            <Input
              type="email"
              placeholder="Email"
              value={guestEmail}
              onChange={(e) => {
                setGuestEmail(e.target.value);
                setErrors((prev) => ({ ...prev, guestEmail: null }));
              }}
              className={errors.guestEmail ? "border-red-500" : ""}
            />
            {errors.guestEmail && <p className="text-xs text-red-500">{errors.guestEmail}</p>}
            <Input
              type="tel"
              placeholder="Phone (optional)"
              value={guestPhone}
              onChange={(e) => {
                setGuestPhone(e.target.value);
                setErrors((prev) => ({ ...prev, guestPhone: null }));
              }}
              className={errors.guestPhone ? "border-red-500" : ""}
            />
            {errors.guestPhone && <p className="text-xs text-red-500">{errors.guestPhone}</p>}
            <Textarea
              placeholder="Message to host (optional)"
              value={guestMessage}
              onChange={(e) => setGuestMessage(e.target.value)}
              className="min-h-24"
            />
            {getAcknowledgementsUI()}
            <Button
              onClick={handleBooking}
              disabled={bookingMutation.isPending}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {bookingMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Overlay */}
      <AnimatePresence>
        {showImageOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setShowImageOverlay(false)}
          >
            <button
              onClick={() => setShowImageOverlay(false)}
              className="absolute top-4 right-4 p-2 hover:bg-black/50 rounded-lg transition-colors z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img
                src={photos[currentImageIndex]}
                alt={`${property.title} ${currentImageIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCurrentImageIndex((prev) =>
                        prev === 0 ? photos.length - 1 : prev - 1
                      )
                    }
                    className="absolute left-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentImageIndex((prev) =>
                        prev === photos.length - 1 ? 0 : prev + 1
                      )
                    }
                    className="absolute right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                </>
              )}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {photos.length}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}