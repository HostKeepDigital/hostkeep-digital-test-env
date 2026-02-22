import { useState, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { differenceInMilliseconds, formatDistanceToNow } from "date-fns";

export default function CountdownTimer({ deadline, label, onExpire }) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!deadline) return;

    const updateTimer = () => {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const diff = differenceInMilliseconds(deadlineDate, now);

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining(null);
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  if (!deadline) return null;

  if (isExpired) {
    return (
      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
        <AlertCircle className="w-3 h-3 mr-1" />
        Expired
      </Badge>
    );
  }

  if (!timeRemaining) return null;

  const isUrgent = timeRemaining.hours < 3;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
      isUrgent 
        ? 'bg-rose-50 border-rose-200 text-rose-700' 
        : 'bg-amber-50 border-amber-200 text-amber-700'
    }`}>
      <Clock className="w-4 h-4" />
      <div className="text-sm font-medium">
        <span className="text-xs text-gray-500 block">{label}</span>
        <span className="font-mono">
          {String(timeRemaining.hours).padStart(2, '0')}:
          {String(timeRemaining.minutes).padStart(2, '0')}:
          {String(timeRemaining.seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}