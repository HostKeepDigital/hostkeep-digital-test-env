import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO, addMonths, subMonths } from "date-fns";

export default function BookingCalendar({ bookings = [], onDateClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);

  const getBookingForDate = (date) => {
    return bookings.find(booking => {
      if (!booking.check_in || !booking.check_out) return false;
      const checkIn = parseISO(booking.check_in);
      const checkOut = parseISO(booking.check_out);
      return isWithinInterval(date, { start: checkIn, end: checkOut });
    });
  };

  const isCheckIn = (date, booking) => {
    if (!booking?.check_in) return false;
    return isSameDay(date, parseISO(booking.check_in));
  };

  const isCheckOut = (date, booking) => {
    if (!booking?.check_out) return false;
    return isSameDay(date, parseISO(booking.check_out));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}

        {paddingDays.map((_, idx) => (
          <div key={`pad-${idx}`} className="aspect-square" />
        ))}

        {days.map(day => {
          const booking = getBookingForDate(day);
          const isBooked = !!booking;
          const isStart = isCheckIn(day, booking);
          const isEnd = isCheckOut(day, booking);
          const isToday = isSameDay(day, new Date());

          return (
            <motion.button
              key={day.toISOString()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDateClick?.(day, booking)}
              className={`
                aspect-square flex items-center justify-center text-sm rounded-lg relative transition-all
                ${isToday ? 'ring-2 ring-teal-500 ring-offset-1' : ''}
                ${isBooked ? 'bg-teal-100 text-teal-800 font-medium' : 'hover:bg-gray-50 text-gray-700'}
                ${isStart ? 'rounded-l-lg bg-teal-500 text-white' : ''}
                ${isEnd ? 'rounded-r-lg bg-teal-500 text-white' : ''}
                ${booking?.booking_status === 'cancelled' ? 'bg-gray-100 text-gray-400 line-through' : ''}
              `}
            >
              {format(day, "d")}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-teal-500" />
          <span className="text-gray-600">Check-in/out</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-teal-100" />
          <span className="text-gray-600">Booked</span>
        </div>
      </div>
    </motion.div>
  );
}