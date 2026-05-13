import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function DepositReturnTimer({
  checkOutDate,
  depositFrozen,
  depositStatus,
}) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const checkOut = new Date(checkOutDate);
      const depositReturnTime = new Date(checkOut.getTime() + 48 * 60 * 60 * 1000);
      const now = new Date();
      const diff = depositReturnTime - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining(null);
      } else {
        setIsExpired(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining({ hours, minutes, seconds });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [checkOutDate]);

  if (depositFrozen) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-900">
            Deposit frozen — damage claim under review
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Our team will review your claim and make a decision within 24 hours.
          </p>
        </div>
      </div>
    );
  }

  if (depositStatus === 'refunded') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
        <p className="text-sm font-medium text-emerald-700">
          ✓ Security deposit has been returned to guest
        </p>
      </div>
    );
  }

  if (depositStatus === 'refunding') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
        <p className="text-sm font-medium text-emerald-700">
          ↻ Security deposit refund is being processed
        </p>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
        <p className="text-sm font-medium text-emerald-700">
          ✓ Security deposit has been returned to guest
        </p>
      </div>
    );
  }

  if (!timeRemaining) {
    return null;
  }

  const isUrgent = timeRemaining.hours <= 6;
  const bgColor = isUrgent ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200";
  const textColor = isUrgent ? "text-red-700" : "text-amber-700";

  return (
    <div className={`border rounded-lg px-4 py-3 ${bgColor}`}>
      <p className={`text-sm font-medium ${textColor}`}>
        Security deposit returns to guest in:{" "}
        <span className="font-bold">
          {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s
        </span>
      </p>
      {isUrgent && (
        <p className={`text-xs ${textColor} mt-1 opacity-75`}>
          Less than 6 hours remaining to raise a damage claim
        </p>
      )}
    </div>
  );
}