import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Star, User, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import ReviewsDialog from "@/components/reviews/ReviewsDialog";

function SubRow({ label, value }) {
  if (!value) return null;
  const pct = Math.min(100, (value / 5) * 100);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500 w-28 flex-shrink-0 text-xs">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-6 text-right">{Number(value).toFixed(1)}</span>
    </div>
  );
}

function ReviewTypeSection({ icon: Icon, label, reviews, subRatings, iconColor }) {
  if (reviews.length === 0) return (
    <div className="flex items-center gap-2 text-sm text-gray-400 py-1">
      <Icon className={`w-4 h-4 ${iconColor}`} />
      <span>{label}</span>
      <span className="ml-auto text-xs italic">No reviews yet</span>
    </div>
  );

  const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;

  const subAvgs = subRatings.map((s) => {
    const vals = reviews.map((r) => r[s.field]).filter(Boolean);
    return { ...s, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <div className="flex items-center gap-1 ml-auto">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-sm font-bold text-gray-900">{avg.toFixed(1)}</span>
          <span className="text-xs text-gray-400">({reviews.length})</span>
        </div>
      </div>
      <div className="space-y-1.5 pl-6">
        {subAvgs.filter((s) => s.avg).map((s) => (
          <SubRow key={s.field} label={s.label} value={s.avg} />
        ))}
      </div>
    </div>
  );
}

export default function HostPerformancePanel({ userId }) {
  const { data: allReviews = [] } = useQuery({
    queryKey: ["host-received-reviews", userId],
    queryFn: async () => {
      const all = await base44.entities.Review.filter({ reviewee_id: userId });
      const now = new Date();
      return all.filter(
        (r) => r.both_reviewed || (r.blind_until && new Date(r.blind_until) <= now)
      );
    },
    enabled: !!userId,
  });

  const guestReviews = allReviews.filter((r) => r.review_type === "guest_to_host");
  const cleanerReviews = allReviews.filter((r) => r.review_type === "cleaner_to_host");
  const totalCount = allReviews.length;

  const overallAvg = totalCount > 0
    ? allReviews.reduce((s, r) => s + (r.rating || 0), 0) / totalCount
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4"
    >
      {/* Header with clickable trigger */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          My Reviews
        </h3>
        {totalCount > 0 && (
          <span className="text-xs text-gray-400">{totalCount} total</span>
        )}
      </div>

      {/* Clickable star summary — opens full dialog with tabs */}
      <ReviewsDialog
        revieweeId={userId}
        showBothTypes={true}
        averageRating={overallAvg}
        reviewCount={totalCount}
        isPrivilegedViewer={true}
        emptyMessage="No reviews yet"
      />

      {/* Inline breakdown */}
      {totalCount > 0 ? (
        <div className="space-y-4 pt-1">
          <ReviewTypeSection
            icon={User}
            label="From Guests"
            iconColor="text-teal-600"
            reviews={guestReviews}
            subRatings={[
              { label: "Cleanliness",   field: "cleanliness_rating" },
              { label: "Communication", field: "communication_rating" },
              { label: "Location",      field: "location_rating" },
              { label: "Value",         field: "value_rating" },
            ]}
          />

          {(cleanerReviews.length > 0 || true) && (
            <div className="border-t border-gray-100 pt-4">
              <ReviewTypeSection
                icon={Sparkles}
                label="From Cleaners"
                iconColor="text-blue-500"
                reviews={cleanerReviews}
                subRatings={[
                  { label: "Payment",        field: "payment_promptness_rating" },
                  { label: "Communication",  field: "communication_rating" },
                  { label: "Professionalism",field: "professionalism_rating" },
                  { label: "Instructions",   field: "reliability_rating" },
                ]}
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">
          Reviews appear here once guests or cleaners have submitted them.
        </p>
      )}
    </motion.div>
  );
}