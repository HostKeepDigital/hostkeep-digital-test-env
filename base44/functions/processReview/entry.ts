/**
 * processReview — fires when a Review entity is created.
 * Handles:
 *  1. Blind reveal: checks if counterpart review exists → reveals both early
 *  2. Public visibility: < 4 stars on first review → hidden from public + performance flag + notification
 *  3. Notifies reviewee that a review has been submitted
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

const COUNTERPART = {
  guest_to_host: "host_to_guest",
  host_to_guest: "guest_to_host",
  host_to_cleaner: "cleaner_to_host",
  cleaner_to_host: "host_to_cleaner",
};

async function fetchWithRetry(sr, id, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await sr.entities.Review.get(id);
      if (r) return r;
    } catch (_) {}
    if (i < retries - 1) await new Promise(res => setTimeout(res, delayMs));
  }
  throw new Error(`Entity Review with ID ${id} not found after ${retries} attempts`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const { data, event } = await req.json();

    if (event?.type !== "create") return Response.json({ ok: true });

    const entityId = event?.entity_id || data?.id;
    if (!entityId) return Response.json({ ok: true });

    // Re-fetch from DB to avoid race condition where entity isn't committed yet
    const review = await fetchWithRetry(sr, entityId);
    const referenceId = review.review_category === "cleaning_job" ? review.job_id : review.booking_id;
    const counterpartType = COUNTERPART[review.review_type];

    // ── 1. Check for counterpart review ────────────────────────────
    let counterparts = [];
    if (referenceId && counterpartType) {
      const filterKey = review.review_category === "cleaning_job" ? "job_id" : "booking_id";
      counterparts = await sr.entities.Review.filter({
        [filterKey]: referenceId,
        review_type: counterpartType,
      });
    }

    const hasCounterpart = counterparts.length > 0;

    if (hasCounterpart) {
      // Both have reviewed — reveal both immediately
      await sr.entities.Review.update(review.id, { both_reviewed: true });
      await sr.entities.Review.update(counterparts[0].id, { both_reviewed: true });
    }

    // ── 2. Public visibility logic ──────────────────────────────────
    const revieweeId = review.reviewee_id;
    let isPublicVisible = true;
    let performanceFlag = false;

    if (review.rating < 4) {
      // Check how many previous reviews the reviewee has received
      const existingReviews = await sr.entities.Review.filter({ reviewee_id: revieweeId });
      // Exclude current review
      const priorReviews = existingReviews.filter((r) => r.id !== review.id && r.public_visible === true);

      if (priorReviews.length === 0) {
        // First review and it's poor — not public
        isPublicVisible = false;
        performanceFlag = true;
      }
      // If they have existing public reviews, still publish but flag internally if very poor
      if (review.rating <= 2) {
        performanceFlag = true;
      }
    }

    await sr.entities.Review.update(review.id, {
      public_visible: isPublicVisible,
      performance_flag: performanceFlag,
    });

    // ── 3. Notify reviewee ──────────────────────────────────────────
    if (revieweeId) {
      const friendlyType = {
        guest_to_host: "stay",
        host_to_guest: "stay",
        host_to_cleaner: "cleaning job",
        cleaner_to_host: "cleaning job",
      }[review.review_type] || "booking";

      let notifTitle = "You received a new review";
      let notifBody = hasCounterpart
        ? `Your review for the recent ${friendlyType} has been revealed — both parties have now reviewed.`
        : `You received a review for a recent ${friendlyType}. Reviews are revealed when both parties submit or after 7 days.`;

      await sr.functions.invoke("sendNotification", {
        user_id: revieweeId,
        type: "general",
        title: notifTitle,
        body: notifBody,
      });

      // Warn if hidden from public
      if (!isPublicVisible) {
        await sr.functions.invoke("sendNotification", {
          user_id: revieweeId,
          type: "general",
          title: "Important: Your review visibility",
          body: "You received a review with a below-average rating. As this is your first review, it won't be shown publicly yet — but please work to improve your ratings. Continued poor reviews may result in a performance review and possible removal from the platform.",
        });
      }
    }

    // ── 4. Sync host_to_cleaner review → CleanerReview + recalc stats ─
    if (review.review_type === "host_to_cleaner") {
      try {
        const cleaners = await sr.entities.Cleaner.filter({ user_id: review.reviewee_id });
        if (cleaners.length > 0) {
          const cleanerRecord = cleaners[0];

          await sr.entities.CleanerReview.create({
            job_id: review.job_id,
            cleaner_id: cleanerRecord.id,
            host_id: review.reviewer_id,
            property_id: review.property_id,
            rating: review.rating,
            quality_rating: review.quality_rating,
            reliability_rating: review.reliability_rating,
            communication_rating: review.communication_rating,
            comment: review.comment,
            visible: review.public_visible,
          });

          // Recalculate cleaner stats
          const allCleanerReviews = await sr.entities.CleanerReview.filter({ cleaner_id: cleanerRecord.id });
          const totalReviews = allCleanerReviews.length;
          const avgRating = totalReviews > 0
            ? allCleanerReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
            : 0;

          await sr.entities.Cleaner.update(cleanerRecord.id, {
            average_rating: Math.round(avgRating * 10) / 10,
            total_reviews: totalReviews,
          });
        }
      } catch (syncErr) {
        console.error("CleanerReview sync error:", syncErr);
      }
    }

    // ── 5. Flag for admin if performance concern ────────────────────
    if (performanceFlag && revieweeId) {
      // Create an admin notification
      const admins = await sr.entities.User.filter({ role: "admin" });
      for (const admin of admins.slice(0, 3)) {
        await sr.functions.invoke("sendNotification", {
          user_id: admin.id,
          type: "general",
          title: "Performance Flag: Poor First Review",
          body: `User ${revieweeId} received a ${review.rating}-star review (${review.review_type}). This is a performance concern — please review.`,
          link: "/admin",
        });
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("processReview error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});