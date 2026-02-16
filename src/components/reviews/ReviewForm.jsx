import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ReviewForm({ 
  open, 
  onOpenChange, 
  booking, 
  reviewType, // "guest_to_host" or "host_to_guest"
  reviewerName,
  reviewerId
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();

  const isGuestReview = reviewType === "guest_to_host";

  const reviewMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Review.create(data);
    },
    onSuccess: () => {
      toast.success("Review submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['property-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['host-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
      onOpenChange(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setRating(0);
    setCleanlinessRating(0);
    setCommunicationRating(0);
    setComment("");
  };

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error("Please select an overall rating");
      return;
    }

    reviewMutation.mutate({
      booking_id: booking.id,
      property_id: booking.property_id,
      reviewer_id: reviewerId,
      reviewer_name: reviewerName,
      reviewee_id: isGuestReview ? booking.host_id : booking.guest_id,
      review_type: reviewType,
      rating: rating,
      cleanliness_rating: cleanlinessRating || undefined,
      communication_rating: communicationRating || undefined,
      comment: comment,
      visible: true,
    });
  };

  const StarRating = ({ value, onChange, onHover, size = "w-8 h-8" }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => onHover?.(star)}
          onMouseLeave={() => onHover?.(0)}
          className="focus:outline-none"
        >
          <Star
            className={`${size} transition-colors ${
              star <= (onHover ? hoverRating || value : value)
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isGuestReview ? "Review Your Stay" : "Review Guest"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Overall Rating */}
          <div className="text-center">
            <Label className="text-base mb-3 block">Overall Rating *</Label>
            <div className="flex justify-center">
              <StarRating 
                value={rating} 
                onChange={setRating}
                onHover={setHoverRating}
              />
            </div>
          </div>

          {/* Additional Ratings for Guest Reviews */}
          {isGuestReview && (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <Label className="text-sm mb-2 block text-gray-600">Cleanliness</Label>
                <div className="flex justify-center">
                  <StarRating 
                    value={cleanlinessRating} 
                    onChange={setCleanlinessRating}
                    size="w-5 h-5"
                  />
                </div>
              </div>
              <div className="text-center">
                <Label className="text-sm mb-2 block text-gray-600">Communication</Label>
                <div className="flex justify-center">
                  <StarRating 
                    value={communicationRating} 
                    onChange={setCommunicationRating}
                    size="w-5 h-5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Comment */}
          <div>
            <Label className="mb-2 block">
              {isGuestReview ? "Share your experience" : "How was this guest?"}
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                isGuestReview 
                  ? "Tell others about your stay..." 
                  : "Share your experience hosting this guest..."
              }
              rows={4}
            />
          </div>

          <Button
            className="w-full bg-teal-600 hover:bg-teal-700"
            onClick={handleSubmit}
            disabled={reviewMutation.isPending || rating === 0}
          >
            {reviewMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              "Submit Review"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}