import { Star, MessageCircle, Clock, EyeOff, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export function StarDisplay({ rating, size = "w-4 h-4" }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${size} ${s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

function SubRatingRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <StarDisplay rating={value} size="w-3.5 h-3.5" />
    </div>
  );
}

export default function ReviewCard({ review, currentUserId, isRecipient = false }) {
  const [responding, setResponding] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [saving, setSaving] = useState(false);

  const isRevealed = review.both_reviewed || (review.blind_until && new Date() > new Date(review.blind_until));
  const isBlind = !isRevealed;

  // Recipient sees a "your review" card even if not yet revealed
  // Non-recipient (public) only sees revealed + public_visible reviews
  if (!isRecipient && (!isRevealed || !review.public_visible)) return null;

  const handleResponse = async () => {
    if (!responseText.trim()) return;
    setSaving(true);
    await base44.entities.Review.update(review.id, { host_response: responseText });
    toast.success("Response posted");
    setResponding(false);
    setSaving(false);
  };

  const typeLabel = {
    guest_to_host: "Guest Review",
    host_to_guest: "Host Review",
    host_to_cleaner: "Host Review",
    cleaner_to_host: "Cleaner Review",
  }[review.review_type] || "Review";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold">
              {review.reviewer_name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{isBlind ? "Anonymous" : review.reviewer_name}</p>
              <p className="text-xs text-gray-400">{format(parseISO(review.created_date), "MMMM yyyy")}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StarDisplay rating={review.rating} />
            <span className="text-xs text-gray-400">{typeLabel}</span>
          </div>
        </div>

        {/* Blind state banner */}
        {isBlind && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            Review will be revealed once both parties have submitted, or after 7 days.
          </div>
        )}

        {/* Not public — recipient warning */}
        {isRecipient && !review.public_visible && !isBlind && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
            <EyeOff className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>This review is not shown publicly due to its rating. Please work to improve your ratings — continued poor reviews may lead to a performance review.</span>
          </div>
        )}

        {/* Performance flag — recipient only */}
        {isRecipient && review.performance_flag && !isBlind && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            This review has been flagged for performance review by our team.
          </div>
        )}

        {/* Review content (hidden while blind) */}
        {!isBlind && (
          <>
            {/* Sub-ratings */}
            {(review.cleanliness_rating || review.communication_rating || review.location_rating ||
              review.value_rating || review.quality_rating || review.punctuality_rating ||
              review.reliability_rating || review.payment_promptness_rating || review.professionalism_rating) && (
              <div className="space-y-1.5 bg-gray-50 rounded-lg p-3">
                <SubRatingRow label="Cleanliness" value={review.cleanliness_rating} />
                <SubRatingRow label="Communication" value={review.communication_rating} />
                <SubRatingRow label="Location" value={review.location_rating} />
                <SubRatingRow label="Value for Money" value={review.value_rating} />
                <SubRatingRow label="Cleaning Quality" value={review.quality_rating} />
                <SubRatingRow label="Punctuality" value={review.punctuality_rating} />
                <SubRatingRow label="Reliability" value={review.reliability_rating} />
                <SubRatingRow label="Payment Promptness" value={review.payment_promptness_rating} />
                <SubRatingRow label="Professionalism" value={review.professionalism_rating} />
              </div>
            )}

            {/* Boolean flags */}
            <div className="flex flex-wrap gap-2">
              {review.was_late && (
                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-xs">⚠ Arrived late</Badge>
              )}
              {review.notice_given === false && (
                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-xs">⚠ Insufficient notice given</Badge>
              )}
              {review.notice_given === true && (
                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs">✓ Adequate notice given</Badge>
              )}
            </div>

            {/* Comment */}
            {review.comment && (
              <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
            )}

            {/* Existing response */}
            {review.host_response && (
              <div className="bg-teal-50 border-l-4 border-teal-500 rounded-r-lg p-3">
                <p className="text-xs font-semibold text-teal-700 flex items-center gap-1 mb-1">
                  <MessageCircle className="w-3.5 h-3.5" /> Response
                </p>
                <p className="text-sm text-gray-700">{review.host_response}</p>
              </div>
            )}

            {/* Response form for recipient */}
            {isRecipient && review.reviewee_id === currentUserId && !review.host_response && (
              <div className="pt-2 border-t border-gray-100">
                {responding ? (
                  <div className="space-y-2">
                    <Textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Write a professional response..."
                      rows={3}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleResponse} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
                        {saving ? "Posting..." : "Post Response"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setResponding(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setResponding(true)} className="gap-2">
                    <MessageCircle className="w-3.5 h-3.5" /> Respond to this review
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}