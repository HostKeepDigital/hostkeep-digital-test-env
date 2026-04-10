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
  CardFooter,
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
  Link as LinkIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { createPageUrl } from "@/utils";
import { Link, useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STRIPE_FEE_PERCENTAGE = 1.5; // Payment security commission
const HOSTKEEP_COMMISSION = 0; // Zero commission
const STRIPE_FIXED_FEE = 0.20; // Per-transaction fee

export default function HostPayoutHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stripeStatus, setStripeStatus] = useState(null);
  const [upcomingPayouts, setUpcomingPayouts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const itemsPerPage = 10;

  // Fetch Stripe Connect status
  const { data: stripeData, isLoading: stripeLoading } = useQuery({
    queryKey: ["stripe-status", user?.id],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke("getStripeConnectStatus", {});
        return res.data;
      } catch (err) {
        console.error("Failed to fetch Stripe status:", err);
        return null;
      }
    },
    enabled: !!user?.id,
  });

  // Fetch bookings to calculate payouts
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["host-bookings-payout", user?.id],
    queryFn: async () => {
      const result = await base44.entities.Booking.filter({ host_id: user?.id });
      return result || [];
    },
    enabled: !!user?.id,
  });

  // Calculate payout breakdowns
  useEffect(() => {
    if (!bookings.length) return;

    // Get completed bookings with paid status
    const completedPayments = bookings
      .filter((b) => b.booking_status === "completed" && b.payment_status === "paid")
      .map((b) => {
        const subtotal = b.subtotal || b.total_amount;
        const stripeFee = subtotal * (STRIPE_FEE_PERCENTAGE / 100) + STRIPE_FIXED_FEE;
        const hostkeepFee = 0; // Zero commission
        const totalFees = stripeFee + hostkeepFee;
        const netPayout = subtotal - totalFees;

        return {
          id: b.id,
          booking_id: b.id,
          guest_name: b.guest_name,
          check_in: b.check_in,
          check_out: b.check_out,
          subtotal,
          stripe_fee: stripeFee,
          hostkeep_fee: hostkeepFee,
          total_fees: totalFees,
          net_payout: netPayout,
          completed_at: b.completed_at,
          payout_triggered_at: b.payout_triggered_at,
          payment_status: b.payment_status,
        };
      })
      .sort((a, b) => new Date(b.check_out) - new Date(a.check_out));

    // Simulate upcoming payouts (in real system, fetch from Stripe)
    const upcoming = completedPayments.slice(0, 3).map((p) => ({
      ...p,
      status: "pending",
      expected_date: new Date(new Date(p.check_out).getTime() + 2 * 24 * 60 * 60 * 1000),
    }));

    setUpcomingPayouts(upcoming);
  }, [bookings]);

  const totalEarnings = bookings
    .filter((b) => b.booking_status === "completed" && b.payment_status === "paid")
    .reduce((sum, b) => sum + (b.subtotal || b.total_amount), 0);

  const totalStripeFees = bookings
    .filter((b) => b.booking_status === "completed" && b.payment_status === "paid")
    .reduce((sum, b) => {
      const subtotal = b.subtotal || b.total_amount;
      return sum + (subtotal * (STRIPE_FEE_PERCENTAGE / 100) + STRIPE_FIXED_FEE);
    }, 0);

  const totalPayout = totalEarnings - totalStripeFees;

  // Filter by selected month
  const filteredPayments = bookings
    .filter((b) => b.booking_status === "completed" && b.payment_status === "paid")
    .filter((b) => {
      const paymentDate = b.completed_at?.slice(0, 7); // YYYY-MM
      return paymentDate === selectedMonth;
    })
    .map((b) => {
      const subtotal = b.subtotal || b.total_amount;
      const stripeFee = subtotal * (STRIPE_FEE_PERCENTAGE / 100) + STRIPE_FIXED_FEE;
      return {
        id: b.id,
        guest_name: b.guest_name,
        subtotal,
        stripe_fee: stripeFee,
        net_payout: subtotal - stripeFee,
        completed_at: b.completed_at,
      };
    })
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    setCurrentPage(1);
  };

  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));

  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8 text-teal-600" />
            <h1 className="text-3xl font-bold text-gray-900">Payout History</h1>
          </div>
          <p className="text-gray-600">
            View your earnings, payment security commissions, and upcoming transfers
          </p>
        </motion.div>

        {/* Stripe Status Alert */}
        {stripeData?.status !== "connected" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">
                Connect Your Payout Account
              </h3>
              <p className="text-sm text-amber-800 mb-3">
                You haven't connected your Stripe account yet. To receive payouts, please connect your account.
              </p>
              <Link to={createPageUrl("Subscription")}>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                  Connect Stripe Account
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-teal-900">Total Gross Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-teal-700 mb-1">£{totalEarnings.toFixed(2)}</div>
                <p className="text-xs text-teal-600">From all completed bookings</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-red-900">Payment Security Fee</CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Shield className="w-4 h-4 text-red-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Stripe's payment processing fee. This covers fraud prevention, secure transfers, and payment guarantees for all users.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-700 mb-1">£{totalStripeFees.toFixed(2)}</div>
                <p className="text-xs text-red-600">Payment security & processing</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-green-900">Net Payout (You Keep)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-700 mb-1">£{totalPayout.toFixed(2)}</div>
                <p className="text-xs text-green-600">Your actual take-home earnings</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Fee Breakdown Explainer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6"
        >
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <HelpCircle className="w-6 h-6 text-blue-600 mt-0.5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-3">How Your Earnings Are Calculated</h3>
              <div className="space-y-3 text-sm text-blue-800">
                <div>
                  <p className="font-medium text-blue-900 mb-1">1. Gross Booking Amount</p>
                  <p className="text-blue-700">Example: Guest pays £100 for a stay</p>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-blue-600 flex-shrink-0" />
                </div>
                <div>
                  <p className="font-medium text-blue-900 mb-1">2. Stripe Payment Security Fee (Deducted)</p>
                  <p className="text-blue-700">
                    <strong>This is NOT a HostKeep commission.</strong> Stripe charges 1.5% + £0.20 per transaction to cover:
                  </p>
                  <ul className="list-disc list-inside mt-1 ml-2 text-blue-700 space-y-0.5">
                    <li>Advanced fraud detection & prevention</li>
                    <li>Secure payment processing</li>
                    <li>Chargeback protection</li>
                    <li>PCI compliance & encryption</li>
                    <li>Payment guarantee for both parties</li>
                  </ul>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-blue-600 flex-shrink-0" />
                </div>
                <div>
                  <p className="font-medium text-blue-900 mb-1">3. Your Net Payout (You Keep 100% Commission-Free)</p>
                  <p className="text-blue-700">
                    <strong>HostKeep keeps 0% commission.</strong> The full amount (after payment security fee) goes to you.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Upcoming Payouts */}
        {upcomingPayouts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-600" />
                  <CardTitle>Upcoming Payouts</CardTitle>
                </div>
                <CardDescription>Transfers expected in the next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingPayouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          Booking from {payout.guest_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(parseISO(payout.check_out), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-700">
                          +£{payout.net_payout.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Expected {format(payout.expected_date, "MMM d")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Completed Payouts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                <CardTitle>Payment History</CardTitle>
              </div>
              <CardDescription>
                All completed bookings and their breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Filter by month:</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {filteredPayments.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500">No payments in {selectedMonth}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {paginatedPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-500">Guest</p>
                            <p className="font-semibold text-gray-900">
                              {payment.guest_name}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Date</p>
                            <p className="font-medium text-gray-900">
                              {format(parseISO(payment.completed_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Gross Amount</span>
                            <span className="font-medium">£{payment.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-200">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600">Payment Security Fee</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Stripe's fee for secure payment processing</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <span className="font-medium text-red-600">
                              -£{payment.stripe_fee.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-base font-bold text-green-700 border-t border-gray-200 pt-2">
                            <span>You Receive</span>
                            <span>£{payment.net_payout.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages || 1} ({filteredPayments.length} total)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}