import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, MapPin, Star, Loader2, Heart, Bed, Users, X
} from "lucide-react";
import { format, parseISO, isBefore, isAfter } from "date-fns";
import ReviewForm from "@/components/reviews/ReviewForm";
import RaiseQuestionModal from "@/components/messaging/RaiseQuestionModal";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function MyTrips() {
  const [user, setUser] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [questionBooking, setQuestionBooking] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['guest-bookings', user?.email],
    queryFn: () => base44.entities.Booking.filter({ guest_email: user?.email }),
    enabled: !!user?.email,
  });

  // Fetch wishlisted properties
  const { data: wishlistItems = [], isLoading: wishlistLoading } = useQuery({
    queryKey: ['wishlist-properties', user?.id],
    queryFn: () => base44.entities.WishlistProperty.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  // Fetch all relevant properties
  const propertyIds = [
    ...bookings.map(b => b.property_id),
    ...wishlistItems.map(s => s.property_id)
  ];
  
  const { data: properties = [] } = useQuery({
    queryKey: ['properties-for-trips'],
    queryFn: () => base44.entities.Property.list(),
    enabled: propertyIds.length > 0,
  });

  const { data: existingReviews = [] } = useQuery({
    queryKey: ['my-reviews', user?.id],
    queryFn: () => base44.entities.Review.filter({ reviewer_id: user?.id }),
    enabled: !!user?.id,
  });

  // Remove from wishlist mutation
  const removeFromWishlistMutation = useMutation({
    mutationFn: (wishlistItemId) => base44.entities.WishlistProperty.delete(wishlistItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-properties'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-status'] });
    },
  });

  const getProperty = (propertyId) => properties.find(p => p.id === propertyId);
  
  const hasReviewed = (bookingId) => {
    return existingReviews.some(r => r.booking_id === bookingId && r.review_type === "guest_to_host");
  };

  const canReview = (booking) => {
    return ["checked_in", "completed"].includes(booking.booking_status) && !hasReviewed(booking.id);
  };

  const statusColors = {
    awaiting_decision: "bg-amber-50 text-amber-700 border-amber-200",
    awaiting_payment: "bg-orange-50 text-orange-700 border-orange-200",
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    checked_in: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-gray-50 text-gray-700 border-gray-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
    declined: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const statusLabels = {
    awaiting_decision: "Pending",
    awaiting_payment: "Payment Due",
    confirmed: "Upcoming",
    checked_in: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    declined: "Declined",
  };

  const today = new Date();
  
  // Sort bookings: upcoming first, then past
  const sortedBookings = [...bookings].sort((a, b) => {
    const aCheckIn = parseISO(a.check_in);
    const bCheckIn = parseISO(b.check_in);
    const aIsUpcoming = isAfter(aCheckIn, today) || a.booking_status === "checked_in";
    const bIsUpcoming = isAfter(bCheckIn, today) || b.booking_status === "checked_in";
    
    if (aIsUpcoming && !bIsUpcoming) return -1;
    if (!aIsUpcoming && bIsUpcoming) return 1;
    
    // If both upcoming or both past, sort by check-in date
    return aIsUpcoming ? aCheckIn - bCheckIn : bCheckIn - aCheckIn;
  });

  // Determine default tab
  const upcomingCount = bookings.filter(b => 
    ["awaiting_decision", "awaiting_payment", "confirmed", "checked_in"].includes(b.booking_status) 
    && (isAfter(parseISO(b.check_in), today) || b.booking_status === "checked_in")
  ).length;

  const defaultTab = upcomingCount > 0 ? "bookings" : (wishlistItems.length > 0 ? "wishlist" : "bookings");

  const isLoading = bookingsLoading || wishlistLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const WishlistPropertyCard = ({ wishlistItem }) => {
    const property = getProperty(wishlistItem.property_id);
    if (!property) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <Card className="overflow-hidden hover:shadow-md transition-shadow group">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-56 h-40 sm:h-auto bg-gray-100 relative">
                <img
                  src={property.photos?.[0] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400"}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeFromWishlistMutation.mutate(wishlistItem.id);
                  }}
                  className="absolute top-3 right-3 bg-white/90 hover:bg-white p-2 rounded-full transition-colors"
                >
                  <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                </button>
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {property.title}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                      <MapPin className="w-3 h-3" />
                      {property.location?.town_city || property.location?.city}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {property.guest_capacity} guests
                  </span>
                  <span className="flex items-center gap-1">
                    <Bed className="w-4 h-4" />
                    {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-xl font-bold text-gray-900">£{property.nightly_rate}</span>
                  <span className="text-gray-500 text-sm">/ night</span>
                </div>

                <Link to={createPageUrl("PropertyDetails") + `?id=${property.id}`}>
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

  const BookingCard = ({ booking }) => {
    const property = getProperty(booking.property_id);
    const reviewed = hasReviewed(booking.id);
    const showReviewButton = canReview(booking);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-56 h-40 sm:h-auto bg-gray-100">
                <img
                  src={property?.photos?.[0] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400"}
                  alt={property?.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {property?.title || "Property"}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {property?.location?.town_city || property?.location?.city || "Location"}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusColors[booking.booking_status]}>
                    {statusLabels[booking.booking_status] || booking.booking_status}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(parseISO(booking.check_in), "MMM d")} - {format(parseISO(booking.check_out), "MMM d, yyyy")}
                  </span>
                  <span className="font-semibold text-teal-600">£{booking.total_amount}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={createPageUrl("PropertyDetails") + `?id=${booking.property_id}`}>
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
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                      <Star className="w-3 h-3 mr-1 fill-emerald-600" /> Reviewed
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
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Trips</h1>
          <p className="text-gray-500">View your bookings and wishlisted properties</p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="bg-white border border-gray-100">
            <TabsTrigger value="bookings" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">
              Bookings ({bookings.length})
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">
              Wishlist ({wishlistItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4">
            {sortedBookings.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16 bg-white rounded-xl border border-gray-100"
              >
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">You don't have any trips booked yet.</h3>
                <p className="text-gray-500 mb-6">Start exploring properties for your next adventure</p>
                <Link to={createPageUrl("Search")}>
                  <Button className="bg-teal-600 hover:bg-teal-700">Browse Properties</Button>
                </Link>
              </motion.div>
            ) : (
              sortedBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>

          <TabsContent value="wishlist" className="space-y-4">
            {wishlistItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16 bg-white rounded-xl border border-gray-100"
              >
                <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">You haven't wishlisted any properties yet.</h3>
                <p className="text-gray-500 mb-6">Wishlist properties you love to easily find them later</p>
                <Link to={createPageUrl("Search")}>
                  <Button className="bg-teal-600 hover:bg-teal-700">Browse Properties</Button>
                </Link>
              </motion.div>
            ) : (
              wishlistItems.map(wishlistItem => (
                <WishlistPropertyCard key={wishlistItem.id} wishlistItem={wishlistItem} />
              ))
            )}
          </TabsContent>
        </Tabs>

        {questionBooking && (
          <RaiseQuestionModal
            isOpen={!!questionBooking}
            onClose={() => setQuestionBooking(null)}
            booking={questionBooking}
            guestUser={user}
          />
        )}

        {/* Review Form Dialog */}
        {reviewBooking && (
          <ReviewForm
            open={!!reviewBooking}
            onOpenChange={(open) => !open && setReviewBooking(null)}
            booking={reviewBooking}
            reviewType="guest_to_host"
            reviewerName={user?.full_name}
            reviewerId={user?.id}
          />
        )}
      </div>
    </div>
  );
}