import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import ReviewsDialog from "@/components/reviews/ReviewsDialog";

function SubRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="flex items-center gap-1 font-medium text-gray-900">
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        {Number(value).toFixed(1)}
      </span>
    </div>
  );
}

export default function HostPerformancePanel({ userId }) {
  const { data: reviews = [] } = useQuery({
    queryKey: ["host-received-reviews", userId],
    queryFn: () =>
      base44.entities.Review.filter({
        reviewee_id: userId,
        review_type: "guest_to_host",
      }),
    enabled: !!userId,
  });

  const now = new Date();
  const visible = reviews.filter(
    (r) =>
      r.both_reviewed ||
      (r.blind_until && new Date(r.blind_until) <= now)
  );

  const avg = (field) => {
    const vals = visible.map((r) => r[field]).filter(Boolean);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };

  const overall = avg("rating");
  const cleanliness = avg("cleanliness_rating");
  const communication = avg("communication_rating");
  const location = avg("location_rating");
  const value = avg("value_rating");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
    >
      <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
        Guest Reviews
      </h3>

      {/* Clickable star trigger */}
      <div className="mb-4">
        <ReviewsDialog
          revieweeId={userId}
          reviewType="guest_to_host"
          averageRating={overall ?? 0}
          reviewCount={visible.length}
          isPrivilegedViewer={true}
          emptyMessage="No guest reviews yet — reviews will appear once guests submit them."
        />
      </div>

      {visible.length > 0 && (
        <div className="space-y-1.5 border-t border-gray-50 pt-3">
          <SubRow label="Cleanliness" value={cleanliness} />
          <SubRow label="Communication" value={communication} />
          <SubRow label="Location" value={location} />
          <SubRow label="Value" value={value} />
        </div>
      )}

      {visible.length === 0 && (
        <p className="text-xs text-gray-400 italic mt-1">
          No guest reviews have been left yet.
        </p>
      )}
    </motion.div>
  );
}