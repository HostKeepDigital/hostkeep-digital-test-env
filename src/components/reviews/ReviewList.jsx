import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageCircle, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

export default function ReviewList({ reviews, propertyOwnerId, currentUserId }) {
  const [respondingTo, setRespondingTo] = useState(null);
  const [response, setResponse] = useState("");
  const queryClient = useQueryClient();

  const responseMutation = useMutation({
    mutationFn: ({ reviewId, hostResponse }) => 
      base44.entities.Review.update(reviewId, { host_response: hostResponse }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-reviews'] });
      toast.success("Response posted successfully");
      setRespondingTo(null);
      setResponse("");
    },
  });

  const isPropertyOwner = currentUserId === propertyOwnerId;

  const handleSubmitResponse = (reviewId) => {
    if (!response.trim()) {
      toast.error("Please write a response");
      return;
    }
    responseMutation.mutate({ reviewId, hostResponse: response });
  };

  const StarDisplay = ({ rating }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
        <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500">No reviews yet</p>
        <p className="text-sm text-gray-400 mt-1">Be the first to review this property</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id} className="overflow-hidden">
          <CardContent className="p-5">
            {/* Review Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-lg">
                  {review.reviewer_name?.charAt(0)?.toUpperCase() || "G"}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{review.reviewer_name}</p>
                  <p className="text-sm text-gray-500">
                    {format(parseISO(review.created_date), "MMMM yyyy")}
                  </p>
                </div>
              </div>
              <StarDisplay rating={review.rating} />
            </div>

            {/* Additional Ratings */}
            {(review.cleanliness_rating || review.communication_rating) && (
              <div className="flex flex-wrap gap-4 mb-3 text-sm">
                {review.cleanliness_rating && (
                  <div>
                    <span className="text-gray-500">Cleanliness:</span>
                    <div className="inline-flex ml-2">
                      <StarDisplay rating={review.cleanliness_rating} />
                    </div>
                  </div>
                )}
                {review.communication_rating && (
                  <div>
                    <span className="text-gray-500">Communication:</span>
                    <div className="inline-flex ml-2">
                      <StarDisplay rating={review.communication_rating} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Review Comment */}
            {review.comment && (
              <p className="text-gray-700 leading-relaxed mb-3">{review.comment}</p>
            )}

            {/* Host Response */}
            {review.host_response && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-teal-500">
                <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-teal-600" />
                  Response from host
                </p>
                <p className="text-gray-700 text-sm">{review.host_response}</p>
              </div>
            )}

            {/* Host Response Form */}
            {isPropertyOwner && !review.host_response && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {respondingTo === review.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Write your response..."
                      rows={3}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSubmitResponse(review.id)}
                        disabled={responseMutation.isPending}
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        {responseMutation.isPending ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Posting...</>
                        ) : (
                          "Post Response"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRespondingTo(null);
                          setResponse("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRespondingTo(review.id)}
                    className="gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Respond to review
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}