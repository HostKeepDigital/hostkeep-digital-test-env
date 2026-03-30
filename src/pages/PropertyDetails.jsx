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

  const { user: currentUser, openAuthModal } = useAuth();
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
      const users = await base44.entities.User.filter({ id: property.owner_id });
      return users[0];
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
      setTimeout(() => openAuthModal?.(), 1500);
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
          <div className="hidden md:grid grid-cols-12 gap-2 md:gap-3 lg:gap-4 h-[420px] rounded-2xl overflow-hidden">
            <div
              className="col-span-7 lg:col-span-8 relative cursor-pointer group"
              onClick={() => setShowImageOverlay(true)}
            >
              <img
                src={photos[0]}
                alt={property.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {photos.length} photos
                </div>
              </div>
            </div>
            <div className="col-span-5 lg:col-span-4 grid grid-rows-2 gap-2 md:gap-3 lg:gap-4">
              {photos.slice(1, 3).map((photo, idx) => (
                <div
                  key={idx}
                  className="relative cursor-pointer group"
                  onClick={() => setShowImageOverlay(true)}
                >
                  <img
                    src={photo}
                    alt={`${property.title} ${idx + 2}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-black/5 pointer-events-none" />
                </div>
              ))}
              {photos.length > 3 && (
                <div
                  className="relative cursor-pointer group"
                  onClick={() => setShowImageOverlay(true)}
                >
                  <img
                    src={photos[3]}
                    alt={`${property.title} 4`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/95 hover:bg-white text-gray-900 border border-gray-200 shadow-sm"
                    >
                      View all photos
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rest of the details layout (title, booking card, etc.) would follow here,
          unchanged in structure—using currentUser from useAuth wherever needed. */}
    </div>
  );
}