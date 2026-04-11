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
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [yearRange, setYearRange] = useState([currentYear - 2, currentYear]);
  const [hostStartDate, setHostStartDate] = useState(null);
  const [financialYearStart, setFinancialYearStart] = useState(new Date(currentYear, 3, 6));
  const [financialYearEnd, setFinancialYearEnd] = useState(new Date(currentYear + 1, 3, 5));
  const [exporting, setExporting] = useState(false);

  // Reset month to full year when year changes
  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
    setSelectedMonth(null);
  };

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

  // Set year range based on host signup date
  useEffect(() => {
    if (user?.created_date) {
      const startDate = new Date(user.created_date);
      setHostStartDate(startDate);
      setYearRange([startDate.getFullYear(), currentYear]);
      setSelectedYear(currentYear);
    }
  }, [user?.created_date, currentYear]);

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

  // Show year or month data depending on selection
  const displayedBookings = selectedMonth
    ? yearBookings.filter((b) => {
        const month = String(new Date(b.completed_at).getMonth() + 1).padStart(2, "0");
        return month === selectedMonth;
      })
    : yearBookings;

  const displayedCleanerJobs = selectedMonth
    ? yearCleanerJobs.filter((j) => {
        const month = String(new Date(j.scheduled_date).getMonth() + 1).padStart(2, "0");
        return month === selectedMonth;
      })
    : yearCleanerJobs;

  const displayedPayouts = calculatePaymentBreakdown(displayedBookings);
  const displayedCleanerStats = {
    totalPaid: displayedCleanerJobs.reduce((sum, j) => sum + (j.cleaner_price || 0), 0),
    totalCollected: displayedCleanerJobs.reduce((sum, j) => sum + (j.host_cleaning_fee || 0), 0),
    jobCount: displayedCleanerJobs.length,
  };

  // Only show years that have actual bookings or cleaning jobs
  const yearsWithData = new Set();
  bookings.forEach((b) => yearsWithData.add(new Date(b.created_date).getFullYear()));
  cleaningJobs.forEach((j) => yearsWithData.add(new Date(j.scheduled_date).getFullYear()));
  
  const availableYears = Array.from(
    { length: currentYear - yearRange[0] + 1 },
    (_, i) => yearRange[0] + i
  );

  // Filter months available for selected year
  const getAvailableMonths = () => {
    const months = MONTHS;
    if (!hostStartDate || selectedYear < hostStartDate.getFullYear()) return months;
    if (selectedYear === hostStartDate.getFullYear()) {
      return months.filter((m) => parseInt(m.num) >= hostStartDate.getMonth() + 1);
    }
    return months;
  };

  const availableMonths = getAvailableMonths();

  // Filter bookings and jobs by financial year
  const filteredBookingsForExport = bookings.filter((b) => {
    const completedDate = new Date(b.completed_at);
    return (
      completedDate >= financialYearStart &&
      completedDate <= financialYearEnd &&
      b.booking_status === "completed" &&
      b.payment_status === "paid"
    );
  });

  const filteredJobsForExport = cleaningJobs.filter((j) => {
    const jobDate = new Date(j.scheduled_date);
    return jobDate >= financialYearStart && jobDate <= financialYearEnd && j.status === "completed";
  });

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke("generateFinancialReportPDF", {
        hostName: user?.full_name,
        financialYearStart: financialYearStart.toISOString(),
        financialYearEnd: financialYearEnd.toISOString(),
        bookings: filteredBookingsForExport,
        cleaningJobs: filteredJobsForExport,
      });
      // Create blob from PDF buffer and download
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${response.data.pdf}`;
      link.download = `Financial_Report_${financialYearStart.getFullYear()}-${financialYearEnd.getFullYear()}.pdf`;
      link.click();
    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  };

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

        {/* Financial Year Selector & Export */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Financial Year Report</CardTitle>
                <Button
                  onClick={handleExportPDF}
                  disabled={exporting || filteredBookingsForExport.length === 0}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {exporting ? "Generating PDF..." : "📄 Export to PDF"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Financial Year Start</label>
                  <input
                    type="date"
                    value={financialYearStart.toISOString().split("T")[0]}
                    onChange={(e) => setFinancialYearStart(new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Financial Year End</label>
                  <input
                    type="date"
                    value={financialYearEnd.toISOString().split("T")[0]}
                    onChange={(e) => setFinancialYearEnd(new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              {filteredBookingsForExport.length > 0 && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-700">
                  ✓ {filteredBookingsForExport.length} bookings + {filteredJobsForExport.length} cleaning jobs ready for export
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Notice - Show if no bookings yet */}
        {displayedBookings.length === 0 && displayedCleanerJobs.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              <p className="font-medium mb-1">📊 Data will populate here</p>
              <p>Your financial data will appear once you've made your first booking payment or subscription payment. This dashboard shows your earnings, cleaner payments, and financial summaries.</p>
            </div>
          </motion.div>
        )}

        {/* Browse by Calendar Year */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Browse by Calendar Year</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Select calendar year</p>
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2 w-full sm:w-fit">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleYearChange(Math.max(selectedYear - 1, yearRange[0]))}
                      disabled={selectedYear <= yearRange[0]}
                      className="h-8 w-8 flex-shrink-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <select
                      value={selectedYear}
                      onChange={(e) => handleYearChange(Number(e.target.value))}
                      className="bg-transparent flex-1 sm:flex-none px-2 py-2 font-semibold text-lg border-0 focus:outline-none cursor-pointer min-w-0"
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
                      onClick={() => handleYearChange(Math.min(selectedYear + 1, currentYear))}
                      disabled={selectedYear >= currentYear}
                      className="h-8 w-8 flex-shrink-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Browse Calendar Month</p>
                  <div className="bg-gray-100 rounded-lg p-2 w-full sm:w-fit">
                    <select
                      value={selectedMonth || ""}
                      onChange={(e) => setSelectedMonth(e.target.value || null)}
                      className="bg-transparent w-full sm:w-auto px-3 py-2 font-semibold text-lg border-0 focus:outline-none cursor-pointer"
                    >
                      <option value="">All</option>
                      {availableMonths.map((month) => (
                        <option key={month.num} value={month.num}>
                          {month.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {selectedYear && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-6">
                  <div className="border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-teal-50 p-3 rounded-lg">
                        <p className="text-xs text-teal-600 font-medium">Revenue from Renting</p>
                        <p className="text-lg font-bold text-teal-700">£{displayedPayouts.gross.toFixed(2)}</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-xs text-purple-600 font-medium">Cleaner Expense</p>
                        <p className="text-lg font-bold text-purple-700">-£{displayedCleanerStats.totalPaid.toFixed(2)}</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-xs text-red-600 font-medium">Other Expenses</p>
                        <p className="text-lg font-bold text-red-700">-£{displayedPayouts.stripeFees.toFixed(2)}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-green-600 font-medium">Total Net Profit</p>
                        <p className="text-lg font-bold text-green-700">£{(displayedPayouts.net - displayedCleanerStats.totalPaid).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Booking Details */}
        {displayedBookings.length > 0 && (
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
                  {displayedBookings.map((booking) => {
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
                             <span>Other Expenses</span>
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
        {displayedCleanerJobs.length > 0 && (
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
                  {displayedCleanerJobs.map((job) => (
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
        {displayedBookings.length === 0 && displayedCleanerJobs.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">
                  No activity {selectedMonth ? `in ${MONTHS.find(m => m.num === selectedMonth)?.name} ${selectedYear}` : `in ${selectedYear}`}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}