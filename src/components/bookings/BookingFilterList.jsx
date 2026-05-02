import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import BookingCard from "@/components/bookings/BookingCard";
import DepositReturnTimer from "@/components/bookings/DepositReturnTimer";
import ReviewsDialog from "@/components/reviews/ReviewsDialog";

export default function BookingFilterList({
  bookings,
  isLoading,
  awaitingDecision,
  awaitingPayment,
  confirmed,
  checkedIn,
  completed,
  cancelled,
  getProperty,
  handleAccept,
  handleDecline,
  handleCheckIn,
  handleConfirmCheckin,
  handleComplete,
  checkCompetingRequests,
  hasReviewedGuest,
  canReviewGuest,
  hasReviewedCleaner,
  completedJobsForBooking,
  setReviewBooking,
  setReviewCleanerJob,
  setDamageClaimBooking,
}) {
  const [activeFilter, setActiveFilter] = useState("all");

  const actionCount = awaitingDecision.length + awaitingPayment.length;

  const filters = [
    { key: "all", label: "All", count: bookings.length },
    { key: "action", label: "Action needed", count: actionCount, urgent: true },
    { key: "upcoming", label: "Upcoming", count: confirmed.length },
    { key: "inStay", label: "In stay", count: checkedIn.length },
    { key: "completed", label: "Completed", count: completed.length },
    { key: "cancelled", label: "Cancelled", count: cancelled.length },
  ];

  const filteredBookings = (() => {
    const priority = [...awaitingDecision, ...awaitingPayment];
    const all = [...priority, ...confirmed, ...checkedIn, ...completed, ...cancelled];
    switch (activeFilter) {
      case "action": return priority;
      case "upcoming": return confirmed;
      case "inStay": return checkedIn;
      case "completed": return completed;
      case "cancelled": return cancelled;
      default: return all;
    }
  })();

  return (
    <div className="space-y-5">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              activeFilter === f.key
                ? f.urgent
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeFilter === f.key
                  ? "bg-white/20 text-white"
                  : f.urgent
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contextual notices */}
      {(activeFilter === "all" || activeFilter === "action") && awaitingDecision.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-900">
          <strong>First Come, First Served:</strong> Requests are ordered by submission time. You have 24 hours to respond before they automatically expire.
        </div>
      )}
      {(activeFilter === "all" || activeFilter === "action") && awaitingPayment.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-900">
          <strong>Deposit Window:</strong> Guests have 48 hours to pay their deposit or the booking auto-cancels.
        </div>
      )}

      {/* Booking list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">No bookings in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const isUrgent = ["awaiting_decision", "awaiting_payment"].includes(booking.booking_status);
            const isCompleted = booking.booking_status === "completed";

            return (
              <div
                key={booking.id}
                className={`relative bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
                  isUrgent
                    ? "border-l-4 border-l-amber-400 border-t-gray-100 border-r-gray-100 border-b-gray-100"
                    : "border-gray-100"
                }`}
              >
                {isUrgent && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {booking.booking_status === "awaiting_decision" ? "Response needed" : "Awaiting payment"}
                    </span>
                  </div>
                )}

                <div className="p-4">
                  <BookingCard
                    booking={booking}
                    property={getProperty(booking.property_id)}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    onCheckIn={handleCheckIn}
                    onConfirmCheckin={handleConfirmCheckin}
                    onComplete={handleComplete}
                    showCompetingBadge={
                      booking.booking_status === "awaiting_decision" &&
                      checkCompetingRequests(booking)
                    }
                  />

                  {/* Completed: deposit + damage claim */}
                  {isCompleted && booking.deposit_status === "held" && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      <DepositReturnTimer
                        checkOutDate={booking.check_out}
                        depositFrozen={booking.deposit_frozen}
                      />
                      {!booking.deposit_frozen && (
                        <button
                          onClick={() => setDamageClaimBooking(booking)}
                          className="w-full px-4 py-2.5 border-2 border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors text-sm"
                        >
                          Raise a Damage Claim
                        </button>
                      )}
                      {booking.deposit_frozen && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 font-medium">
                          Damage claim submitted — under review
                        </div>
                      )}
                    </div>
                  )}

                  {/* Completed: review actions */}
                  {isCompleted && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                      {booking.guest_id && (
                        <ReviewsDialog
                          revieweeId={booking.guest_id}
                          reviewType="host_to_guest"
                          isPrivilegedViewer={true}
                          emptyMessage="No reviews for this guest yet."
                        />
                      )}
                      {hasReviewedGuest(booking.id) ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                          Reviewed ✓
                        </span>
                      ) : canReviewGuest(booking) ? (
                        <Button variant="outline" size="sm" onClick={() => setReviewBooking(booking)}>
                          Review Guest
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400">Review window closed</span>
                      )}
                      {completedJobsForBooking(booking.id).map((job) =>
                        hasReviewedCleaner(job.id) ? (
                          <span key={job.id} className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                            Cleaner Reviewed ✓
                          </span>
                        ) : (
                          <Button
                            key={job.id}
                            size="sm"
                            onClick={() => setReviewCleanerJob(job)}
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            Review Cleaner
                          </Button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}