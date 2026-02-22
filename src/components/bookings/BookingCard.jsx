import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, differenceInDays } from "date-fns";
import { 
  Mail, Phone, Check, X, Calendar, User, 
  Clock, AlertTriangle, Star, Sparkles
} from "lucide-react";
import CountdownTimer from "./CountdownTimer";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BookingCard({ 
  booking, 
  property, 
  onAccept, 
  onDecline, 
  onCheckIn, 
  onComplete, 
  onReview,
  hasReviewed,
  showCompetingBadge = false
}) {
  const nights = differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in));

  const statusColors = {
    awaiting_decision: "bg-amber-50 text-amber-700 border-amber-200",
    awaiting_payment: "bg-orange-50 text-orange-700 border-orange-200",
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    checked_in: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-gray-50 text-gray-700 border-gray-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
    declined: "bg-rose-50 text-rose-700 border-rose-200",
    expired: "bg-gray-50 text-gray-500 border-gray-200"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-lg">
            {booking.guest_name?.charAt(0)?.toUpperCase() || "G"}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{booking.guest_name}</h3>
            <p className="text-sm text-gray-500">{property?.title || "Property"}</p>
            {booking.request_timestamp && (
              <p className="text-xs text-gray-400 mt-1">
                Requested {format(parseISO(booking.request_timestamp), "MMM d, h:mm a")}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className={statusColors[booking.booking_status]}>
            {booking.booking_status?.replace('_', ' ')}
          </Badge>
          {showCompetingBadge && booking.is_competing_request && (
            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Competing Request
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
        <div>
          <p className="text-gray-500">Check-in</p>
          <p className="font-medium">{format(parseISO(booking.check_in), "MMM d, yyyy")}</p>
        </div>
        <div>
          <p className="text-gray-500">Nights</p>
          <p className="font-medium">{nights} night{nights !== 1 ? 's' : ''}</p>
        </div>
        <div>
          <p className="text-gray-500">Guests</p>
          <p className="font-medium">{booking.guests_count || 1}</p>
        </div>
        <div>
          <p className="text-gray-500">Total</p>
          <p className="font-semibold text-teal-600">£{booking.total_amount}</p>
        </div>
      </div>

      {/* Deposit Info */}
      {booking.deposit_amount > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Deposit Required:</span>
            <span className="font-semibold text-blue-900">£{booking.deposit_amount}</span>
          </div>
          {booking.deposit_paid > 0 && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-gray-600">Deposit Paid:</span>
              <span className="font-semibold text-emerald-600">£{booking.deposit_paid}</span>
            </div>
          )}
        </div>
      )}

      {/* Countdown Timers */}
      {booking.booking_status === 'awaiting_decision' && booking.decision_deadline && (
        <div className="mb-4">
          <CountdownTimer 
            deadline={booking.decision_deadline} 
            label="Time to respond"
          />
        </div>
      )}

      {booking.booking_status === 'awaiting_payment' && booking.deposit_due_date && (
        <div className="mb-4">
          <CountdownTimer 
            deadline={booking.deposit_due_date} 
            label="Deposit due in"
          />
        </div>
      )}

      {booking.booking_status === 'confirmed' && booking.full_payment_due_date && (
        <div className="mb-4">
          <CountdownTimer 
            deadline={booking.full_payment_due_date} 
            label="Full payment due"
          />
        </div>
      )}

      {/* Guest Message */}
      {booking.guest_message && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
          <p className="text-gray-500 mb-1">Guest message:</p>
          <p className="text-gray-700">{booking.guest_message}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <a href={`mailto:${booking.guest_email}`} className="flex items-center gap-1 hover:text-teal-600">
            <Mail className="w-4 h-4" /> Email
          </a>
          {booking.guest_phone && (
            <a href={`tel:${booking.guest_phone}`} className="flex items-center gap-1 hover:text-teal-600">
              <Phone className="w-4 h-4" /> Call
            </a>
          )}
        </div>

        <div className="flex gap-2">
          {booking.booking_status === 'awaiting_decision' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDecline(booking)}
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <X className="w-4 h-4 mr-1" /> Decline
              </Button>
              <Button
                size="sm"
                onClick={() => onAccept(booking)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="w-4 h-4 mr-1" /> Accept
              </Button>
            </>
          )}

          {booking.booking_status === 'confirmed' && (
            <Button
              size="sm"
              onClick={() => onCheckIn(booking)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Check In Guest
            </Button>
          )}

          {booking.booking_status === 'checked_in' && (
            <Button
              size="sm"
              onClick={() => onComplete(booking)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Complete Stay
            </Button>
          )}

          {booking.booking_status === 'completed' && (
            <>
              {!hasReviewed && onReview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReview(booking)}
                  className="border-teal-200 text-teal-700 hover:bg-teal-50"
                >
                  <Star className="w-4 h-4 mr-1" /> Review Guest
                </Button>
              )}
              <Link to={createPageUrl('CleanerMarketplace')}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Sparkles className="w-4 h-4 mr-1" /> Find Cleaner
                </Button>
              </Link>
            </>
          )}

          {hasReviewed && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-200">
              <Star className="w-3 h-3 mr-1 fill-emerald-600" /> Reviewed
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}