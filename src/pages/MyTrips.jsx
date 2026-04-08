import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  MapPin,
  Star,
  Loader2,
  Heart,
  Bed,
  Users,
  X,
  MessageSquare,
  AlertCircle,
  Clock
} from "lucide-react";
import {
  format,
  parseISO,
  isBefore,
  isAfter
} from "date-fns";
import ReviewForm from "@/components/reviews/ReviewForm";
import RaiseQuestionModal from "@/components/messaging/RaiseQuestionModal";
import CancelBookingModal from "@/components/bookings/CancelBookingModal";
import RentalPaymentTimer from "@/components/bookings/RentalPaymentTimer";
import CheckInLogModal from "@/components/bookings/CheckInLogModal";
import ComplaintModal from "@/components/bookings/ComplaintModal";
import BalancePaymentAlert from "@/components/bookings/BalancePaymentAlert";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/AuthContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

export default function MyTrips() {
  const { user, isAuthenticated } = useAuth(); // ← custom auth
  const { refreshing } = usePullToRefresh([
    ["guest-bookings"],
    ["wishlist-properties"],
    ["properties-for-trips"],
    ["my-reviews"],
  ]);

  const [reviewBooking, setReviewBooking] = useState(null);
  const [questionBooking, setQuestionBooking] = useState(null);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [checkInBooking, setCheckInBooking] = useState(null);
  const [complaintBooking, setComplaintBooking] = useState(null);
  const [balancePaymentBooking, setBalancePaymentBooking] = useState(null);

  const queryClient = useQueryClient();

  // Fetch bookings (by email + by guest_id)
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["guest-bookings", user?.email, user?.id],
    queryFn: async () => {
      if (!user) return [];

      const byEmail = user.email
        ? await base44.entities.Booking.filter(
            { guest_email: user.email },
            "-created_date",
            100
          )
        : [];

      const byId = user.id
        ? await base44.entities.Booking.filter(
            { guest_id: user.id },
            "-created_date",
            100
          )
        : [];

      // Merge + dedupe
      const all = [...byEmail, ...byId];
      return Array.from(new Map(all.map((b) => [b.id, b])).values());
    },
    enabled: !!user
  });

  // Wishlist
  const { data: wishlistItems = [], isLoading: wishlistLoading } = useQuery({
    queryKey: ["wishlist-properties", user?.id],
    queryFn: () =>
      base44.entities.WishlistProperty.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  // Hydrate properties
  const propertyIds = [
    ...bookings.map((b) => b.property_id),
    ...wishlistItems.map((w) => w.property_id)
  ];

  const { data: properties = [] } = useQuery({
    queryKey: ["properties-for-trips", propertyIds.join(",")],
    queryFn: async () => {
      const uniqueIds = [...new Set(propertyIds)];
      if (uniqueIds.length === 0) return [];

      const results = await Promise.all(
        uniqueIds.map((id) =>
          base44.entities.Property.filter({ id })
        )
      );

      return results.map((r) => r[0]).filter(Boolean);
    },
    enabled: propertyIds.length > 0
  });

  // Reviews
  const { data: existingReviews = [] } = useQuery({
    queryKey: ["my-reviews", user?.id],
    queryFn: () =>
      base44.entities.Review.filter({ reviewer_id: user?.id }),
    enabled: !!user?.id
  });

  // Remove from wishlist
  const removeFromWishlistMutation = useMutation({
    mutationFn: (wishlistItemId) =>
      base44.entities.WishlistProperty.delete(wishlistItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-properties"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist-status"] });
    }
  });

  const getProperty = (id) =>
    properties.find((p) => p.id === id);

  const hasReviewed = (bookingId) =>
    existingReviews.some(
      (r) =>
        r.booking_id === bookingId &&
        r.review_type === "guest_to_host"
    );

  const canReview = (booking) =>
    ["checked_in", "completed"].includes(booking.booking_status) &&
    !hasReviewed(booking.id);

  const statusColors = {
    awaiting_decision: "bg-amber-50 text-amber-700 border-amber-200",
    awaiting_payment: "bg-orange-50 text-orange-700 border-orange-200",
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    checked_in: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-gray-50 text-gray-700 border-gray-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
    declined: "bg-rose-50 text-rose-700 border-rose-200"
  };

  const statusLabels = {
    awaiting_decision: "Pending",
    awaiting_payment: "Payment Due",
    confirmed: "Upcoming",
    checked_in: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    declined: "Declined"
  };

  const today = new Date();

  // Sort bookings
  const sortedBookings = [...bookings].sort((a, b) => {
    const aIn = parseISO(a.check_in);
    const bIn = parseISO(b.check_in);

    const aUpcoming =
      isAfter(aIn, today) || a.booking_status === "checked_in";
    const bUpcoming =
      isAfter(bIn, today) || b.booking_status === "checked_in";

    if (aUpcoming && !bUpcoming) return -1;
    if (!aUpcoming && bUpcoming) return 1;

    return aUpcoming ? aIn - bIn : bIn - aIn;
  });

  const upcomingCount = bookings.filter(
    (b) =>
      ["awaiting_decision", "awaiting_payment", "confirmed", "checked_in"].includes(
        b.booking_status
      ) &&
      (isAfter(parseISO(b.check_in), today) ||
        b.booking_status === "checked_in")
  ).length;

  const defaultTab =
    upcomingCount > 0
      ? "bookings"
      : wishlistItems.length > 0
      ? "wishlist"
      : "bookings";

  const isLoading = bookingsLoading || wishlistLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // --- WISHLIST CARD ---
  const WishlistPropertyCard = ({ wishlistItem }) => {
    const property = getProperty(wishlistItem.property_id);
    if (!property) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden hover:shadow-md transition-shadow group">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-56 h-40 bg-gray-100 relative">
                <img
                  src={
                    property.photos?.[0] ||
                    "https://lh3.googleusercontent.com/d/1Vr07gcaaC19XEmxcvTbq-DTn8PZKn-_a"
                  }
                  alt={property.title}
                  className="w-full h-full object-cover"
                />

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeFromWishlistMutation.mutate(wishlistItem.id);
                  }}
                  className="absolute top-3 right-3 bg-white/90 hover:bg-white p-2 rounded-full"
                >
                  <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                </button>
              </div>

              <div className="flex-1 p-4">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {property.title}
                </h3>

                <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" />
                  {property.location?.town_city ||
                    property.location?.city}
                </p>

                <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {property.guest_capacity} guests
                  </span>

                  <span className="flex items-center gap-1">
                    <Bed className="w-4 h-4" />
                    {property.bedrooms} bed
                    {property.bedrooms !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-xl font-bold text-gray-900">
                    £{property.nightly_rate}
                  </span>
                  <span className="text-gray-500 text-sm">/ night</span>
                </div>

                <Link
                  to={
                    createPageUrl("PropertyDetails") +
                    `?id=${property.id}`
                  }
                >
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                    View Property
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // --- BOOKING CARD ---
  const BookingCard = ({ booking }) => {
    const property = getProperty(booking.property_id);
    const reviewed = hasReviewed(booking.id);
    const showReviewButton = canReview(booking);

    const canCancel = [
      "awaiting_decision",
      "awaiting_payment",
      "confirmed"
    ].includes(booking.booking_status);

    const showPaymentTimer =
      (booking.booking_status === 'checked_in' ||
        booking.booking_status === 'confirmed') &&
      booking.rental_payment_status === 'held';

    const showCheckInLog =
      booking.booking_status === 'checked_in' &&
      !booking.guest_checkin_logged_at;

    const showComplaintButton =
      (booking.booking_status === 'checked_in' ||
        booking.booking_status === 'confirmed') &&
      booking.rental_payment_status === 'held' &&
      !booking.rental_frozen &&
      isBefore(new Date(), new Date(booking.rental_release_due_at));

    const showBalanceAlert =
      booking.balance_payment_status === 'failed' &&
      booking.booking_status !== 'cancelled';

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {showBalanceAlert && (
          <BalancePaymentAlert
            booking={booking}
            property={property}
            onPaymentSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["guest-bookings"] });
              setBalancePaymentBooking(null);
            }}
          />
        )}

        {booking.balance_payment_status === 'paid' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
            <span className="text-emerald-600 font-medium text-sm">✓ Balance paid</span>
          </div>
        )}

        <Card className="overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-56 h-40 bg-gray-100">
                <img
                  src={
                    property?.photos?.[0] ||
                    "https://lh3.googleusercontent.com/d/1Vr07gcaaC19XEmxcvTbq-DTn8PZKn-_a"
                  }
                  alt={property?.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {property?.title || "Property"}
                    </h3>

                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {property?.location?.town_city ||
                        property?.location?.city ||
                        "Location"}
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className={statusColors[booking.booking_status]}
                  >
                    {statusLabels[booking.booking_status]}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(parseISO(booking.check_in), "MMM d")} -{" "}
                    {format(parseISO(booking.check_out), "MMM d, yyyy")}
                  </span>

                  <span className="font-semibold text-teal-600">
                    £{booking.total_amount}
                  </span>
                </div>

                <div className="space-y-2">
                  {showPaymentTimer && (
                    <RentalPaymentTimer
                      releaseDueAt={booking.rental_release_due_at}
                      rentalFrozen={booking.rental_frozen}
                    />
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCancelBooking(booking)}
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                      >
                        Cancel
                      </Button>
                    )}

                    <Link
                      to={
                        createPageUrl("PropertyDetails") +
                        `?id=${booking.property_id}`
                      }
                    >
                      <Button variant="outline" size="sm">
                        Manage Booking
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuestionBooking(booking)}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" /> Message Host
                    </Button>

                    {showReviewButton && (
                      <Button
                        size="sm"
                        onClick={() => setReviewBooking(booking)}
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        <Star className="w-4 h-4 mr-1" /> Leave Review
                      </Button>
                    )}

                    {reviewed && (
                      <Badge
                        variant="outline"
                        className="text-emerald-600 border-emerald-200"
                      >
                        <Star className="w-3 h-3 mr-1 fill-emerald-600" />{" "}
                        Reviewed
                      </Badge>
                    )}
                  </div>

                  {booking.guest_checkin_logged_at ? (
                    <Badge
                      variant="outline"
                      className="text-emerald-600 border-emerald-200 w-full justify-center"
                    >
                      ✓ Check-in logged{' '}
                      {format(
                        parseISO(booking.guest_checkin_logged_at),
                        'MMM d, h:mm a'
                      )}
                    </Badge>
                  ) : showCheckInLog ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCheckInBooking(booking)}
                      className="w-full"
                    >
                      <Clock className="w-4 h-4 mr-1" /> Log my check-in time
                    </Button>
                  ) : null}

                  {showComplaintButton && !booking.rental_frozen && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setComplaintBooking(booking)}
                      className="text-red-600 border-red-200 hover:bg-red-50 w-full"
                    >
                      <AlertCircle className="w-4 h-4 mr-1" /> Raise a Complaint
                    </Button>
                  )}

                  {booking.rental_frozen && (
                    <Badge
                      variant="outline"
                      className="text-amber-600 border-amber-200 w-full justify-center"
                    >
                      Complaint submitted — under review
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
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
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            My Trips
          </h1>
          <p className="text-gray-500">
            View your bookings and wishlisted properties
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="bg-white border border-gray-100">
            <TabsTrigger
              value="bookings"
              className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700"
            >
              Bookings ({bookings.length})
            </TabsTrigger>

            <TabsTrigger
              value="wishlist"
              className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700"
            >
              Wishlist ({wishlistItems.length})
            </TabsTrigger>
          </TabsList>

          {/* BOOKINGS TAB */}
          <TabsContent value="bookings" className="space-y-4">
            {sortedBookings.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16 bg-white rounded-xl border border-gray-100"
              >
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  You don't have any trips booked yet.
                </h3>
                <p className="text-gray-500 mb-6">
                  Start exploring properties for your next adventure
                </p>
                <Link to={createPageUrl("Search")}>
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    Browse Properties
                  </Button>
                </Link>
              </motion.div>
            ) : (
              sortedBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>

          {/* WISHLIST TAB */}
          <TabsContent value="wishlist" className="space-y-4">
            {wishlistItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16 bg-white rounded-xl border border-gray-100"
              >
                <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  You haven't wishlisted any properties yet.
                </h3>
                <p className="text-gray-500 mb-6">
                  Wishlist properties you love to easily find them later
                </p>
                <Link to={createPageUrl("Search")}>
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    Browse Properties
                  </Button>
                </Link>
              </motion.div>
            ) : (
              wishlistItems.map((item) => (
                <WishlistPropertyCard key={item.id} wishlistItem={item} />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* MESSAGE HOST */}
        {questionBooking && (
          <RaiseQuestionModal
            isOpen={!!questionBooking}
            onClose={() => setQuestionBooking(null)}
            booking={questionBooking}
            guestUser={user}
          />
        )}

        {/* REVIEW FORM */}
        {reviewBooking && (
          <ReviewForm
            open={!!reviewBooking}
            onOpenChange={(open) =>
              !open && setReviewBooking(null)
            }
            booking={reviewBooking}
            reviewType="guest_to_host"
            reviewerName={user?.full_name}
            reviewerId={user?.id}
          />
        )}

        {/* CANCEL BOOKING */}
        {cancelBooking && (
          <CancelBookingModal
            booking={cancelBooking}
            open={!!cancelBooking}
            onOpenChange={(open) => !open && setCancelBooking(null)}
            user={user}
          />
        )}

        {/* CHECK-IN LOG */}
        {checkInBooking && (
          <CheckInLogModal
            isOpen={!!checkInBooking}
            onClose={() => setCheckInBooking(null)}
            booking={checkInBooking}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ["guest-bookings"] })}
          />
        )}

        {/* COMPLAINT */}
        {complaintBooking && (
          <ComplaintModal
            isOpen={!!complaintBooking}
            onClose={() => {
              setComplaintBooking(null);
              queryClient.invalidateQueries({ queryKey: ["guest-bookings"] });
            }}
            booking={complaintBooking}
          />
        )}
      </div>
    </div>
  );
}