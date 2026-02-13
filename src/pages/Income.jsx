import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PoundSterling, Plus, TrendingUp, ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from "date-fns";
import { toast } from "sonner";
import PaymentForm from "@/components/payments/PaymentForm";
import StatsCard from "@/components/dashboard/StatsCard";

export default function Income() {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");

  const queryClient = useQueryClient();

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date'),
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-payment_date'),
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data) => {
      const payment = await base44.entities.Payment.create(data);
      const booking = bookings.find(b => b.id === data.booking_id);
      if (booking) {
        const newAmountPaid = (booking.amount_paid || 0) + data.amount;
        const newStatus = newAmountPaid >= booking.total_amount ? 'paid' : 'partial';
        await base44.entities.Booking.update(booking.id, {
          amount_paid: newAmountPaid,
          payment_status: newStatus
        });
      }
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setShowPaymentForm(false);
      setSelectedBookingId("");
      toast.success("Payment recorded successfully");
    },
  });

  const today = new Date();
  const thisMonth = { start: startOfMonth(today), end: endOfMonth(today) };
  const lastMonth = { start: startOfMonth(subMonths(today, 1)), end: endOfMonth(subMonths(today, 1)) };

  const filterPayments = (paymentList) => {
    if (monthFilter === "all") return paymentList;
    const filterDate = monthFilter === "this_month" ? thisMonth : lastMonth;
    return paymentList.filter(p => 
      isWithinInterval(parseISO(p.payment_date), filterDate)
    );
  };

  const filteredPayments = filterPayments(payments);
  const totalFiltered = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const thisMonthTotal = payments
    .filter(p => isWithinInterval(parseISO(p.payment_date), thisMonth))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const lastMonthTotal = payments
    .filter(p => isWithinInterval(parseISO(p.payment_date), lastMonth))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalAllTime = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const percentChange = lastMonthTotal > 0 
    ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
    : 0;

  const unpaidBookings = bookings.filter(b => 
    b.booking_status !== 'cancelled' && b.payment_status !== 'paid'
  );

  const selectedBooking = bookings.find(b => b.id === selectedBookingId);
  const maxPaymentAmount = selectedBooking 
    ? (selectedBooking.total_amount || 0) - (selectedBooking.amount_paid || 0)
    : 0;

  const methodColors = {
    bank_transfer: "bg-blue-50 text-blue-700 border-blue-200",
    card: "bg-purple-50 text-purple-700 border-purple-200",
    cash: "bg-emerald-50 text-emerald-700 border-emerald-200",
    other: "bg-gray-50 text-gray-700 border-gray-200"
  };

  const getBookingName = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    return booking?.guest_name || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <PoundSterling className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Income</h1>
              <p className="text-gray-500">Track all your rental payments</p>
            </div>
          </div>

          <Button 
            onClick={() => setShowPaymentForm(true)}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="All Time"
            value={`£${totalAllTime.toFixed(2)}`}
            icon={PoundSterling}
            color="emerald"
          />
          <StatsCard
            title="This Month"
            value={`£${thisMonthTotal.toFixed(2)}`}
            icon={TrendingUp}
            color="teal"
            trend={percentChange !== 0 ? {
              positive: percentChange > 0,
              value: `${Math.abs(percentChange)}%`,
              label: "vs last month"
            } : undefined}
          />
          <StatsCard
            title="Last Month"
            value={`£${lastMonthTotal.toFixed(2)}`}
            icon={Calendar}
            color="violet"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
            <div className="flex items-center gap-3">
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-gray-500">
                Total: <span className="font-semibold text-gray-900">£{totalFiltered.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="text-center py-16">
              <PoundSterling className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments recorded</h3>
              <p className="text-gray-500">Record your first payment to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredPayments.map((payment, idx) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{getBookingName(payment.booking_id)}</p>
                        <p className="text-sm text-gray-500">
                          {format(parseISO(payment.payment_date), "MMM d, yyyy")}
                          {payment.reference && ` • ${payment.reference}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={methodColors[payment.payment_method]}>
                        {payment.payment_method?.replace('_', ' ')}
                      </Badge>
                      <span className="text-lg font-semibold text-gray-900">
                        £{payment.amount?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
          <DialogContent className="max-w-2xl">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Select Booking</label>
                <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choose a booking..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unpaidBookings.map(booking => (
                      <SelectItem key={booking.id} value={booking.id}>
                        {booking.guest_name} - £{((booking.total_amount || 0) - (booking.amount_paid || 0)).toFixed(2)} remaining
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBookingId && (
                <PaymentForm
                  bookingId={selectedBookingId}
                  maxAmount={maxPaymentAmount}
                  onSubmit={(data) => createPaymentMutation.mutate(data)}
                  onCancel={() => {
                    setShowPaymentForm(false);
                    setSelectedBookingId("");
                  }}
                  isLoading={createPaymentMutation.isPending}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}