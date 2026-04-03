// src/api/calendarUpdates.js

import { base44 } from "@/api/base44Client";

export async function updateBookingDates(bookingId, newCheckIn, newCheckOut) {
  return base44.entities.Booking.update(bookingId, {
    check_in: newCheckIn,
    check_out: newCheckOut,
  });
}

export async function updateCleaningJobTimes(cleaningJobId, newStart, newEnd) {
  return base44.entities.CleaningJob.update(cleaningJobId, {
    scheduled_start: newStart,
    scheduled_end: newEnd,
  });
}

// Very simple availability check – you can expand this later
export async function isCleanerAvailable(cleanerId, start, end) {
  const jobs = await base44.entities.CleaningJob.filter({
    cleaner_id: cleanerId,
  });

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  for (const job of jobs) {
    if (job.id === cleanerId) continue;
    const js = new Date(job.scheduled_start).getTime();
    const je = new Date(job.scheduled_end).getTime();
    const overlap = js < endTime && je > startTime;
    if (overlap) return false;
  }

  return true;
}

export async function unassignCleaner(cleaningJobId) {
  return base44.entities.CleaningJob.update(cleaningJobId, {
    cleaner_id: null,
  });
}

export async function createCleaningConflict(cleaningJobId, reason) {
  return base44.entities.CalendarConflict.create({
    cleaning_job_id: cleaningJobId,
    reason,
  });
}