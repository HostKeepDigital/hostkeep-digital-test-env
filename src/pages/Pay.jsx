import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Home, Calendar, User, Mail, CreditCard, CheckCircle2, AlertCircle, Loader2, Building2, Copy, Check } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { toast } from "sonner";

export default function Pay() {
  const urlParams = new URLSearchParams(window.location.search);
  const paymentLinkId = urlParams.get('id');
  const testMode = urlParams.get('test') === 'true' || !paymentLinkId;

  const [paymentAmount, setPaymentAmount] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading, error } = useQuery({
    queryKey: ['booking-payment', paymentLinkId],
    queryFn: () => base44.entities.Booking.filter({ payment_link_id: paymentLinkId }),
    enabled: !!paymentLinkId && !testMode,
  });

  // Test mode demo booking
  const demoBooking = testMode ? {
    id: 'test-booking',
    guest_name: 'John Smith',
    guest_email: 'john@example.com',
    check_in: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    check_out: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    total_amount: 450.00,
    amount_paid: 150.00,
    payment_status: 'partial',
    payment_link_id: 'TEST-DEMO'
  } : null;

  const booking = testMode ? demoBooking : bookings[0];

  const paymentMutation = useMutation({
    mutationFn: async (data) => {
      if (testMode) {
        // Test mode - just simulate success
        return Promise.resolve();
      }
      
      await base44.entities.Payment.create({
        booking_id: booking.id,
        amount: data.amount,
        payment_method: "bank_transfer",
        payment_date: format(new Date(), "yyyy-MM-dd"),
        reference: data.reference,
        notes: `Guest payment from ${data.name} (${data.email})`
      });

      const newAmountPaid = (booking.amount_paid || 0) + data.amount;
      const newStatus = newAmountPaid >= booking.total_amount ? 'paid' : 'partial';
      
      await base44.entities.Booking.update(booking.id, {
        amount_paid: newAmountPaid,
        payment_status: newStatus
      });
    },
    onSuccess: () => {
      setPaymentComplete(true);
      if (!testMode) {
        queryClient.invalidateQueries({ queryKey: ['booking-payment'] });
      }
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > remainingAmount) {
      toast.error("Please enter a valid payment amount");
      setIsSubmitting(false);
      return;
    }

    paymentMutation.mutate({
      amount,
      name: payerName,
      email: payerEmail,
      reference: paymentReference
    });
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading && !testMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-rose-400" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Booking Not Found</h2>
            <p className="text-gray-500">This payment link may have expired or the booking no longer exists.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remainingAmount = (booking.total_amount || 0) - (booking.amount_paid || 0);
  const nights = differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in));
  const isPaid = booking.payment_status === 'paid';

  // Demo bank details
  const bankDetails = {
    accountName: "Holiday Home Rentals Ltd",
    sortCode: "12-34-56",
    accountNumber: "12345678",
    reference: booking.payment_link_id?.toUpperCase()
  };

  if (paymentComplete || isPaid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </motion.div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {isPaid ? "Fully Paid" : "Payment Confirmed"}
              </h2>
              <p className="text-gray-500 mb-6">
                {isPaid 
                  ? "This booking has been fully paid. Thank you!"
                  : "Thank you for your payment. Your booking is confirmed."}
              </p>
              <div className="bg-gray-50 rounded-xl p-4 text-left">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Guest</p>
                    <p className="font-medium">{booking.guest_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Dates</p>
                    <p className="font-medium">
                      {format(parseISO(booking.check_in), "MMM d")} - {format(parseISO(booking.check_out), "MMM d")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Complete Your Payment</h1>
          <p className="text-gray-500 mt-2">Secure payment for your holiday booking</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{booking.guest_name}</p>
                  <p className="text-sm text-gray-500">{booking.guest_email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {format(parseISO(booking.check_in), "EEEE, MMMM d")} - {format(parseISO(booking.check_out), "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="text-sm text-gray-500">{nights} night{nights !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Amount</span>
                  <span className="font-medium">£{booking.total_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Already Paid</span>
                  <span className="font-medium text-emerald-600">-£{booking.amount_paid?.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Amount Due</span>
                  <span className="text-xl font-bold text-teal-600">£{remainingAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                Bank Transfer Details
              </CardTitle>
              <CardDescription>
                Please make a bank transfer using the details below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Account Name", value: bankDetails.accountName, key: "name" },
                { label: "Sort Code", value: bankDetails.sortCode, key: "sort" },
                { label: "Account Number", value: bankDetails.accountNumber, key: "account" },
                { label: "Payment Reference", value: bankDetails.reference, key: "ref" }
              ].map(({ label, value, key }) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-mono font-medium text-gray-900">{value}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(value, key)}
                    className="h-8 w-8"
                  >
                    {copiedField === key ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-teal-600" />
                Confirm Payment
              </CardTitle>
              <CardDescription>
                Once you've made the bank transfer, please confirm below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payerName">Your Name</Label>
                    <Input
                      id="payerName"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      placeholder="John Smith"
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payerEmail">Your Email</Label>
                    <Input
                      id="payerEmail"
                      type="email"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      placeholder="john@example.com"
                      required
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentAmount">Amount Paid (£)</Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      min="0"
                      max={remainingAmount}
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={remainingAmount.toFixed(2)}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentReference">Bank Reference (optional)</Label>
                    <Input
                      id="paymentReference"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="TXN-123456"
                      className="h-11"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-lg"
                  disabled={isSubmitting || paymentMutation.isPending}
                >
                  {(isSubmitting || paymentMutation.isPending) ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Confirm Payment
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <p className="text-center text-sm text-gray-500">
          Need help? Contact the property owner directly.
        </p>
      </div>
    </div>
  );
}