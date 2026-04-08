import { useState, useEffect } from 'react';
import { differenceInSeconds, formatDistanceStrict } from 'date-fns';

export default function RentalPaymentTimer({ releaseDueAt, rentalFrozen }) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const releaseDate = new Date(releaseDueAt);
      const secondsLeft = differenceInSeconds(releaseDate, now);

      if (secondsLeft <= 0) {
        setIsExpired(true);
        setTimeRemaining(null);
      } else {
        setIsExpired(false);
        const hours = Math.floor(secondsLeft / 3600);
        const mins = Math.floor((secondsLeft % 3600) / 60);
        const secs = secondsLeft % 60;
        setTimeRemaining({ hours, mins, secs });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [releaseDueAt]);

  if (rentalFrozen) {
    return (
      <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium text-amber-700">
        Payment frozen — complaint under review
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-emerald-700">
        Payment has been released to your host
      </div>
    );
  }

  if (!timeRemaining) {
    return null;
  }

  const isUrgent = timeRemaining.hours <= 6;

  return (
    <div
      className={`px-3 py-2 border rounded-lg text-sm font-medium ${
        isUrgent
          ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-amber-50 border-amber-200 text-amber-700'
      }`}
    >
      Payment releases to host in: {timeRemaining.hours}h {timeRemaining.mins}m{' '}
      {timeRemaining.secs}s
    </div>
  );
}