import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, MapPin, Star, MessageSquare, Loader2, Home
} from "lucide-react";
import { format, parseISO, isBefore, isAfter } from "date-fns";
import ReviewForm from "@/components/reviews/ReviewForm";

export default function MyBookings() {
  const [user, setUser] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['guest-bookings', user?.email],
    queryFn: () => base44.entities.Booking.filter({ guest_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['booked-properties'],
    queryFn: () => base44.entities.Property.list(),
    enabled: bookings.length > 0,
  });

  const { data: existingReviews = [] } = useQuery({
    queryKey: ['my-reviews', user?.id],
    queryFn: () => base44.entities.Review.filter({ reviewer_id: user?.id }),
    enabled: !!user?.id,
  });

  const getProperty = (propertyId) => properties.find(p => p.id === propertyId);
  
  const hasReviewed = (bookingId) => {
    return existingReviews.some(r => r.booking_id === bookingId && r.review_type === "guest_to_host");
  };

  const canReview = (booking) => {
    // Can only review if checked_in or completed
    return ["checked_in", "completed"].includes(booking.booking_status) && !hasReviewed(booking.id);
  };

  const statusColors = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    checked_in: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-gray-50 text-gray-700 border-gray-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
    declined: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const today = new Date();
  const upcomingBookings = bookings.filter(b => 
    ["pending", "confirmed"].includes(b.booking_status) && isAfter(parseISO(b.check_in), today)
  );
  const activeBookings = bookings.filter(b => 
    b.booking_status === "checked_in"
  );
  const pastBookings = bookings.filter(b => 
    b.booking_status === "completed" || 
    (["confirmed", "checked_in"].includes(b.booking_status) && isBefore(parseISO(b.check_out), today))
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

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
              <div className="sm:w-48 h-32 sm:h-auto bg-gray-100">
                <img
                  src={property?.photos?.[0] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400"}
                  alt={property?.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {property?.title || "Property"}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {property?.location?.city || "Location"}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusColors[booking.booking_status]}>
                    {booking.booking_status?.replace("_", " ")}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(parseISO(booking.check_in), "MMM d")} - {format(parseISO(booking.check_out), "MMM d, yyyy")}
                  </span>
                  <span className="font-semibold text-teal-600">£{booking.total_amount}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Link to={createPageUrl("PropertyDetails") + `?id=${booking.property_id}`}>
                    <Button variant="outline" size="sm">
                      View Property
                    </Button>
                  </Link>
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-500">View and manage your trips</p>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <Home className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-500 mb-6">Start exploring properties for your next trip</p>
            <Link to={createPageUrl("Search")}>
              <Button className="bg-teal-600 hover:bg-teal-700">Browse Properties</Button>
            </Link>
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="bg-white border border-gray-100">
              <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({activeBookings.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No upcoming trips</p>
                </div>
              ) : (
                upcomingBookings.map(booking => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              {activeBookings.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                  <Home className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No active stays</p>
                </div>
              ) : (
                activeBookings.map(booking => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {pastBookings.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No past trips yet</p>
                </div>
              ) : (
                pastBookings.map(booking => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              )}
            </TabsContent>
          </Tabs>
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