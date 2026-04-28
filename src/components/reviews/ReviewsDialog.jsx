import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Star, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

/**
 * ReviewsDialog
 *
 * Props:
 *   revieweeId       — the user whose reviews we're showing
 *   reviewType       — "guest_to_host" | "host_to_guest" | "host_to_cleaner" | "cleaner_to_host"
 *                      Pass null/undefined to show all received reviews.
 *   averageRating    — pre-computed average (optional, computed from reviews if not provided)
 *   reviewCount      — pre-computed count (optional)
 *   isPrivilegedViewer — host/cleaner/admin viewing: shows full reviewer name; false = show "J. Smith" style
 *   emptyMessage     — shown when no reviews exist
 *
 * Trigger: wrap children with this component OR use the built-in StarTrigger by not passing children.
 */

function obfuscateName(name) {
  if (!name) return "Anonymous";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + ".";
  return parts[0] + " " + parts[parts.length - 1].charAt(0).toUpperCase() + ".";
}

function StarDisplay({ value, size = "w-4 h-4" }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${size} ${s <= Math.round(value || 0) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}

function SubRatingRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between text-xs text-gray-500">
      <span>{label}</span>
      <span className="flex items-center gap-1 font-medium text-gray-700">
        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
        {Number(value).toFixed(1)}
      </span>
    </div>
  );
}

function ReviewCard({ review, isPrivilegedViewer, reviewType }) {
  const displayName = isPrivilegedViewer
    ? (review.reviewer_name || "Unknown")
    : obfuscateName(review.reviewer_name);

  const subRatings = {
    guest_to_host: [
      { label: "Cleanliness", field: "cleanliness_rating" },
      { label: "Communication", field: "communication_rating" },
      { label: "Location", field: "location_rating" },
      { label: "Value", field: "value_rating" },
    ],
    host_to_guest: [
      { label: "Communication", field: "communication_rating" },
      { label: "Respect for Property", field: "reliability_rating" },
    ],
    host_to_cleaner: [
      { label: "Cleaning Quality", field: "quality_rating" },
      { label: "Punctuality", field: "punctuality_rating" },
      { label: "Reliability", field: "reliability_rating" },
      { label: "Communication", field: "communication_rating" },
    ],
    cleaner_to_host: [
      { label: "Payment Promptness", field: "payment_promptness_rating" },
      { label: "Communication", field: "communication_rating" },
      { label: "Professionalism", field: "professionalism_rating" },
    ],
  };

  const relevantSubs = (reviewType ? subRatings[reviewType] : subRatings[review.review_type]) || [];
  const visibleSubs = relevantSubs.filter((s) => review[s.field]);

  return (
    <div className="border border-gray-100 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900 text-sm">{displayName}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {review.created_date ? format(new Date(review.created_date), "d MMM yyyy") : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <StarDisplay value={review.rating} size="w-3.5 h-3.5" />
          <span className="text-sm font-semibold text-gray-900 ml-1">{Number(review.rating).toFixed(1)}</span>
        </div>
      </div>

      {visibleSubs.length > 0 && (
        <div className="space-y-1 bg-gray-50 rounded-lg p-2.5">
          {visibleSubs.map((s) => (
            <SubRatingRow key={s.field} label={s.label} value={review[s.field]} />
          ))}
        </div>
      )}

      {review.comment && (
        <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
      )}
    </div>
  );
}

export default function ReviewsDialog({
  revieweeId,
  reviewType = null,
  averageRating,
  reviewCount,
  isPrivilegedViewer = false,
  emptyMessage = "No reviews yet",
  triggerClassName = "",
}) {
  const [open, setOpen] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews-dialog", revieweeId, reviewType],
    queryFn: async () => {
      const filter = { reviewee_id: revieweeId };
      if (reviewType) filter.review_type = reviewType;
      const all = await base44.entities.Review.filter(filter);
      // Only show revealed reviews
      const now = new Date();
      return all.filter(
        (r) => r.both_reviewed || (r.blind_until && new Date(r.blind_until) <= now)
      );
    },
    enabled: !!revieweeId && open,
  });

  const computedAvg = reviews.length > 0
    ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
    : 0;

  const displayAvg = averageRating ?? computedAvg;
  const displayCount = reviewCount ?? reviews.length;

  if (!revieweeId) return null;

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 group hover:opacity-80 transition-opacity ${triggerClassName}`}
        title="View reviews"
      >
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-4 h-4 transition-colors group-hover:scale-105 ${
              s <= Math.round(displayAvg)
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300"
            }`}
          />
        ))}
        {displayCount > 0 ? (
          <span className="text-sm text-gray-500 ml-1">
            {Number(displayAvg).toFixed(1)} ({displayCount})
          </span>
        ) : (
          <span className="text-sm text-gray-400 ml-1">No reviews yet</span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-teal-600" />
              Reviews
            </DialogTitle>
          </DialogHeader>

          {/* Summary bar */}
          {displayCount > 0 && (
            <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="text-4xl font-bold text-gray-900">
                {Number(displayAvg).toFixed(1)}
              </div>
              <div>
                <StarDisplay value={displayAvg} size="w-5 h-5" />
                <p className="text-xs text-gray-500 mt-1">
                  Based on {displayCount} review{displayCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}

          {/* Reviews list */}
          <div className="overflow-y-auto flex-1 space-y-3 pr-1 mt-1">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">{emptyMessage}</p>
              </div>
            ) : (
              reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  isPrivilegedViewer={isPrivilegedViewer}
                  reviewType={reviewType}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}