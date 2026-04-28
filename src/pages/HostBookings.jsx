import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  Calendar,
  CheckCircle,
  User,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  parseISO,
  isAfter,
  addHours,
  addDays,
} from "date-fns";
import { toast } from "sonner";
import BookingCard from "@/components/bookings/BookingCard";
import ReviewForm from "@/components/reviews/ReviewForm";
import DepositReturnTimer from "@/components/bookings/DepositReturnTimer";
import DamageClaimModal from "@/components/bookings/DamageClaimModal";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function HostBookings() {
  const { user, isAuthenticated } = useAuth(); // ← custom auth
  const [actionDialog, setActionDialog] = useState({
    open: false,
    action: null,
    booking: null,
  });
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewCleanerJob, setReviewCleanerJob] = useState(null);
  const [damageClaimBooking, setDamageClaimBooking] = useState(null);
  const queryClient = useQueryClient();

  // Load bookings
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["host-bookings", user?.id],
    queryFn: () => base44.entities.Booking.filter({ host_id: user?.id }),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Load properties
  const { data: properties = [] } = useQuery({
    queryKey: ["host-properties", user?.id],
    queryFn: () => base44.entities.Property.filter({ owner_id: user?.id }),
    enabled: !!user?.id,
  });

  // Load reviews (guest)
  const { data: existingReviews = [] } = useQuery({
    queryKey: ["host-reviews", user?.id],
    queryFn: () =>
      base44.entities.Review.filter({
        reviewer_id: user?.id,
        review_type: "host_to_guest",
      }),
    enabled: !!user?.id,
  });

  // Load cleaner reviews
  const { data: cleanerReviews = [] } = useQuery({
    queryKey: ["host-cleaner-reviews", user?.id],
    queryFn: () =>
      base44.entities.Review.filter({
        reviewer_id: user?.id,
        review_type: "host_to_cleaner",
      }),
    enabled: !!user?.id,
  });

  // Load completed cleaning jobs for all bookings
  const { data: cleaningJobs = [] } = useQuery({
    queryKey: ["host-cleaning-jobs", user?.id],
    queryFn: () => base44.entities.CleaningJob.filter({ host_id: user?.id, status: "completed" }),
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["host-bookings", user?.id] });
      const previous = queryClient.getQueryData(["host-bookings", user?.id]);
      queryClient.setQueryData(["host-bookings", user?.id], (old = []) =>
        old.map((b) => (b.id === id ? { ...b, ...data } : b))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["host-bookings", user?.id], context.previous);
      }
      toast.error("Failed to update booking");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["host-bookings"] });
      toast.success("Booking updated");
    },
  });

  const getProperty = (propertyId) =>
    properties.find((p) => p.id === propertyId);

  const hasReviewedGuest = (bookingId) =>
    existingReviews.some((r) => r.booking_id === bookingId);

  const canReviewGuest = (booking) => {
    if (hasReviewedGuest(booking.id)) return false;
    const checkoutDate = booking.check_out ? new Date(booking.check_out) : null;
    if (checkoutDate) {
      const deadline = new Date(checkoutDate);
      deadline.setDate(deadline.getDate() + 3);
      if (new Date() > deadline) return false;
    }
    return true;
  };

  const hasReviewedCleaner = (jobId) =>
    cleanerReviews.some((r) => r.job_id === jobId);

  const completedJobsForBooking = (bookingId) =>
    cleaningJobs.filter((j) => j.booking_id === bookingId);

  const today = new Date();

  // Categorize bookings
  const awaitingDecision = bookings
    .filter((b) => b.booking_status === "awaiting_decision")
    .sort(
      (a, b) =>
        new Date(a.request_timestamp) -
        new Date(b.request_timestamp)
    );

  const awaitingPayment = bookings.filter(
    (b) => b.booking_status === "awaiting_payment"
  );

  const confirmed = bookings.filter(
    (b) =>
      b.booking_status === "confirmed" &&
      isAfter(parseISO(b.check_in), today)
  );

  const checkedIn = bookings.filter(
    (b) =>
      b.booking_status === "checked_in" ||
      (b.booking_status === "confirmed" &&
        !isAfter(parseISO(b.check_in), today))
  );

  const completed = bookings.filter(
    (b) => b.booking_status === "completed"
  );

  const cancelled = bookings.filter((b) =>
    ["cancelled", "declined", "expired"].includes(
      b.booking_status
    )
  );

  // Detect competing requests
  const checkCompetingRequests = (booking) => {
    return awaitingDecision.filter(
      (b) =>
        b.id !== booking.id &&
        b.property_id === booking.property_id &&
        !(
          parseISO(b.check_out) <= parseISO(booking.check_in) ||
          parseISO(b.check_in) >= parseISO(booking.check_out)
        )
    ).length > 0;
  };

  // ACTION HANDLERS
  const handleAccept = (booking) => {
    const hasDeposit = booking.deposit_amount > 0;

    if (hasDeposit) {
      updateMutation.mutate({
        id: booking.id,
        data: {
          booking_status: "awaiting_payment",
          accepted_at: new Date().toISOString(),
          deposit_due_date: addHours(new Date(), 48).toISOString(),
        },
      });
    } else {
      updateMutation.mutate({
        id: booking.id,
        data: {
          booking_status: "confirmed",
          accepted_at: new Date().toISOString(),
          full_payment_due_date: addDays(
            parseISO(booking.check_in),
            -14
          ).toISOString(),
        },
      });
    }
  };

  const handleDecline = (booking) => {
    updateMutation.mutate({
      id: booking.id,
      data: { booking_status: "declined" },
    });
  };

  const handleCheckIn = (booking) => {
    updateMutation.mutate({
      id: booking.id,
      data: {
        booking_status: "checked_in",
        checked_in_at: new Date().toISOString(),
      },
    });
  };

  const handleConfirmCheckin = (booking) => {
    updateMutation.mutate({
      id: booking.id,
      data: {
        checkin_confirmed_at: new Date().toISOString(),
        booking_status: "checked_in",
      },
    });
    toast.success("Check-in confirmed — payment will be released to your account within 24 hours");
  };

  const handleComplete = (booking) => {
    updateMutation.mutate({
      id: booking.id,
      data: {
        booking_status: "completed",
        completed_at: new Date().toISOString(),
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Bookings
            </h1>
            <p className="text-gray-500">
              Manage your guest bookings with automated workflows
            </p>
          </div>
        </div>

        <Tabs defaultValue="awaiting_decision" className="space-y-6">
          {/* MOBILE TABS */}
          <div className="md:hidden relative">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1 px-1">
              Swipe to see more tabs →
            </p>

            <div className="overflow-x-auto -mx-4 px-4">
              <TabsList className="bg-white border border-gray-100 w-max">
                <TabsTrigger value="awaiting_decision" className="gap-1.5 text-xs whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  Decision
                  {awaitingDecision.length > 0 && (
                    <Badge className="bg-amber-500 text-[10px] px-1.5 py-0">
                      {awaitingDecision.length}
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger value="awaiting_payment" className="gap-1.5 text-xs whitespace-nowrap">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Payment
                  {awaitingPayment.length > 0 && (
                    <Badge className="bg-orange-500 text-[10px] px-1.5 py-0">
                      {awaitingPayment.length}
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger value="confirmed" className="text-xs whitespace-nowrap">
                  Confirmed ({confirmed.length})
                </TabsTrigger>

                <TabsTrigger value="checked_in" className="text-xs whitespace-nowrap">
                  In-Stay ({checkedIn.length})
                </TabsTrigger>

                <TabsTrigger value="completed" className="text-xs whitespace-nowrap">
                  Done ({completed.length})
                </TabsTrigger>

                <TabsTrigger value="cancelled" className="text-xs whitespace-nowrap">
                  Cancelled ({cancelled.length})
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* DESKTOP TABS */}
          <div className="hidden md:block">
            <TabsList className="bg-white border border-gray-100">
              <TabsTrigger value="awaiting_decision" className="gap-2">
                <Clock className="w-4 h-4" />
                Awaiting Decision
                {awaitingDecision.length > 0 && (
                  <Badge className="bg-amber-500">
                    {awaitingDecision.length}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger value="awaiting_payment" className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                Awaiting Payment
                {awaitingPayment.length > 0 && (
                  <Badge className="bg-orange-500">
                    {awaitingPayment.length}
                  </Badge>
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

          {/* AWAITING DECISION */}
          <TabsContent value="awaiting_decision" className="space-y-4">
            {awaitingDecision.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">
                  No booking requests awaiting your decision
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  First Come, First Served • 24-hour response window
                </p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900">
                    <strong>First Come, First Served:</strong> Requests are ordered by submission time. You have 24 hours to respond before they automatically expire.
                  </p>
                </div>

                {awaitingDecision.map((booking) => (
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

          {/* AWAITING PAYMENT */}
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
                    <strong>Deposit Window:</strong> Guests have 48 hours to pay their deposit. Bookings auto-cancel if deposit is not received in time.
                  </p>
                </div>

                {awaitingPayment.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    property={getProperty(booking.property_id)}
                  />
                ))}
              </>
            )}
          </TabsContent>

          {/* CONFIRMED */}
          <TabsContent value="confirmed" className="space-y-4">
            {confirmed.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No confirmed upcoming bookings</p>
              </div>
            ) : (
              confirmed.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  property={getProperty(booking.property_id)}
                  onCheckIn={handleCheckIn}
                  onConfirmCheckin={handleConfirmCheckin}
                />
              ))
            )}
          </TabsContent>

          {/* CHECKED IN */}
          <TabsContent value="checked_in" className="space-y-4">
            {checkedIn.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No guests currently staying</p>
              </div>
            ) : (
              checkedIn.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  property={getProperty(booking.property_id)}
                  onComplete={handleComplete}
                />
              ))
            )}
          </TabsContent>

          {/* COMPLETED */}
          <TabsContent value="completed" className="space-y-4">
            {completed.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No completed stays yet</p>
              </div>
            ) : (
              completed.map((booking) => (
                <motion.div key={booking.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {getProperty(booking.property_id)?.title || "Property"}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {booking.guest_name} • {format(parseISO(booking.check_in), "MMM d")} – {format(parseISO(booking.check_out), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Badge>Completed</Badge>
                      </div>

                      {booking.booking_status === "completed" && booking.deposit_status === "held" && (
                        <div className="space-y-3 pt-3 border-t border-gray-100">
                          <DepositReturnTimer
                            checkOutDate={booking.check_out}
                            depositFrozen={booking.deposit_frozen}
                          />

                          {!booking.deposit_frozen && (
                            <button
                              onClick={() => setDamageClaimBooking(booking)}
                              className="w-full px-4 py-3 border-2 border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors text-sm"
                            >
                              Raise a Damage Claim
                            </button>
                          )}

                          {booking.deposit_frozen && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <p className="text-sm text-amber-900 font-medium">
                                Damage claim submitted — under review
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {hasReviewedGuest(booking.id) ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                            Reviewed ✓
                          </span>
                        ) : canReviewGuest(booking) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReviewBooking(booking)}
                          >
                            Review Guest
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">Review window closed</span>
                        )}

                        {completedJobsForBooking(booking.id).map((job) =>
                          hasReviewedCleaner(job.id) ? (
                            <span
                              key={job.id}
                              className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200"
                            >
                              Cleaner Reviewed ✓
                            </span>
                          ) : (
                            <Button
                              key={job.id}
                              size="sm"
                              onClick={() => setReviewCleanerJob(job)}
                              className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
                            >
                              Review Cleaner
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* CANCELLED */}
          <TabsContent value="cancelled" className="space-y-4">
            {cancelled.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <XCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No cancelled bookings</p>
              </div>
            ) : (
              cancelled.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  property={getProperty(booking.property_id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* REVIEW GUEST DIALOG */}
        {reviewBooking && (
          <ReviewForm
            open={!!reviewBooking}
            onOpenChange={(open) => !open && setReviewBooking(null)}
            booking={reviewBooking}
            reviewType="host_to_guest"
            reviewerName={[user?.forename, user?.surname].filter(Boolean).join(" ") || user?.full_name}
            reviewerId={user?.id}
            />
            )}

            {/* REVIEW CLEANER DIALOG */}
        {reviewCleanerJob && (
          <ReviewForm
            open={!!reviewCleanerJob}
            onOpenChange={(open) => !open && setReviewCleanerJob(null)}
            job={reviewCleanerJob}
            reviewType="host_to_cleaner"
            reviewerName={[user?.forename, user?.surname].filter(Boolean).join(" ") || user?.full_name}
            reviewerId={user?.id}
            endDate={reviewCleanerJob.completed_at}
          />
        )}

        {/* DAMAGE CLAIM MODAL */}
        {damageClaimBooking && (
          <DamageClaimModal
            isOpen={!!damageClaimBooking}
            onClose={() => setDamageClaimBooking(null)}
            booking={damageClaimBooking}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ["host-bookings"] })}
          />
        )}
      </div>
    </div>
  );
}