import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addDays } from "date-fns";

/**
 * ReviewForm — unified for all 4 review types:
 *   "guest_to_host"    — guest reviews their stay/host
 *   "host_to_guest"    — host reviews a guest
 *   "host_to_cleaner"  — host reviews a cleaner after a job
 *   "cleaner_to_host"  — cleaner reviews a host (payment, professionalism, notice)
 *
 * Props:
 *   open, onOpenChange
 *   reviewType        — one of the 4 types above
 *   reviewerName, reviewerId
 *   booking           — booking object (for booking reviews)
 *   job               — cleaning job object (for job reviews)
 *   endDate           — ISO date string of when booking/job ended (for blind_until calc)
 */
export default function ReviewForm({
  open,
  onOpenChange,
  reviewType,
  reviewerName,
  reviewerId,
  booking = null,
  job = null,
  endDate = null,
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [subs, setSubs] = useState({});
  const [booleans, setBooleans] = useState({ was_late: false, notice_given: false });
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const isGuestToHost = reviewType === "guest_to_host";
  const isHostToGuest = reviewType === "host_to_guest";
  const isHostToCleaner = reviewType === "host_to_cleaner";
  const isCleanerToHost = reviewType === "cleaner_to_host";
  const isJobReview = isHostToCleaner || isCleanerToHost;

  const handleSub = (key, val) => setSubs((p) => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please give an overall rating");
      return;
    }
    setSaving(true);

    const revieweeId = isGuestToHost
      ? booking?.host_id
      : isHostToGuest
      ? booking?.guest_id
      : isHostToCleaner
      ? job?.cleaner_user_id
      : job?.host_id; // cleaner_to_host

    const referenceDate = endDate || booking?.check_out || job?.completed_at || new Date().toISOString();
    const blindUntil = addDays(new Date(referenceDate), 3).toISOString();

    const payload = {
      review_category: isJobReview ? "cleaning_job" : "booking",
      review_type: reviewType,
      reviewer_id: reviewerId,
      reviewer_name: reviewerName,
      reviewee_id: revieweeId,
      rating,
      comment,
      visible: true,
      public_visible: false, // processReview function sets this
      blind_until: blindUntil,
      both_reviewed: false,
    };

    if (!isJobReview) {
      payload.booking_id = booking?.id;
      payload.property_id = booking?.property_id;
    } else {
      payload.job_id = job?.id;
    }

    if (isGuestToHost) {
      payload.cleanliness_rating = subs.cleanliness || undefined;
      payload.communication_rating = subs.communication || undefined;
      payload.location_rating = subs.location || undefined;
      payload.value_rating = subs.value || undefined;
    }
    if (isHostToGuest) {
      payload.communication_rating = subs.communication || undefined;
    }
    if (isHostToCleaner) {
      payload.quality_rating = subs.quality || undefined;
      payload.punctuality_rating = subs.punctuality || undefined;
      payload.reliability_rating = subs.reliability || undefined;
      payload.communication_rating = subs.communication || undefined;
      payload.was_late = booleans.was_late;
    }
    if (isCleanerToHost) {
      payload.payment_promptness_rating = subs.payment_promptness || undefined;
      payload.communication_rating = subs.communication || undefined;
      payload.professionalism_rating = subs.professionalism || undefined;
      payload.notice_given = booleans.notice_given;
    }

    await base44.entities.Review.create(payload);
    toast.success("Review submitted — it will be revealed once both parties have reviewed or after 7 days.");
    onOpenChange(false);
    setRating(0); setHover(0); setSubs({}); setBooleans({ was_late: false, notice_given: false }); setComment("");
    setSaving(false);
  };

  const StarPicker = ({ value, onChange, size = "w-8 h-8" }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none"
        >
          <Star className={`${size} transition-colors ${s <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
        </button>
      ))}
    </div>
  );

  const SubStars = ({ label, field, size = "w-5 h-5" }) => (
    <div className="text-center">
      <Label className="text-sm mb-2 block text-gray-600">{label}</Label>
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" onClick={() => handleSub(field, s)} className="focus:outline-none">
            <Star className={`${size} transition-colors ${s <= (subs[field] || 0) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
          </button>
        ))}
      </div>
    </div>
  );

  const titles = {
    guest_to_host: "Review Your Stay",
    host_to_guest: "Review Your Guest",
    host_to_cleaner: "Review Your Cleaner",
    cleaner_to_host: "Review Your Host",
  };

  const placeholders = {
    guest_to_host: "Tell others about your stay — the property, the host, your overall experience...",
    host_to_guest: "How was this guest? Were they respectful of the property and house rules?",
    host_to_cleaner: "How was the standard of cleaning? Were they on time and professional?",
    cleaner_to_host: "How was this host? Were payments made promptly? Were instructions clear?",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titles[reviewType] || "Leave a Review"}</DialogTitle>
          <DialogDescription>
            Reviews are kept confidential until both parties have submitted or 7 days have passed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Overall */}
          <div className="text-center">
            <Label className="text-base mb-3 block">Overall Rating *</Label>
            <div className="flex justify-center">
              <StarPicker value={rating} onChange={setRating} />
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {["", "Poor", "Below average", "Average", "Good", "Excellent"][rating]}
              </p>
            )}
          </div>

          {/* Guest → Host sub-ratings */}
          {isGuestToHost && (
            <div className="grid grid-cols-2 gap-4">
              <SubStars label="Cleanliness" field="cleanliness" />
              <SubStars label="Communication" field="communication" />
              <SubStars label="Location" field="location" />
              <SubStars label="Value for Money" field="value" />
            </div>
          )}

          {/* Host → Guest sub-ratings */}
          {isHostToGuest && (
            <div className="grid grid-cols-2 gap-4">
              <SubStars label="Communication" field="communication" />
              <SubStars label="Respect for Property" field="reliability" />
            </div>
          )}

          {/* Host → Cleaner sub-ratings */}
          {isHostToCleaner && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <SubStars label="Cleaning Quality" field="quality" />
                <SubStars label="Punctuality" field="punctuality" />
                <SubStars label="Reliability" field="reliability" />
                <SubStars label="Communication" field="communication" />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <div>
                  <p className="font-medium text-sm text-gray-900">Did the cleaner arrive late?</p>
                  <p className="text-xs text-gray-500">This will be noted on their profile</p>
                </div>
                <Switch
                  checked={booleans.was_late}
                  onCheckedChange={(v) => setBooleans((p) => ({ ...p, was_late: v }))}
                />
              </div>
            </>
          )}

          {/* Cleaner → Host sub-ratings */}
          {isCleanerToHost && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <SubStars label="Payment Promptness" field="payment_promptness" />
                <SubStars label="Communication" field="communication" />
                <SubStars label="Professionalism" field="professionalism" />
                <SubStars label="Instructions Clarity" field="reliability" />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <div>
                  <p className="font-medium text-sm text-gray-900">Was adequate notice given for changes?</p>
                  <p className="text-xs text-gray-500">e.g. schedule changes, additional requirements</p>
                </div>
                <Switch
                  checked={booleans.notice_given}
                  onCheckedChange={(v) => setBooleans((p) => ({ ...p, notice_given: v }))}
                />
              </div>
            </>
          )}

          {/* Comment */}
          <div>
            <Label className="mb-2 block">Written Review</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={placeholders[reviewType]}
              rows={4}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            🔒 Your review is confidential until both parties have submitted a review, or 3 days have passed. After 3 days the option to review will close.
          </div>

          <Button
            className="w-full bg-teal-600 hover:bg-teal-700"
            onClick={handleSubmit}
            disabled={saving || rating === 0}
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Submit Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}