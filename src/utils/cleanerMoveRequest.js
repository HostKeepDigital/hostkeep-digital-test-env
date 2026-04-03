import { addDays, isBefore, isSameDay } from "date-fns";
import { hasSameDayTurnover } from "./turnover";

/**
 * Determine whether a cleaner is allowed to request moving a cleaning job
 * forward by 1 day, based on turnover rules and job state.
 *
 * This function DOES NOT:
 * - update the job
 * - change status
 * - notify host
 *
 * It ONLY returns whether the request is allowed and why.
 *
 * @param {Object} cleaningJob
 *   {
 *     id,
 *     property_id,
 *     scheduled_start,
 *     status
 *   }
 * @param {Array} bookings - list of bookings for the property
 * @param {Date} now - current time
 *
 * @returns {{
 *   allowed: boolean,
 *   reason: string | null,
 *   newDate: Date
 * }}
 */
export function evaluateCleanerMoveRequest(cleaningJob, bookings, now = new Date()) {
  const currentStart = new Date(cleaningJob.scheduled_start);
  const newDate = addDays(currentStart, 1);

  // 1. Completed jobs cannot be moved
  if (cleaningJob.status === "completed") {
    return {
      allowed: false,
      reason: "This job is already completed and cannot be moved.",
      newDate,
    };
  }

  // 2. Jobs already in progress cannot be moved
  if (cleaningJob.status === "in_progress") {
    return {
      allowed: false,
      reason: "This job is already in progress and cannot be moved.",
      newDate,
    };
  }

  // 3. If the job is scheduled for today and the start time has passed, block
  if (isSameDay(currentStart, now) && isBefore(currentStart, now)) {
    return {
      allowed: false,
      reason: "This job cannot be moved after its scheduled start time.",
      newDate,
    };
  }

  // 4. If the new date has a same-day turnover, block
  const turnoverOnNewDate = hasSameDayTurnover(
    bookings,
    cleaningJob.property_id,
    newDate
  );

  if (turnoverOnNewDate) {
    return {
      allowed: false,
      reason:
        "This job cannot be moved: there is a same-day checkout and check-in on the requested date.",
      newDate,
    };
  }

  // 5. If the current date is a turnover day, block
  const turnoverOnCurrentDate = hasSameDayTurnover(
    bookings,
    cleaningJob.property_id,
    currentStart
  );

  if (turnoverOnCurrentDate) {
    return {
      allowed: false,
      reason:
        "This job cannot be moved because it is part of a same-day turnover.",
      newDate,
    };
  }

  // 6. Otherwise, the request is allowed
  return {
    allowed: true,
    reason: null,
    newDate,
  };
}