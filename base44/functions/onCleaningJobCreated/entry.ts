/**
 * Automation handler: fires when a CleaningJob is created or its status changes.
 * Notifies the cleaner of new jobs and the host of status updates.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

// Inline pricing calculator (mirrors utils/cleanerPricing.js — no local imports in Deno)
function calculateCleanerPrice(cleaner, { bedrooms = 1, scheduledDate, bookingDate } = {}) {
  const rc = cleaner.rate_card || {};
  let tier;
  if (bedrooms <= 1)      tier = rc.studio_1bed   || 0;
  else if (bedrooms === 2) tier = rc.two_bed       || 0;
  else if (bedrooms === 3) tier = rc.three_bed     || 0;
  else                     tier = rc.four_bed_plus || 0;

  let price = tier > 0 ? tier : (cleaner.base_price || 0);
  const minimum = cleaner.minimum_charge || 0;
  const dp = cleaner.dynamic_pricing || {};

  // Last-minute uplift
  if (dp.last_minute?.enabled && scheduledDate) {
    const cleanDate = new Date(scheduledDate);
    const fromDate = bookingDate ? new Date(bookingDate) : new Date();
    const daysUntil = Math.ceil((cleanDate - fromDate) / (1000 * 60 * 60 * 24));
    const tiers = [...(dp.last_minute.tiers || [])].sort((a, b) => a.days_before - b.days_before);
    for (const t of tiers) {
      if (daysUntil <= t.days_before) {
        price += (price * t.uplift_percent) / 100;
        break;
      }
    }
  }

  // Seasonal multiplier
  if (dp.seasonal?.enabled && scheduledDate) {
    const cleanDate = new Date(scheduledDate);
    const year = cleanDate.getFullYear();
    for (const win of dp.seasonal.windows || []) {
      if (!win.start_date || !win.end_date || !win.multiplier) continue;
      const start = new Date(win.start_date.replace(/^\d{4}/, year));
      const end = new Date(win.end_date.replace(/^\d{4}/, year));
      if (cleanDate >= start && cleanDate <= end) {
        price *= win.multiplier;
        break;
      }
    }
  }

  price = Math.max(price, minimum);
  return Math.round(price * 100) / 100;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const LOCK = Deno.env.get("LOCK_ACCESS_TOKEN");
    if (LOCK && body?.lock_token !== LOCK) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const serviceRole = base44.asServiceRole;
    const payload = body;

    const { event, data } = payload;
    if (!data) return Response.json({ ok: true });

    const job = data;
    const eventType = event?.type;

    const notify = async (user_id, type, title, body, link) => {
      await serviceRole.functions.invoke("sendNotification", {
        user_id, type, title, body, link,
      });
    };

    if (eventType === "create") {
      // Auto-select rate from cleaner's rate card based on property bedroom count
      if (job.cleaner_id && job.property_id) {
        try {
          const [cleanerRecords, propertyRecords] = await Promise.all([
            serviceRole.entities.Cleaner.filter({ id: job.cleaner_id }),
            serviceRole.entities.Property.filter({ id: job.property_id }),
          ]);
          const cleaner = cleanerRecords?.[0];
          const property = propertyRecords?.[0];

          if (cleaner && property) {
            // 1. Check for an accepted counter-rate for this specific property
            let resolvedPrice = 0;
            const counterRateRecords = await serviceRole.entities.PropertyCleanerSettings.filter({
              property_id: job.property_id,
              default_cleaner_id: job.cleaner_id,
              counter_rate_status: "accepted",
            });
            if (counterRateRecords?.[0]?.counter_rate > 0) {
              resolvedPrice = counterRateRecords[0].counter_rate;
            } else {
              // 2. Calculate price using dynamic pricing rules
              resolvedPrice = calculateCleanerPrice(cleaner, {
                bedrooms: property.bedrooms ?? 1,
                scheduledDate: job.scheduled_date,
                bookingDate: new Date().toISOString().split("T")[0],
              });
            }
            if (resolvedPrice > 0) {
              await serviceRole.entities.CleaningJob.update(job.id, { cleaner_price: resolvedPrice });
            }
          }
        } catch (e) {
          console.error("Rate card lookup failed:", e);
        }
      }
    }

    if (eventType === "create" && job.cleaner_user_id) {
      await notify(
        job.cleaner_user_id,
        "cleaning_job_assigned",
        "New Cleaning Job",
        `You have a new cleaning job on ${job.scheduled_date}${job.scheduled_time ? " at " + job.scheduled_time : ""}. Please accept or decline.`,
        "/CleanerDashboard"
      );
    }

    if (eventType === "update" && job.host_id) {
      const changed = payload.changed_fields || [];
      if (changed.includes("status")) {
        if (job.status === "accepted") {
          await notify(
            job.host_id,
            "cleaning_job_accepted",
            "Cleaner Accepted the Job",
            `Your cleaning job for ${job.scheduled_date} has been accepted.`,
            "/HostBookings"
          );
        }
        if (job.status === "declined") {
          await notify(
            job.host_id,
            "cleaning_job_declined",
            "Cleaner Declined the Job",
            `Your cleaner has declined the job for ${job.scheduled_date}. You may need to assign another cleaner.`,
            "/HostBookings"
          );
        }
        if (job.status === "completed" && job.cleaner_user_id) {
          await notify(
            job.host_id,
            "cleaning_job_completed",
            "Cleaning Job Completed",
            `The cleaning job for ${job.scheduled_date} has been marked as complete.`,
            "/HostBookings"
          );
        }
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("onCleaningJobCreated error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});