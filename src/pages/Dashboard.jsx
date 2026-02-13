import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { PoundSterling, Calendar, TrendingUp, Clock, Home } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import BookingCalendar from "@/components/dashboard/BookingCalendar";
import RecentBookings from "@/components/dashboard/RecentBookings";
import { parseISO, isAfter, isBefore, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

export default function Dashboard() {
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date'),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
  });

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const activeBookings = bookings.filter(b => 
    b.booking_status !== 'cancelled' && 
    isAfter(parseISO(b.check_out), today)
  );

  const totalIncome = bookings
    .filter(b => b.booking_status !== 'cancelled')
    .reduce((sum, b) => sum + (b.amount_paid || 0), 0);

  const monthlyIncome = payments
    .filter(p => isWithinInterval(parseISO(p.payment_date), { start: monthStart, end: monthEnd }))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingPayments = bookings
    .filter(b => b.booking_status !== 'cancelled' && b.payment_status !== 'paid')
    .reduce((sum, b) => sum + ((b.total_amount || 0) - (b.amount_paid || 0)), 0);

  const upcomingBookings = activeBookings.filter(b => 
    isAfter(parseISO(b.check_in), today)
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <Home className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Holiday Home Dashboard</h1>
            <p className="text-gray-500">Track your rental income and bookings</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Income"
            value={`£${totalIncome.toFixed(2)}`}
            subtitle="All time"
            icon={PoundSterling}
            color="emerald"
          />
          <StatsCard
            title="This Month"
            value={`£${monthlyIncome.toFixed(2)}`}
            subtitle="Income received"
            icon={TrendingUp}
            color="teal"
          />
          <StatsCard
            title="Pending"
            value={`£${pendingPayments.toFixed(2)}`}
            subtitle="Awaiting payment"
            icon={Clock}
            color="amber"
          />
          <StatsCard
            title="Upcoming"
            value={upcomingBookings}
            subtitle="Bookings"
            icon={Calendar}
            color="violet"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BookingCalendar bookings={bookings} />
          <RecentBookings bookings={bookings} />
        </div>
      </div>
    </div>
  );
}