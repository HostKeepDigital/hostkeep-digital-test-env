import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, Calendar, CheckCircle, User, XCircle, AlertTriangle } from "lucide-react";
import { parseISO, isAfter, isBefore, addHours, addDays, isSameDay } from "date-fns";
import { toast } from "sonner";
import BookingCard from "@/components/bookings/BookingCard";
import ReviewForm from "@/components/reviews/ReviewForm";

export default function HostBookings() {
  const [user, setUser] = useState(null);
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
    refetchInterval: 30000, // Refetch every 30 seconds for countdown timers
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-bookings'] });
      setActionDialog({ open: false, action: null, booking: null });
      toast.success("Booking updated successfully");
    },
  });

  const getProperty = (propertyId) => properties.find(p => p.id === propertyId);
  const hasReviewedGuest = (bookingId) => existingReviews.some(r => r.booking_id === bookingId);

  const today = new Date();

  // Categorize bookings by new statuses
  const awaitingDecision = bookings
    .filter(b => b.booking_status === 'awaiting_decision')
    .sort((a, b) => new Date(a.request_timestamp) - new Date(b.request_timestamp)); // First come, first served

  const awaitingPayment = bookings.filter(b => b.booking_status === 'awaiting_payment');

  const confirmed = bookings.filter(b => 
    b.booking_status === 'confirmed' && isAfter(parseISO(b.check_in), today)
  );

  const checkedIn = bookings.filter(b => 
    b.booking_status === 'checked_in' || 
    (b.booking_status === 'confirmed' && !isAfter(parseISO(b.check_in), today))
  );

  const completed = bookings.filter(b => b.booking_status === 'completed');

  const cancelled = bookings.filter(b => 
    ['cancelled', 'declined', 'expired'].includes(b.booking_status)
  );

  // Detect competing requests
  const checkCompetingRequests = (booking) => {
    return awaitingDecision.filter(b => 
      b.id !== booking.id &&
      b.property_id === booking.property_id &&
      !(parseISO(b.check_out) <= parseISO(booking.check_in) || 
        parseISO(b.check_in) >= parseISO(booking.check_out))
    ).length > 0;
  };

  const handleAccept = (booking) => {
    const hasDeposit = booking.deposit_amount > 0;
    
    if (hasDeposit) {
      // Move to awaiting_payment with 48-hour deadline
      updateMutation.mutate({
        id: booking.id,
        data: {
          booking_status: 'awaiting_payment',
          accepted_at: new Date().toISOString(),
          deposit_due_date: addHours(new Date(), 48).toISOString()
        }
      });
    } else {
      // Move directly to confirmed
      updateMutation.mutate({
        id: booking.id,
        data: {
          booking_status: 'confirmed',
          accepted_at: new Date().toISOString(),
          full_payment_due_date: addDays(parseISO(booking.check_in), -14).toISOString()
        }
      });
    }
  };

  const handleDecline = (booking) => {
    updateMutation.mutate({
      id: booking.id,
      data: { booking_status: 'declined' }
    });
  };

  const handleCheckIn = (booking) => {
    updateMutation.mutate({
      id: booking.id,
      data: { 
        booking_status: 'checked_in',
        checked_in_at: new Date().toISOString()
      }
    });
  };

  const handleComplete = (booking) => {
    updateMutation.mutate({
      id: booking.id,
      data: { 
        booking_status: 'completed',
        completed_at: new Date().toISOString()
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bookings</h1>
            <p className="text-gray-500">Manage your guest bookings with automated workflows</p>
          </div>
        </div>

        <Tabs defaultValue="awaiting_decision" className="space-y-6">
          {/* Mobile tabs */}
          <div className="md:hidden overflow-x-auto -mx-4 px-4">
            <TabsList className="bg-white border border-gray-100 w-max">
              <TabsTrigger value="awaiting_decision" className="gap-1.5 text-xs whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Decision
                {awaitingDecision.length > 0 && (
                  <Badge className="bg-amber-500 text-[10px] px-1.5 py-0">{awaitingDecision.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="awaiting_payment" className="gap-1.5 text-xs whitespace-nowrap">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Payment
                {awaitingPayment.length > 0 && (
                  <Badge className="bg-orange-500 text-[10px] px-1.5 py-0">{awaitingPayment.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="text-xs whitespace-nowrap">
                Confirmed <span className="ml-1 text-[10px] opacity-70">({confirmed.length})</span>
              </TabsTrigger>
              <TabsTrigger value="checked_in" className="text-xs whitespace-nowrap">
                In-Stay <span className="ml-1 text-[10px] opacity-70">({checkedIn.length})</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs whitespace-nowrap">
                Done <span className="ml-1 text-[10px] opacity-70">({completed.length})</span>
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs whitespace-nowrap">
                Cancelled <span className="ml-1 text-[10px] opacity-70">({cancelled.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>
          {/* Desktop tabs */}
          <div className="hidden md:block">
            <TabsList className="bg-white border border-gray-100">
              <TabsTrigger value="awaiting_decision" className="gap-2">
                <Clock className="w-4 h-4" />
                Awaiting Decision
                {awaitingDecision.length > 0 && (
                  <Badge className="bg-amber-500">{awaitingDecision.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="awaiting_payment" className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                Awaiting Payment
                {awaitingPayment.length > 0 && (
                  <Badge className="bg-orange-500">{awaitingPayment.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="confirmed">
                Confirmed ({confirmed.length})
              </TabsTrigger>
              <TabsTrigger value="checked_in">
                Checked In ({checkedIn.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completed.length})
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                Cancelled ({cancelled.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="awaiting_decision" className="space-y-4">
            {awaitingDecision.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No booking requests awaiting your decision</p>
                <p className="text-sm text-gray-400 mt-2">First Come, First Served • 24-hour response window</p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900">
                    <strong>First Come, First Served:</strong> Requests are ordered by submission time. 
                    You have 24 hours to respond before they automatically expire.
                  </p>
                </div>
                {awaitingDecision.map((booking, idx) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    property={getProperty(booking.property_id)}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    showCompetingBadge={checkCompetingRequests(booking)}
                  />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="awaiting_payment" className="space-y-4">
            {awaitingPayment.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No bookings awaiting payment</p>
              </div>
            ) : (
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-orange-900">
                    <strong>Deposit Window:</strong> Guests have 48 hours to pay their deposit. 
                    Bookings auto-cancel if deposit is not received in time.
                  </p>
                </div>
                {awaitingPayment.map(booking => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    property={getProperty(booking.property_id)}
                  />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="space-y-4">
            {confirmed.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No confirmed upcoming bookings</p>
              </div>
            ) : (
              confirmed.map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  property={getProperty(booking.property_id)}
                  onCheckIn={handleCheckIn}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="checked_in" className="space-y-4">
            {checkedIn.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No guests currently staying</p>
              </div>
            ) : (
              checkedIn.map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  property={getProperty(booking.property_id)}
                  onComplete={handleComplete}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completed.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No completed stays yet</p>
              </div>
            ) : (
              completed.map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  property={getProperty(booking.property_id)}
                  onReview={() => setReviewBooking(booking)}
                  hasReviewed={hasReviewedGuest(booking.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            {cancelled.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <XCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No cancelled bookings</p>
              </div>
            ) : (
              cancelled.map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  property={getProperty(booking.property_id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>

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