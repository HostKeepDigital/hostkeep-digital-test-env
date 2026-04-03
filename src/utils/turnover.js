import { isSameDay } from "date-fns";

/**
 * Given a list of bookings for a property,
 * determine if there is a same-day turnover on a specific date.
 *
 * Turnover = one booking checks out on that date
 *         AND another booking checks in on that same date.
 *
 * @param {Array} bookings - Array of booking objects
 *   Expected shape (at minimum):
 *   {
 *     id: string | number,
 *     property_id: string | number,
 *     check_in: string (ISO),
 *     check_out: string (ISO)
 *   }
 * @param {string|number} propertyId
 * @param {Date} date - The date to check for turnover
 * @returns {boolean}
 */
export function hasSameDayTurnover(bookings, propertyId, date) {
  const targetDate = date instanceof Date ? date : new Date(date);

  const propertyBookings = bookings.filter(
    (b) => String(b.property_id) === String(propertyId)
  );

  let hasCheckout = false;
  let hasCheckin = false;

  for (const booking of propertyBookings) {
    const checkInDate = new Date(booking.check_in);
    const checkOutDate = new Date(booking.check_out);

    if (isSameDay(checkOutDate, targetDate)) {
      hasCheckout = true;
    }

    if (isSameDay(checkInDate, targetDate)) {
      hasCheckin = true;
    }

    if (hasCheckout && hasCheckin) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a cleaning job can be moved by 1 day forward,
 * respecting same-day turnover rules.
 *
 * Rule:
 * - If moving the job would land on a date with same-day turnover
 *   for that property, it is NOT allowed.
 *
 * @param {Object} cleaningJob
 *   {
 *     id,
 *     property_id,
 *     scheduled_start: ISO string
 *   }
 * @param {Array} bookings - same shape as above
 * @returns {{ allowed: boolean, reason: string | null, newDate: Date }}
 */
export function canMoveCleaningJobOneDayForward(cleaningJob, bookings) {
  const currentStart = new Date(cleaningJob.scheduled_start);
  const newDate = new Date(currentStart);
  newDate.setDate(currentStart.getDate() + 1);

  const turnover = hasSameDayTurnover(
    bookings,
    cleaningJob.property_id,
    newDate
  );

  if (turnover) {
    return {
      allowed: false,
      reason:
        "This job cannot be moved: there is a same-day checkout and check-in on the requested date.",
      newDate,
    };
  }

  return {
    allowed: true,
    reason: null,
    newDate,
  };
}