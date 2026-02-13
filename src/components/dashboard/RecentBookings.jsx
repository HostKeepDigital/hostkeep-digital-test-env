import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RecentBookings({ bookings = [] }) {
  const statusColors = {
    confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    checked_in: "bg-emerald-50 text-emerald-700 border-emerald-200",
    completed: "bg-gray-50 text-gray-700 border-gray-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200"
  };

  const paymentColors = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    partial: "bg-orange-50 text-orange-700 border-orange-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200"
  };

  const recentBookings = bookings
    .filter(b => b.booking_status !== 'cancelled')
    .sort((a, b) => new Date(a.check_in) - new Date(b.check_in))
    .slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Bookings</h3>
        <Link 
          to={createPageUrl("Bookings")}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {recentBookings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No upcoming bookings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentBookings.map((booking, idx) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{booking.guest_name}</p>
                  <p className="text-sm text-gray-500">
                    {format(parseISO(booking.check_in), "MMM d")} - {format(parseISO(booking.check_out), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={paymentColors[booking.payment_status]}>
                  {booking.payment_status}
                </Badge>
                <Badge variant="outline" className={statusColors[booking.booking_status]}>
                  {booking.booking_status?.replace('_', ' ')}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}