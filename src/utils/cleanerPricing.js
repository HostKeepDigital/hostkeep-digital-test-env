/**
 * Shared cleaner pricing calculator.
 * Used on both frontend (price preview) and backend (job creation).
 *
 * calculateCleanerPrice(cleaner, options) → { baseRate, lastMinuteUplift, seasonalUplift, total, breakdown }
 *
 * options:
 *   bedrooms      — number of bedrooms (picks rate card tier)
 *   scheduledDate — ISO date string of the clean (YYYY-MM-DD)
 *   bookingDate   — ISO date string of when the booking was made (defaults to today)
 *   requestedServices — array of service keys to add, e.g. ["laundry", "linen_change"]
 */

export function getRateCardTier(bedrooms) {
  if (!bedrooms || bedrooms <= 1) return "studio_1bed";
  if (bedrooms === 2) return "two_bed";
  if (bedrooms === 3) return "three_bed";
  return "four_bed_plus";
}

export function calculateCleanerPrice(cleaner, options = {}) {
  const {
    bedrooms = 1,
    scheduledDate,
    bookingDate,
    requestedServices = [],
  } = options;

  // 1. Base rate from rate card
  const tier = getRateCardTier(bedrooms);
  const rateCard = cleaner.rate_card || {};
  let base = rateCard[tier] || cleaner.base_price || 0;

  // 2. Apply minimum charge
  const minimum = cleaner.minimum_charge || 0;

  const breakdown = [];
  breakdown.push({ label: tierLabel(tier), amount: base });

  // 3. Add-on services
  let addonsTotal = 0;
  const services = cleaner.services || {};
  for (const key of requestedServices) {
    const svc = services[key];
    if (svc?.enabled && svc?.price > 0) {
      addonsTotal += svc.price;
      breakdown.push({ label: serviceLabel(key), amount: svc.price });
    }
  }

  let subtotal = base + addonsTotal;

  // 4. Last-minute uplift
  let lastMinuteUplift = 0;
  let lastMinuteLabel = null;
  const dp = cleaner.dynamic_pricing || {};

  if (dp.last_minute?.enabled && scheduledDate) {
    const cleanDate = new Date(scheduledDate);
    const fromDate = bookingDate ? new Date(bookingDate) : new Date();
    const daysUntilClean = Math.ceil((cleanDate - fromDate) / (1000 * 60 * 60 * 24));

    // Sort tiers descending so we pick the most specific (smallest window) first
    const tiers = [...(dp.last_minute.tiers || [])].sort((a, b) => a.days_before - b.days_before);
    for (const tier of tiers) {
      if (daysUntilClean <= tier.days_before) {
        lastMinuteUplift = (subtotal * tier.uplift_percent) / 100;
        lastMinuteLabel = tier.label || `Last-minute (+${tier.uplift_percent}%)`;
        break;
      }
    }
  }

  if (lastMinuteUplift > 0) {
    breakdown.push({ label: lastMinuteLabel, amount: lastMinuteUplift, highlight: "amber" });
  }

  // 5. Seasonal multiplier
  let seasonalUplift = 0;
  let seasonalLabel = null;

  if (dp.seasonal?.enabled && scheduledDate) {
    const cleanDate = new Date(scheduledDate);
    const year = cleanDate.getFullYear();

    for (const window of dp.seasonal.windows || []) {
      if (!window.start_date || !window.end_date || !window.multiplier) continue;
      // Normalise window dates to current year for recurring annual windows
      const start = new Date(window.start_date.replace(/^\d{4}/, year));
      const end = new Date(window.end_date.replace(/^\d{4}/, year));
      if (cleanDate >= start && cleanDate <= end) {
        const extra = subtotal * (window.multiplier - 1);
        seasonalUplift += extra;
        seasonalLabel = `${window.name} (+${Math.round((window.multiplier - 1) * 100)}%)`;
        break; // apply only the first matching window
      }
    }
  }

  if (seasonalUplift > 0) {
    breakdown.push({ label: seasonalLabel, amount: seasonalUplift, highlight: "blue" });
  }

  let total = subtotal + lastMinuteUplift + seasonalUplift;

  // 6. Enforce minimum
  if (total < minimum) {
    const diff = minimum - total;
    breakdown.push({ label: "Minimum charge adjustment", amount: diff });
    total = minimum;
  }

  total = Math.round(total * 100) / 100;

  return { baseRate: base, lastMinuteUplift, seasonalUplift, addonsTotal, total, breakdown };
}

function tierLabel(tier) {
  return {
    studio_1bed: "Studio / 1 bed rate",
    two_bed: "2 bed rate",
    three_bed: "3 bed rate",
    four_bed_plus: "4 bed+ rate",
  }[tier] || "Base rate";
}

function serviceLabel(key) {
  return {
    laundry: "Laundry service",
    linen_change: "Linen change",
    deep_cleaning: "Deep cleaning",
  }[key] || key;
}