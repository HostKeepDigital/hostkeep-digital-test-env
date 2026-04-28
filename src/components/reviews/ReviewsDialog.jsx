import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Star, MessageSquare, User, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

// ── helpers ──────────────────────────────────────────────────────────────────

function obfuscateName(name) {
  if (!name) return "Anonymous";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + ".";
  return parts[0] + " " + parts[parts.length - 1].charAt(0).toUpperCase() + ".";
}

function StarRow({ value, size = "w-4 h-4" }) {
  const rounded = Math.round(value || 0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${size} ${s <= rounded ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}

// Rating bar (like Airbnb/Trustpilot)
function RatingBar({ label, value, max = 5 }) {
  if (!value) return null;
  const pct = Math.min(100, ((value / max) * 100));
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-600 w-36 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-gray-700 font-medium w-6 text-right">{Number(value).toFixed(1)}</span>
    </div>
  );
}

// Sub-rating config per review type
const SUB_RATINGS = {
  guest_to_host: [
    { label: "Cleanliness",     field: "cleanliness_rating" },
    { label: "Communication",   field: "communication_rating" },
    { label: "Location",        field: "location_rating" },
    { label: "Value for money", field: "value_rating" },
  ],
  host_to_guest: [
    { label: "Communication",        field: "communication_rating" },
    { label: "Respect for property", field: "reliability_rating" },
  ],
  host_to_cleaner: [
    { label: "Cleaning quality", field: "quality_rating" },
    { label: "Punctuality",      field: "punctuality_rating" },
    { label: "Reliability",      field: "reliability_rating" },
    { label: "Communication",    field: "communication_rating" },
  ],
  cleaner_to_host: [
    { label: "Payment promptness", field: "payment_promptness_rating" },
    { label: "Communication",      field: "communication_rating" },
    { label: "Professionalism",    field: "professionalism_rating" },
    { label: "Instruction clarity", field: "reliability_rating" },
  ],
};

// ── Avatar initials ───────────────────────────────────────────────────────────
function Avatar({ name, size = "w-9 h-9" }) {
  const initials = name
    ? name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <div className={`${size} rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold text-xs flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── Single review card ────────────────────────────────────────────────────────
function ReviewCard({ review, isPrivilegedViewer }) {
  const displayName = isPrivilegedViewer
    ? (review.reviewer_name || "Unknown")
    : obfuscateName(review.reviewer_name);

  const subs = (SUB_RATINGS[review.review_type] || []).filter((s) => review[s.field]);

  const typeLabel = {
    guest_to_host: "Guest",
    host_to_guest: "Host",
    host_to_cleaner: "Host",
    cleaner_to_host: "Cleaner",
  }[review.review_type] || "";

  return (
    <div className="py-5 border-b border-gray-100 last:border-0">
      {/* Reviewer */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <Avatar name={displayName} />
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-tight">{displayName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRow value={review.rating} size="w-3.5 h-3.5" />
              <span className="text-xs text-gray-500">
                {review.created_date ? format(new Date(review.created_date), "MMM yyyy") : ""}
              </span>
            </div>
          </div>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5 flex-shrink-0">{typeLabel}</span>
      </div>

      {/* Written comment */}
      {review.comment && (
        <p className="text-sm text-gray-700 leading-relaxed mb-3">{review.comment}</p>
      )}

      {/* Sub-ratings */}
      {subs.length > 0 && (
        <div className="space-y-1.5 pt-2">
          {subs.map((s) => (
            <RatingBar key={s.field} label={s.label} value={review[s.field]} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Summary section (Airbnb-style) ────────────────────────────────────────────
function ReviewSummary({ reviews, reviewType }) {
  if (reviews.length === 0) return null;

  const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
  const subs = SUB_RATINGS[reviewType] || [];

  // Distribution counts
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  // Sub-averages
  const subAvgs = subs.map((s) => {
    const vals = reviews.map((r) => r[s.field]).filter(Boolean);
    return { ...s, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
  });

  return (
    <div className="bg-gray-50 rounded-2xl p-5 mb-4">
      <div className="flex gap-6 items-start">
        {/* Big number */}
        <div className="text-center flex-shrink-0">
          <div className="text-5xl font-bold text-gray-900 leading-none">{avg.toFixed(1)}</div>
          <StarRow value={avg} size="w-4 h-4" />
          <p className="text-xs text-gray-500 mt-1">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Bar chart */}
        <div className="flex-1 space-y-1.5 mt-1">
          {dist.map(({ star, count }) => {
            const pct = reviews.length ? (count / reviews.length) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-3 text-right">{star}</span>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-gray-400 w-4">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category averages */}
      {subAvgs.filter((s) => s.avg).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
          {subAvgs.filter((s) => s.avg).map((s) => (
            <RatingBar key={s.field} label={s.label} value={s.avg} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-white shadow-sm text-gray-900"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {count > 0 && (
        <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${active ? "bg-teal-100 text-teal-700" : "bg-gray-200 text-gray-500"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ReviewsDialog({
  revieweeId,
  reviewType = null,          // if set, show only this type (single-type mode)
  showBothTypes = false,      // if true, show guest + cleaner tabs (host profile mode)
  averageRating,
  reviewCount,
  isPrivilegedViewer = false,
  emptyMessage = "No reviews yet",
  triggerClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(reviewType || "guest_to_host");

  const { data: allReviews = [], isLoading } = useQuery({
    queryKey: ["reviews-dialog", revieweeId, showBothTypes, reviewType],
    queryFn: async () => {
      const filter = { reviewee_id: revieweeId };
      const all = await base44.entities.Review.filter(filter);
      const now = new Date();
      return all.filter(
        (r) => r.both_reviewed || (r.blind_until && new Date(r.blind_until) <= now)
      );
    },
    enabled: !!revieweeId && open,
  });

  const guestReviews = allReviews.filter((r) => r.review_type === "guest_to_host");
  const cleanerReviews = allReviews.filter((r) => r.review_type === "cleaner_to_host");

  // In single-type mode, filter by type
  const displayedReviews = showBothTypes
    ? (activeTab === "guest_to_host" ? guestReviews : cleanerReviews)
    : (reviewType ? allReviews.filter((r) => r.review_type === reviewType) : allReviews);

  const computedAvg = displayedReviews.length > 0
    ? displayedReviews.reduce((s, r) => s + (r.rating || 0), 0) / displayedReviews.length
    : 0;

  // For the trigger, show overall average
  const triggerReviews = reviewType
    ? allReviews.filter((r) => r.review_type === reviewType)
    : allReviews;
  const triggerAvg = averageRating ?? (triggerReviews.length > 0
    ? triggerReviews.reduce((s, r) => s + (r.rating || 0), 0) / triggerReviews.length
    : 0);
  const triggerCount = reviewCount ?? triggerReviews.length;

  if (!revieweeId) return null;

  const activeReviewType = showBothTypes ? activeTab : (reviewType || allReviews[0]?.review_type);

  return (
    <>
      {/* Clickable star trigger */}
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 group hover:opacity-80 transition-opacity ${triggerClassName}`}
        title="View reviews"
      >
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-4 h-4 group-hover:scale-105 transition-transform ${
              s <= Math.round(triggerAvg)
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300"
            }`}
          />
        ))}
        {triggerCount > 0 ? (
          <span className="text-sm text-gray-600 ml-0.5 underline underline-offset-2 decoration-dotted">
            {Number(triggerAvg).toFixed(1)} · {triggerCount} review{triggerCount !== 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-sm text-gray-400 ml-0.5">{emptyMessage}</span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-gray-100">
            <DialogTitle className="text-lg font-bold text-gray-900">Reviews</DialogTitle>
          </DialogHeader>

          {/* Tabs (only when showing both types) */}
          {showBothTypes && (
            <div className="px-6 pt-3 pb-2 bg-gray-50 flex gap-1">
              <Tab
                active={activeTab === "guest_to_host"}
                onClick={() => setActiveTab("guest_to_host")}
                icon={User}
                label="From Guests"
                count={guestReviews.length}
              />
              <Tab
                active={activeTab === "cleaner_to_host"}
                onClick={() => setActiveTab("cleaner_to_host")}
                icon={Sparkles}
                label="From Cleaners"
                count={cleanerReviews.length}
              />
            </div>
          )}

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-6 py-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                    <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                  </div>
                ))}
              </div>
            ) : displayedReviews.length === 0 ? (
              <div className="text-center py-16">
                <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No reviews yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  {activeTab === "cleaner_to_host"
                    ? "No cleaners have reviewed this host yet."
                    : "No guests have reviewed this host yet."}
                </p>
              </div>
            ) : (
              <>
                <ReviewSummary reviews={displayedReviews} reviewType={activeReviewType} />
                <div>
                  {displayedReviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      isPrivilegedViewer={isPrivilegedViewer}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}