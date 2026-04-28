import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

function StarRow({ label, value }) {
  if (!value) return null;
  const rounded = Math.round(value * 10) / 10;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="flex items-center gap-1 font-medium text-gray-900">
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        {rounded.toFixed(1)}
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

  // Only count visible reviews where blind period has passed OR both reviewed
  const now = new Date();
  const visible = reviews.filter(
    (r) =>
      r.both_reviewed ||
      (r.blind_until && new Date(r.blind_until) <= now)
  );

  if (visible.length === 0) return null;

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

      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl font-bold text-gray-900">
          {overall?.toFixed(1)}
        </div>
        <div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-4 h-4 ${
                  s <= Math.round(overall || 0)
                    ? "fill-amber-400 text-amber-400"
                    : "text-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {visible.length} review{visible.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <StarRow label="Cleanliness" value={cleanliness} />
        <StarRow label="Communication" value={communication} />
        <StarRow label="Location" value={location} />
        <StarRow label="Value" value={value} />
      </div>
    </motion.div>
  );
}