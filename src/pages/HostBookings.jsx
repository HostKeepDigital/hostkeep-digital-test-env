import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Calendar, User, Mail, Phone, MessageSquare, Check, X, 
  Clock, PoundSterling, Copy, ExternalLink, Loader2, Star
} from "lucide-react";
import { format, parseISO, differenceInDays, isAfter, isBefore } from "date-fns";
import { toast } from "sonner";
import ReviewForm from "@/components/reviews/ReviewForm";

export default function HostBookings() {
  const [user, setUser] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, action: null, booking: null });
  const [reviewBooking, setReviewBooking] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['host-bookings', user?.id],
    queryFn: () => base44.entities.Booking.filter({ host_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['host-properties', user?.id],
    queryFn: () => base44.entities.Property.filter({ owner_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: existingReviews = [] } = useQuery({
    queryKey: ['host-reviews', user?.id],
    queryFn: () => base44.entities.Review.filter({ reviewer_id: user?.id, review_type: "host_to_guest" }),
    enabled: !!user?.id,
  });

  const hasReviewedGuest = (bookingId) => {
    return existingReviews.some(r => r.booking_id === bookingId);
  };

  const canReviewGuest = (booking) => {
    return ["checked_in", "completed"].includes(booking.booking_status) && !hasReviewedGuest(booking.id);
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-bookings'] });
      setActionDialog({ open: false, action: null, booking: null });
      toast.success("Booking updated successfully");
    },
  });

  const getProperty = (propertyId) => properties.find(p => p.id === propertyId);

  const statusColors = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    checked_in: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-gray-50 text-gray-700 border-gray-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
    declined: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const paymentColors = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    partial: "bg-orange-50 text-orange-700 border-orange-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    refunded: "bg-gray-50 text-gray-700 border-gray-200",
  };

  const today = new Date();
  const pendingBookings = bookings.filter(b => b.booking_status === 'pending');
  const upcomingBookings = bookings.filter(b => 
    b.booking_status === 'confirmed' && isAfter(parseISO(b.check_in), today)
  );
  const activeBookings = bookings.filter(b => 
    b.booking_status === 'checked_in' || 
    (b.booking_status === 'confirmed' && isBefore(parseISO(b.check_in), today) && isAfter(parseISO(b.check_out), today))
  );
  const pastBookings = bookings.filter(b => 
    b.booking_status === 'completed' || isBefore(parseISO(b.check_out), today)
  );

  const handleAction = (action) => {
    const booking = actionDialog.booking;
    let data = {};

    switch (action) {
      case 'confirm':
        data = { booking_status: 'confirmed' };
        break;
      case 'decline':
        data = { booking_status: 'declined' };
        break;
      case 'check_in':
        data = { booking_status: 'checked_in' };
        break;
      case 'complete':
        data = { booking_status: 'completed' };
        break;
      case 'cancel':
        data = { booking_status: 'cancelled' };
        break;
    }

    updateMutation.mutate({ id: booking.id, data });
  };

  const copyPaymentLink = (booking) => {
    const link = `${window.location.origin}/Pay?id=${booking.payment_link_id}`;
    navigator.clipboard.writeText(link);
    toast.success("Payment link copied");
  };

  const BookingCard = ({ booking }) => {
    const property = getProperty(booking.property_id);
    const nights = differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in));

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-lg">
              {booking.guest_name?.charAt(0)?.toUpperCase() || "G"}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{booking.guest_name}</h3>
              <p className="text-sm text-gray-500">{property?.title || "Property"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusColors[booking.booking_status]}>
              {booking.booking_status?.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className={paymentColors[booking.payment_status]}>
              {booking.payment_status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div>
            <p className="text-gray-500">Check-in</p>
            <p className="font-medium">{format(parseISO(booking.check_in), "MMM d, yyyy")}</p>
          </div>
          <div>
            <p className="text-gray-500">Check-out</p>
            <p className="font-medium">{format(parseISO(booking.check_out), "MMM d, yyyy")}</p>
          </div>
          <div>
            <p className="text-gray-500">Guests</p>
            <p className="font-medium">{booking.guests_count || 1} guest(s)</p>
          </div>
          <div>
            <p className="text-gray-500">Total</p>
            <p className="font-semibold text-teal-600">£{booking.total_amount}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <a href={`mailto:${booking.guest_email}`} className="flex items-center gap-1 hover:text-teal-600">
              <Mail className="w-4 h-4" /> Email
            </a>
            {booking.guest_phone && (
              <a href={`tel:${booking.guest_phone}`} className="flex items-center gap-1 hover:text-teal-600">
                <Phone className="w-4 h-4" /> Call
              </a>
            )}
          </div>

          <div className="flex gap-2">
            {booking.booking_status === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActionDialog({ open: true, action: 'decline', booking })}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <X className="w-4 h-4 mr-1" /> Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => setActionDialog({ open: true, action: 'confirm', booking })}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="w-4 h-4 mr-1" /> Confirm
                </Button>
              </>
            )}
            {booking.booking_status === 'confirmed' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyPaymentLink(booking)}
                >
                  <Copy className="w-4 h-4 mr-1" /> Payment Link
                </Button>
                <Button
                  size="sm"
                  onClick={() => setActionDialog({ open: true, action: 'check_in', booking })}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Check In
                </Button>
              </>
            )}
            {booking.booking_status === 'checked_in' && (
              <>
                <Button
                  size="sm"
                  onClick={() => setActionDialog({ open: true, action: 'complete', booking })}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Complete Stay
                </Button>
                {canReviewGuest(booking) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReviewBooking(booking)}
                  >
                    <Star className="w-4 h-4 mr-1" /> Review Guest
                  </Button>
                )}
              </>
            )}
            {booking.booking_status === 'completed' && canReviewGuest(booking) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReviewBooking(booking)}
              >
                <Star className="w-4 h-4 mr-1" /> Review Guest
              </Button>
            )}
            {hasReviewedGuest(booking.id) && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                <Star className="w-3 h-3 mr-1 fill-emerald-600" /> Reviewed
              </Badge>
            )}
          </div>
        </div>

        {booking.guest_message && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
            <p className="text-gray-500 mb-1">Guest message:</p>
            <p className="text-gray-700">{booking.guest_message}</p>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bookings</h1>
            <p className="text-gray-500">Manage your guest bookings</p>
          </div>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-white border border-gray-100">
            <TabsTrigger value="pending" className="gap-2">
              Pending
              {pendingBookings.length > 0 && (
                <Badge className="bg-amber-500">{pendingBookings.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeBookings.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingBookings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No pending booking requests</p>
              </div>
            ) : (
              pendingBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No upcoming bookings</p>
              </div>
            ) : (
              upcomingBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {activeBookings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No guests currently staying</p>
              </div>
            ) : (
              activeBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastBookings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No past bookings yet</p>
              </div>
            ) : (
              pastBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Action Confirmation Dialog */}
        <AlertDialog 
          open={actionDialog.open} 
          onOpenChange={(open) => !open && setActionDialog({ open: false, action: null, booking: null })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionDialog.action === 'confirm' && "Confirm Booking"}
                {actionDialog.action === 'decline' && "Decline Booking"}
                {actionDialog.action === 'check_in' && "Check In Guest"}
                {actionDialog.action === 'complete' && "Complete Stay"}
                {actionDialog.action === 'cancel' && "Cancel Booking"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionDialog.action === 'confirm' && "Are you sure you want to confirm this booking? The guest will be notified."}
                {actionDialog.action === 'decline' && "Are you sure you want to decline this booking request?"}
                {actionDialog.action === 'check_in' && "Mark this guest as checked in?"}
                {actionDialog.action === 'complete' && "Mark this stay as completed?"}
                {actionDialog.action === 'cancel' && "Are you sure you want to cancel this booking?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleAction(actionDialog.action)}
                className={actionDialog.action === 'decline' || actionDialog.action === 'cancel' 
                  ? "bg-rose-600 hover:bg-rose-700" 
                  : "bg-teal-600 hover:bg-teal-700"}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Confirm"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Review Guest Dialog */}
        {reviewBooking && (
          <ReviewForm
            open={!!reviewBooking}
            onOpenChange={(open) => !open && setReviewBooking(null)}
            booking={reviewBooking}
            reviewType="host_to_guest"
            reviewerName={user?.full_name}
            reviewerId={user?.id}
          />
        )}
      </div>
    </div>
  );
}