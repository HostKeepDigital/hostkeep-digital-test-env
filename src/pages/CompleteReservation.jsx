import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, addDays, differenceInDays, startOfDay } from "date-fns";
import { toast } from "sonner";
import { ChevronLeft, Loader2, AlertCircle, Info, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

export default function CompleteReservation() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get("propertyId");
  const checkIn = urlParams.get("checkIn");
  const nights = urlParams.get("nights");
  const adults = parseInt(urlParams.get("adults")) || 1;
  const childrenAgesRaw = urlParams.get("childrenAges");
  const childrenAges = childrenAgesRaw
    ? childrenAgesRaw.split(",").filter(Boolean).map((a) => parseInt(a))
    : [];

  const numNights = parseInt(nights) || 0;
  const checkOut =
    checkIn && numNights
      ? format(addDays(parseISO(checkIn), numNights), "yyyy-MM-dd")
      : "";

  const backUrl = `/PropertyDetails?id=${propertyId}&checkIn=${checkIn}&nights=${nights}&adults=${adults}&childrenAges=${childrenAgesRaw || ""}`;

  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [guestName, setGuestName] = useState(
    currentUser ? [currentUser.forename, currentUser.surname].filter(Boolean).join(" ") : ""
  );
  const [guestEmail, setGuestEmail] = useState(currentUser?.email || "");
  const [guestPhone, setGuestPhone] = useState(currentUser?.phone || "");
  const [guestMessage, setGuestMessage] = useState("");
  const [agreedHouseRules, setAgreedHouseRules] = useState(false);
  const [agreedCancellation, setAgreedCancellation] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [errors, setErrors] = useState({});

  // --- Data queries ---
  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const results = await base44.entities.Property.filter({ id: propertyId });
      return results[0];
    },
    enabled: !!propertyId,
  });

  const { data: hostCredentials } = useQuery({
    queryKey: ["host-credentials", property?.owner_id],
    queryFn: async () => {
      const results = await base44.entities.UserCredentials.filter({ user_id: property.owner_id });
      return results[0] || null;
    },
    enabled: !!property?.owner_id,
  });

  const { data: cancellationPolicy } = useQuery({
    queryKey: ["cancellation-policy", property?.cancellation_policy_id],
    queryFn: async () => {
      const results = await base44.entities.CancellationPolicy.filter({
        id: property.cancellation_policy_id,
      });
      return results[0] || null;
    },
    enabled: !!property?.cancellation_policy_id,
  });

  // --- Price logic ---
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
            rate = Math.round(rate / pricingSettings.price_rounding) * pricingSettings.price_rounding;
          }
          return rate;
        }
      }
    }

    if (isWeekend && pricingSettings.weekend_rate) return pricingSettings.weekend_rate;
    if (!isWeekend && pricingSettings.weekday_rate) return pricingSettings.weekday_rate;
    return pricingSettings.base_rate || property.nightly_rate || 0;
  };

  const subtotal = (() => {
    if (!checkIn || numNights === 0 || !property) return 0;
    let total = 0;
    for (let i = 0; i < numNights; i++) {
      const nightDate = format(addDays(parseISO(checkIn), i), "yyyy-MM-dd");
      total += calculateNightlyRate(nightDate);
    }
    return total;
  })();

  const getPriceBreakdown = () => {
    if (!checkIn || numNights === 0 || !property) return [];
    const rateCount = {};
    for (let i = 0; i < numNights; i++) {
      const nightDate = format(addDays(parseISO(checkIn), i), "yyyy-MM-dd");
      const rate = calculateNightlyRate(nightDate);
      rateCount[rate] = (rateCount[rate] || 0) + 1;
    }
    return Object.entries(rateCount)
      .map(([rate, n]) => ({ rate: Number(rate), nights: n }))
      .sort((a, b) => a.rate - b.rate);
  };

  const cleaningFee = property?.cleaning_fee || 0;
  const securityDeposit = property?.security_deposit || 0;
  const total = subtotal + cleaningFee + securityDeposit;

  const isWithin56Days = checkIn
    ? differenceInDays(parseISO(checkIn), startOfDay(new Date())) <= 56
    : false;

  const depositAmount = (() => {
    if (isWithin56Days) return total;
    if (!property?.deposit_enabled || !property?.deposit_value) return 0;
    if (property.deposit_type === "percentage") {
      return Number(((total * property.deposit_value) / 100).toFixed(2));
    }
    return property.deposit_value;
  })();

  const hostStripeVerified = hostCredentials?.stripe_connect_status === "verified";
  const bookingBlocked = property && hostCredentials && !hostStripeVerified;

  // --- Booking mutation ---
  const bookingMutation = useMutation({
    mutationFn: async (data) => base44.entities.Booking.create(data),
    onSuccess: (booking) => {
      navigate(`/Pay?bookingId=${booking.id}`);
    },
  });

  // --- Submission ---
  const handleSubmit = async () => {
    const newErrors = {};
    if (!guestName.trim()) newErrors.guestName = "Full name is required";
    if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail))
      newErrors.guestEmail = "Valid email is required";
    if (guestPhone && !/^\+?[0-9\s\-()\\.]{7,15}$/.test(guestPhone))
      newErrors.guestPhone = "Invalid phone format";
    if (!agreedHouseRules) newErrors.agreedHouseRules = "Required";
    if (!agreedCancellation) newErrors.agreedCancellation = "Required";
    if (!agreedTerms) newErrors.agreedTerms = "Required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    // Conflict check
    const existingBookings = await base44.entities.Booking.filter({ property_id: propertyId });
    const active = existingBookings.filter((b) =>
      ["confirmed", "blocked", "checked_in", "awaiting_decision", "awaiting_payment"].includes(b.booking_status)
    );
    const newCheckIn = parseISO(checkIn);
    const newCheckOut = parseISO(checkOut);
    const hasConflict = active.some((b) => {
      if (!b.check_in || !b.check_out) return false;
      const bCheckIn = parseISO(b.check_in);
      const bCheckOut = parseISO(b.check_out);
      return newCheckIn < bCheckOut && bCheckIn < newCheckOut;
    });
    if (hasConflict) {
      toast.error("Sorry, these dates are no longer available.");
      return;
    }

    bookingMutation.mutate({
      property_id: propertyId,
      host_id: property.owner_id,
      guest_id: currentUser?.id,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      check_in: checkIn,
      check_out: checkOut,
      guests_count: adults + childrenAges.length,
      nightly_rate: property.nightly_rate,
      nights: numNights,
      subtotal,
      cleaning_fee: cleaningFee,
      security_deposit: securityDeposit,
      total_amount: total,
      deposit_amount: depositAmount,
      remaining_balance: total - depositAmount,
      full_payment_due_date: isWithin56Days
        ? new Date().toISOString()
        : addDays(parseISO(checkIn), -56).toISOString(),
      booking_status: "awaiting_decision",
      booking_type: "request",
      request_timestamp: new Date().toISOString(),
      decision_deadline: new Date(Date.now() + 86400000).toISOString(),
      guest_message: guestMessage,
      payment_link_id: crypto.randomUUID().slice(0, 8),
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    let hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  };

  if (propertyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0d9488]" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f5]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-[#1E3A5F]">Property not found</h2>
          <p className="text-gray-500">This property may no longer be available.</p>
        </div>
      </div>
    );
  }

  const photo = property.photos?.[0] || null;
  const priceBreakdown = getPriceBreakdown();
  const checkInFormatted = checkIn ? format(parseISO(checkIn), "EEE, MMM d, yyyy") : "—";
  const checkOutFormatted = checkOut ? format(parseISO(checkOut), "EEE, MMM d, yyyy") : "—";
  const checkInTime = property.check_in_time || "15:00";
  const checkOutTime = property.check_out_time || "10:00";
  const balanceDueDate = checkIn ? format(addDays(parseISO(checkIn), -56), "MMM d, yyyy") : "";
  const locationParts = [
    property.location?.locality,
    property.town !== property.postcode_district ? property.town : null,
    property.county,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      {/* Back arrow */}
      <div className="max-w-6xl mx-auto px-4 pt-5 pb-2">
        <Link
          to={backUrl}
          className="inline-flex items-center gap-1.5 text-[#1E3A5F] hover:text-[#0d9488] font-medium text-sm transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to property
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-16">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-6">Complete your reservation</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── LEFT COLUMN ── */}
          <div className="space-y-5 order-2 lg:order-1">

            {/* Property header card */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardContent className="p-0">
                {photo && (
                  <div className="h-48 overflow-hidden">
                    <img src={photo} alt={property.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <h2 className="font-bold text-[#1E3A5F] text-lg leading-snug">{property.title}</h2>
                  {locationParts.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{locationParts.join(", ")}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stay details */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-[#1E3A5F] text-base">Your stay</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-[#f4f4f5] rounded-lg p-3">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Check-in</p>
                    <p className="font-semibold text-gray-900">{checkInFormatted}</p>
                    <p className="text-[#0d9488] text-xs mt-0.5">From {formatTime(checkInTime)}</p>
                  </div>
                  <div className="bg-[#f4f4f5] rounded-lg p-3">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Check-out</p>
                    <p className="font-semibold text-gray-900">{checkOutFormatted}</p>
                    <p className="text-[#0d9488] text-xs mt-0.5">By {formatTime(checkOutTime)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 pt-1">
                  <span className="bg-[#f4f4f5] px-3 py-1.5 rounded-lg font-medium text-gray-900">
                    {numNights} night{numNights !== 1 ? "s" : ""}
                  </span>
                  <span className="bg-[#f4f4f5] px-3 py-1.5 rounded-lg font-medium text-gray-900">
                    {adults + childrenAges.length} guest{adults + childrenAges.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Price breakdown */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-semibold text-[#1E3A5F] text-base mb-4">Price breakdown</h3>

                {isWithin56Days && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg border border-teal-200 bg-teal-50 mb-4">
                    <Info className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-teal-800">
                      <strong>Full payment required.</strong> Your check-in is within 56 days, so the full amount is due now to secure this booking.
                    </p>
                  </div>
                )}

                <div className="space-y-2.5">
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
                      <span>
                        Security deposit{" "}
                        <span className="text-xs text-gray-400">(Refundable 48h after checkout)</span>
                      </span>
                      <span>£{securityDeposit.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-3 mt-2 flex justify-between font-bold text-gray-900 text-base">
                    <span>Total</span>
                    <span>£{total.toFixed(2)}</span>
                  </div>

                  {isWithin56Days ? (
                    <div className="border-t border-gray-100 pt-3 flex justify-between text-sm font-semibold text-[#0d9488]">
                      <span>Full payment due now</span>
                      <span>£{total.toFixed(2)}</span>
                    </div>
                  ) : depositAmount > 0 ? (
                    <>
                      <div className="border-t border-gray-100 pt-3 flex justify-between text-sm font-semibold text-[#0d9488]">
                        <span>Deposit due now</span>
                        <span>£{depositAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Remaining balance</span>
                        <span>£{(total - depositAmount).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Balance due by {balanceDueDate} (56 days before check-in)
                      </p>
                    </>
                  ) : (
                    <div className="border-t border-gray-100 pt-3 flex justify-between text-sm font-semibold text-[#0d9488]">
                      <span>Amount due now</span>
                      <span>£{total.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cancellation policy */}
            {cancellationPolicy && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-[#1E3A5F] text-base mb-2">Cancellation policy</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{cancellationPolicy.description}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="order-1 lg:order-2">
            <Card className="border-0 shadow-sm sticky top-6">
              <CardContent className="p-6 space-y-5">
                <h3 className="font-semibold text-[#1E3A5F] text-base">Your details</h3>

                {/* Full name */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Your full name"
                    value={guestName}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      setErrors((prev) => ({ ...prev, guestName: null }));
                    }}
                    className={`h-11 ${errors.guestName ? "border-red-500 focus-visible:ring-red-300" : "focus-visible:ring-[#0d9488]/30 border-gray-200"}`}
                  />
                  {errors.guestName && <p className="text-xs text-red-500 mt-1">{errors.guestName}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Email address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={guestEmail}
                    onChange={(e) => {
                      setGuestEmail(e.target.value);
                      setErrors((prev) => ({ ...prev, guestEmail: null }));
                    }}
                    className={`h-11 ${errors.guestEmail ? "border-red-500 focus-visible:ring-red-300" : "focus-visible:ring-[#0d9488]/30 border-gray-200"}`}
                  />
                  {errors.guestEmail && <p className="text-xs text-red-500 mt-1">{errors.guestEmail}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Phone number <span className="text-gray-400 text-xs font-normal">(optional)</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder="+44 7700 000000"
                    value={guestPhone}
                    onChange={(e) => {
                      setGuestPhone(e.target.value);
                      setErrors((prev) => ({ ...prev, guestPhone: null }));
                    }}
                    className={`h-11 ${errors.guestPhone ? "border-red-500 focus-visible:ring-red-300" : "focus-visible:ring-[#0d9488]/30 border-gray-200"}`}
                  />
                  {errors.guestPhone && <p className="text-xs text-red-500 mt-1">{errors.guestPhone}</p>}
                </div>

                {/* Message to host */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Message to host <span className="text-gray-400 text-xs font-normal">(optional)</span>
                  </label>
                  <Textarea
                    placeholder="Tell the host about your trip, any special requirements..."
                    value={guestMessage}
                    onChange={(e) => setGuestMessage(e.target.value)}
                    className="min-h-[90px] resize-none focus-visible:ring-[#0d9488]/30 border-gray-200"
                  />
                </div>

                {/* Agreements */}
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="house-rules"
                      checked={agreedHouseRules}
                      onCheckedChange={(checked) => {
                        setAgreedHouseRules(!!checked);
                        setErrors((prev) => ({ ...prev, agreedHouseRules: null }));
                      }}
                      className="mt-0.5"
                    />
                    <div>
                      <label htmlFor="house-rules" className="text-sm text-gray-700 cursor-pointer leading-snug">
                        I agree to the house rules
                      </label>
                      {errors.agreedHouseRules && (
                        <p className="text-xs text-red-500 mt-0.5">{errors.agreedHouseRules}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="cancellation"
                      checked={agreedCancellation}
                      onCheckedChange={(checked) => {
                        setAgreedCancellation(!!checked);
                        setErrors((prev) => ({ ...prev, agreedCancellation: null }));
                      }}
                      className="mt-0.5"
                    />
                    <div>
                      <label htmlFor="cancellation" className="text-sm text-gray-700 cursor-pointer leading-snug">
                        I agree to the cancellation policy
                      </label>
                      {errors.agreedCancellation && (
                        <p className="text-xs text-red-500 mt-0.5">{errors.agreedCancellation}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={agreedTerms}
                      onCheckedChange={(checked) => {
                        setAgreedTerms(!!checked);
                        setErrors((prev) => ({ ...prev, agreedTerms: null }));
                      }}
                      className="mt-0.5"
                    />
                    <div>
                      <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer leading-snug">
                        I agree to the{" "}
                        <Link
                          to="/LegalCentre"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0d9488] hover:underline font-medium"
                        >
                          terms & conditions
                        </Link>
                      </label>
                      {errors.agreedTerms && (
                        <p className="text-xs text-red-500 mt-0.5">{errors.agreedTerms}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Host stripe warning */}
                {bookingBlocked && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                    <span>This host hasn't verified their payment method yet. Booking is temporarily unavailable.</span>
                  </div>
                )}

                {/* Submit button */}
                <Button
                  onClick={handleSubmit}
                  disabled={!!bookingBlocked || bookingMutation.isPending}
                  className="w-full h-12 bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-full font-bold text-base tracking-wide disabled:opacity-50 transition-colors"
                >
                  {bookingMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    "Confirm and Pay"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}