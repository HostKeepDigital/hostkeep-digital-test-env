/**
 * reviewReminders — runs daily.
 * 1. Finds completed bookings/jobs older than 3 days → sends 3-day review nudge
 * 2. Finds ones older than 7 days → expires window, sends final email, marks expired
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY || !to) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "HostKeep <notifications@hostkeep.co.uk>",
      to: [to],
      subject,
      html,
    }),
  });
}

function daysDiff(dateStr) {
  const then = new Date(dateStr);
  const now = new Date();
  return (now - then) / (1000 * 60 * 60 * 24);
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const LOCK = Deno.env.get("LOCK_ACCESS_TOKEN");
    if (LOCK && body?.lock_token !== LOCK) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const now = new Date();

    // ── Booking reviews ──────────────────────────────────────────────
    const completedBookings = await sr.entities.Booking.filter({ booking_status: "completed" });

    for (const booking of completedBookings) {
      if (!booking.completed_at) continue;
      const days = daysDiff(booking.completed_at);
      if (days < 3 || days > 30) continue; // only care about 3–30 day window

      const existingReviews = await sr.entities.Review.filter({ booking_id: booking.id });
      const reviewTypes = existingReviews.map((r) => r.review_type);

      // Guest → Host reminder
      if (!reviewTypes.includes("guest_to_host") && booking.guest_id) {
        const guestReview = existingReviews.find((r) => r.review_type === "guest_to_host");
        if (!guestReview) {
          const guestUser = await sr.entities.User.get(booking.guest_id).catch(() => null);
          if (guestUser) {
            if (days >= 7) {
              // Expire window
              if (!existingReviews.find((r) => r.review_type === "guest_to_host" && r.review_window_expired)) {
                // Create expired placeholder record so we know window is gone
                // Also reveal host's review if they submitted
                const hostReview = existingReviews.find((r) => r.review_type === "host_to_guest");
                if (hostReview && !hostReview.both_reviewed) {
                  await sr.entities.Review.update(hostReview.id, { both_reviewed: true, review_window_expired: true });
                }
                if (!guestReview?.reminder_7day_sent) {
                  await sendEmail(
                    guestUser.email,
                    "Your review window has closed",
                    `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2>Review Window Closed</h2><p>The 7-day window to review your stay at a HostKeep property has now closed. You'll no longer be able to leave a review for this stay.</p><p style="color:#6b7280;font-size:13px">HostKeep Team</p></div>`
                  );
                }
              }
            } else if (days >= 3) {
              // 3-day nudge
              const rev = existingReviews.find((r) => r.review_type === "guest_to_host");
              if (!rev?.reminder_3day_sent) {
                await sendEmail(
                  guestUser.email,
                  "Don't forget to review your recent stay!",
                  `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2>How was your stay?</h2><p>You have 4 days left to leave a review. After 7 days the option will be removed.</p><a href="https://hostkeep.co.uk/MyTrips" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0d9488;color:white;border-radius:8px;text-decoration:none">Leave a Review</a></div>`
                );
              }
            }
          }
        }
      }

      // Host → Guest reminder
      if (!reviewTypes.includes("host_to_guest") && booking.host_id) {
        const hostUser = await sr.entities.User.get(booking.host_id).catch(() => null);
        if (hostUser && days >= 3 && days < 7) {
          await sendEmail(
            hostUser.email,
            "Don't forget to review your recent guest!",
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2>Review your guest</h2><p>You have a few days left to leave a review for your recent guest. After 7 days the option will be removed.</p><a href="https://hostkeep.co.uk/HostBookings" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0d9488;color:white;border-radius:8px;text-decoration:none">Leave a Review</a></div>`
          );
        }
        if (days >= 7) {
          const guestReview = existingReviews.find((r) => r.review_type === "guest_to_host");
          if (guestReview && !guestReview.both_reviewed) {
            await sr.entities.Review.update(guestReview.id, { both_reviewed: true, review_window_expired: true });
          }
        }
      }
    }

    // ── Cleaning job reviews ──────────────────────────────────────────
    const completedJobs = await sr.entities.CleaningJob.filter({ status: "completed" });

    for (const job of completedJobs) {
      if (!job.completed_at) continue;
      const days = daysDiff(job.completed_at);
      if (days < 3 || days > 30) continue;

      const jobReviews = await sr.entities.Review.filter({ job_id: job.id });
      const reviewTypes = jobReviews.map((r) => r.review_type);

      // Host → Cleaner
      if (!reviewTypes.includes("host_to_cleaner") && job.host_id && days >= 3 && days < 7) {
        const hostUser = await sr.entities.User.get(job.host_id).catch(() => null);
        if (hostUser) {
          await sendEmail(
            hostUser.email,
            "Review your cleaner",
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2>How did the clean go?</h2><p>Leave a review for your cleaner. Reviews help build trust on the platform.</p><a href="https://hostkeep.co.uk/HostBookings" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0d9488;color:white;border-radius:8px;text-decoration:none">Leave a Review</a></div>`
          );
        }
      }

      // Cleaner → Host
      if (!reviewTypes.includes("cleaner_to_host") && job.cleaner_user_id && days >= 3 && days < 7) {
        const cleanerUser = await sr.entities.User.get(job.cleaner_user_id).catch(() => null);
        if (cleanerUser) {
          await sendEmail(
            cleanerUser.email,
            "Review your host",
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2>How was the host?</h2><p>Share your experience — was payment prompt? Were instructions clear? Your feedback helps the community.</p><a href="https://hostkeep.co.uk/CleanerDashboard" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0d9488;color:white;border-radius:8px;text-decoration:none">Leave a Review</a></div>`
          );
        }
      }

      // Expire windows at 7 days
      if (days >= 7) {
        for (const r of jobReviews) {
          if (!r.both_reviewed) {
            await sr.entities.Review.update(r.id, { both_reviewed: true, review_window_expired: true });
          }
        }
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("reviewReminders error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});