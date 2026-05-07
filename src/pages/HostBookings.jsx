import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { notifyBookingEvent } from "@/lib/notificationHelpers";
import { notifyBookingEvent } from "@/lib/notificationHelpers";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
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
import BookingFilterList from "@/components/bookings/BookingFilterList";
import ReviewForm from "@/components/reviews/ReviewForm";
import ReviewsDialog from "@/components/reviews/ReviewsDialog";
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
      updateMutation.mutate(
        { id: booking.id, data: { booking_status: "awaiting_payment", accepted_at: new Date().toISOString(), deposit_due_date: addHours(new Date(), 48).toISOString() } },
        { onSuccess: () => notifyBookingEvent(booking.id, "awaiting_payment") }
      );
    } else {
      updateMutation.mutate(
        { id: booking.id, data: { booking_status: "confirmed", accepted_at: new Date().toISOString(), full_payment_due_date: addDays(parseISO(booking.check_in), -14).toISOString() } },
        { onSuccess: () => notifyBookingEvent(booking.id, "confirmed") }
      );
    }
  };

  const handleDecline = (booking) => {
    updateMutation.mutate(
      { id: booking.id, data: { booking_status: "declined" } },
      { onSuccess: () => notifyBookingEvent(booking.id, "declined") }
    );
  };

  const handleCheckIn = (booking) => {
    updateMutation.mutate(
      { id: booking.id, data: { booking_status: "checked_in", checked_in_at: new Date().toISOString() } },
      { onSuccess: () => notifyBookingEvent(booking.id, "checked_in") }
    );
  };

  const handleConfirmCheckin = (booking) => {
    updateMutation.mutate(
      { id: booking.id, data: { checkin_confirmed_at: new Date().toISOString(), booking_status: "checked_in" } },
      { onSuccess: () => notifyBookingEvent(booking.id, "checked_in") }
    );
    toast.success("Check-in confirmed — payment will be released to your account within 24 hours");
  };

  const handleComplete = (booking) => {
    updateMutation.mutate(
      { id: booking.id, data: { booking_status: "completed", completed_at: new Date().toISOString() } },
      { onSuccess: () => notifyBookingEvent(booking.id, "completed") }
    );
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

        <BookingFilterList
          bookings={bookings}
          isLoading={isLoading}
          awaitingDecision={awaitingDecision}
          awaitingPayment={awaitingPayment}
          confirmed={confirmed}
          checkedIn={checkedIn}
          completed={completed}
          cancelled={cancelled}
          getProperty={getProperty}
          handleAccept={handleAccept}
          handleDecline={handleDecline}
          handleCheckIn={handleCheckIn}
          handleConfirmCheckin={handleConfirmCheckin}
          handleComplete={handleComplete}
          checkCompetingRequests={checkCompetingRequests}
          hasReviewedGuest={hasReviewedGuest}
          canReviewGuest={canReviewGuest}
          hasReviewedCleaner={hasReviewedCleaner}
          completedJobsForBooking={completedJobsForBooking}
          setReviewBooking={setReviewBooking}
          setReviewCleanerJob={setReviewCleanerJob}
          setDamageClaimBooking={setDamageClaimBooking}
        />

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