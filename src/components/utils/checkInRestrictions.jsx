export const isCheckInDateAllowed = (
  date,
  allowedCheckInDays
) => {
  // If no restrictions configured, allow all days
  if (!allowedCheckInDays || allowedCheckInDays.length === 0) {
    return true;
  }

  const dayOfWeek = date.getDay();
  return allowedCheckInDays.includes(dayOfWeek);
};