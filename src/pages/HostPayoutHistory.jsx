import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Shield,
  HelpCircle,
  DollarSign,
  Calendar,
  Zap,
  CreditCard,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STRIPE_FEE_PERCENTAGE = 1.5;
const STRIPE_FIXED_FEE = 0.20;

const MONTHS = [
  { num: "01", name: "January" },
  { num: "02", name: "February" },
  { num: "03", name: "March" },
  { num: "04", name: "April" },
  { num: "05", name: "May" },
  { num: "06", name: "June" },
  { num: "07", name: "July" },
  { num: "08", name: "August" },
  { num: "09", name: "September" },
  { num: "10", name: "October" },
  { num: "11", name: "November" },
  { num: "12", name: "December" },
];

export default function HostPayoutHistory() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [yearRange, setYearRange] = useState([currentYear - 2, currentYear]);

  // Fetch bookings
  const { data: bookings = [] } = useQuery({
    queryKey: ["host-bookings-payout", user?.id],
    queryFn: async () => {
      const result = await base44.entities.Booking.filter({ host_id: user?.id });
      return result || [];
    },
    enabled: !!user?.id,
  });

  // Fetch cleaning jobs for cleaner payments
  const { data: cleaningJobs = [] } = useQuery({
    queryKey: ["host-cleaning-jobs", user?.id],
    queryFn: async () => {
      const result = await base44.entities.CleaningJob.filter({ host_id: user?.id });
      return result || [];
    },
    enabled: !!user?.id,
  });

  // Filter bookings for selected year
  const yearBookings = bookings.filter((b) => {
    const year = new Date(b.completed_at).getFullYear();
    return year === selectedYear && b.booking_status === "completed" && b.payment_status === "paid";
  });

  // Filter for selected month
  const monthBookings = yearBookings.filter((b) => {
    const month = String(new Date(b.completed_at).getMonth() + 1).padStart(2, "0");
    return month === selectedMonth;
  });

  // Calculate booking payouts
  const calculatePaymentBreakdown = (bookingList) => {
    const gross = bookingList.reduce((sum, b) => sum + (b.subtotal || b.total_amount), 0);
    const stripeFees = bookingList.reduce((sum, b) => {
      const subtotal = b.subtotal || b.total_amount;
      return sum + (subtotal * (STRIPE_FEE_PERCENTAGE / 100) + STRIPE_FIXED_FEE);
    }, 0);
    const net = gross - stripeFees;
    return { gross, stripeFees, net, count: bookingList.length };
  };

  // Calculate cleaner payments for selected year and month
  const yearCleanerJobs = cleaningJobs.filter((j) => {
    const year = new Date(j.scheduled_date).getFullYear();
    return year === selectedYear && j.status === "completed";
  });

  const monthCleanerJobs = yearCleanerJobs.filter((j) => {
    const month = String(new Date(j.scheduled_date).getMonth() + 1).padStart(2, "0");
    return month === selectedMonth;
  });

  const yearCleanerStats = {
    totalPaid: yearCleanerJobs.reduce((sum, j) => sum + (j.cleaner_price || 0), 0),
    totalCollected: yearCleanerJobs.reduce((sum, j) => sum + (j.host_cleaning_fee || 0), 0),
    jobCount: yearCleanerJobs.length,
  };

  const monthCleanerStats = {
    totalPaid: monthCleanerJobs.reduce((sum, j) => sum + (j.cleaner_price || 0), 0),
    totalCollected: monthCleanerJobs.reduce((sum, j) => sum + (j.host_cleaning_fee || 0), 0),
    jobCount: monthCleanerJobs.length,
  };

  const yearPayouts = calculatePaymentBreakdown(yearBookings);
  const monthPayouts = calculatePaymentBreakdown(monthBookings);

  const availableYears = Array.from(
    { length: currentYear - yearRange[0] + 1 },
    (_, i) => yearRange[0] + i
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8 text-teal-600" />
            <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
          </div>
          <p className="text-gray-600">View your guest earnings and cleaner payments</p>
        </motion.div>

        {/* Year Selector */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Year</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedYear((y) => Math.max(y - 1, yearRange[0]))}
                    disabled={selectedYear <= yearRange[0]}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-transparent px-4 py-2 font-semibold text-lg border-0 focus:outline-none cursor-pointer"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedYear((y) => Math.min(y + 1, currentYear))}
                    disabled={selectedYear >= currentYear}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Year Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-teal-900">Guest Revenue (Bookings)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-700">£{yearPayouts.gross.toFixed(2)}</div>
              <p className="text-xs text-teal-600 mt-1">{yearPayouts.count} bookings</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-red-900">Payment Fees</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Shield className="w-4 h-4 text-red-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Stripe fee for secure payment processing (1.5% + £0.20)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">-£{yearPayouts.stripeFees.toFixed(2)}</div>
              <p className="text-xs text-red-600 mt-1">Security & processing</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-green-900">Net Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">£{yearPayouts.net.toFixed(2)}</div>
              <p className="text-xs text-green-600 mt-1">After fees</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-purple-900">Cleaner Payments</CardTitle>
                <Users className="w-4 h-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">-£{yearCleanerStats.totalPaid.toFixed(2)}</div>
              <p className="text-xs text-purple-600 mt-1">{yearCleanerStats.jobCount} jobs</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Month Selector Tabs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {MONTHS.map((month) => (
                  <button
                    key={month.num}
                    onClick={() => setSelectedMonth(month.num)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      selectedMonth === month.num
                        ? "bg-teal-600 text-white shadow-lg"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {month.name.slice(0, 3)}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Month Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-teal-900">Guest Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-700">£{monthPayouts.gross.toFixed(2)}</div>
              <p className="text-xs text-teal-600 mt-1">{monthPayouts.count} bookings</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-red-900">Payment Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">-£{monthPayouts.stripeFees.toFixed(2)}</div>
              <p className="text-xs text-red-600 mt-1">Deducted</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-green-900">Net Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">£{monthPayouts.net.toFixed(2)}</div>
              <p className="text-xs text-green-600 mt-1">Your take-home</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-purple-900">Cleaner Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">-£{monthCleanerStats.totalPaid.toFixed(2)}</div>
              <p className="text-xs text-purple-600 mt-1">{monthCleanerJobs.length} jobs</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Booking Details */}
        {monthBookings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <CardTitle>Booking Breakdown</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {monthBookings.map((booking) => {
                    const subtotal = booking.subtotal || booking.total_amount;
                    const stripeFee = subtotal * (STRIPE_FEE_PERCENTAGE / 100) + STRIPE_FIXED_FEE;
                    const net = subtotal - stripeFee;
                    return (
                      <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-gray-900">{booking.guest_name}</p>
                            <p className="text-xs text-gray-500">
                              {format(parseISO(booking.check_in), "MMM d")} - {format(parseISO(booking.check_out), "MMM d")}
                            </p>
                          </div>
                          <Badge variant="outline">{booking.nights} nights</Badge>
                        </div>
                        <div className="bg-gray-50 rounded p-3 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Gross</span>
                            <span className="font-medium">£{subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Stripe Fee</span>
                            <span>-£{stripeFee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-green-700 border-t border-gray-200 pt-1 mt-1">
                            <span>You Get</span>
                            <span>£{net.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Cleaner Payment Details */}
        {monthCleanerJobs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <CardTitle>Cleaner Payments</CardTitle>
                </div>
                <CardDescription>Cost of cleaning services used</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {monthCleanerJobs.map((job) => (
                    <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">Cleaning Job</p>
                          <p className="text-xs text-gray-500">{format(parseISO(job.scheduled_date), "MMM d, yyyy")}</p>
                        </div>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                      <div className="bg-gray-50 rounded p-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fee Collected</span>
                          <span className="font-medium text-teal-700">£{(job.host_cleaning_fee || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-purple-600">
                          <span>Cleaner Paid</span>
                          <span>-£{(job.cleaner_price || 0).toFixed(2)}</span>
                        </div>
                        {(job.host_cleaning_fee || 0) !== (job.cleaner_price || 0) && (
                          <div className="flex justify-between font-bold text-green-700 border-t border-gray-200 pt-1 mt-1">
                            <span>Your Margin</span>
                            <span>
                              £{((job.host_cleaning_fee || 0) - (job.cleaner_price || 0)).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Empty State */}
        {monthBookings.length === 0 && monthCleanerJobs.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No activity in {MONTHS.find(m => m.num === selectedMonth)?.name} {selectedYear}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}