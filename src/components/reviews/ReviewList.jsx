import { Star } from "lucide-react";
import ReviewCard from "./ReviewCard";

/**
 * ReviewList — renders a list of reviews using ReviewCard.
 *
 * Props:
 *   reviews        — array of Review records
 *   currentUserId  — the viewing user's ID
 *   isRecipient    — true if the viewer is the person being reviewed
 *                    (shows blind/hidden reviews with appropriate notices)
 */
export default function ReviewList({ reviews = [], currentUserId, isRecipient = false }) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
        <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500">No reviews yet</p>
        <p className="text-sm text-gray-400 mt-1">Reviews will appear here after completed stays or jobs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          currentUserId={currentUserId}
          isRecipient={isRecipient}
        />
      ))}
    </div>
  );
}