import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Home, Calendar, Shield, CheckCircle2, AlertCircle, Loader2, Lock } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { createPageUrl } from "@/utils";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ── Inner payment form (must be inside <Elements>) ──────────────────────────
function PaymentForm({ booking, rentalSecret, depositSecret }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const nights = differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in));

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setError(null);

    const card = elements.getElement(CardElement);

    // 1. Confirm rental payment
    const { error: rentalError, paymentIntent: rentalIntent } = await stripe.confirmCardPayment(
      rentalSecret,
      { payment_method: { card } }
    );

    if (rentalError) {
      setError(rentalError.message);
      setPaying(false);
      return;
    }

    // 2. Confirm deposit payment (same card, reuse paymentMethod)
    if (depositSecret) {
      const { error: depositError } = await stripe.confirmCardPayment(
        depositSecret,
        { payment_method: rentalIntent.payment_method }
      );

      if (depositError) {
        setError(depositError.message);
        setPaying(false);
        return;
      }
    }

    setSuccess(true);
    setPaying(false);
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-10"
      >
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment successful</h2>
        <p className="text-gray-500">Your booking is confirmed. Check your email for details.</p>
        <a href={createPageUrl("MyTrips")} className="inline-block mt-6 px-6 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors">
          View My Trips
        </a>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handlePay} className="space-y-6">
      {/* Booking summary */}
      <div className="bg-[#f4f4f5] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <span className="text-sm text-gray-700">
            {format(parseISO(booking.check_in), "d MMM yyyy")} – {format(parseISO(booking.check_out), "d MMM yyyy")}
            <span className="text-gray-400 ml-1">({nights} night{nights !== 1 ? "s" : ""})</span>
          </span>
        </div>

        <div className="border-t border-gray-200 pt-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Rental payment</span>
            <span className="font-semibold text-gray-900">£{booking.total_amount?.toFixed(2)}</span>
          </div>
          {booking.security_deposit > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Security deposit (held, not charged)</span>
              <span className="font-semibold text-gray-900">£{booking.security_deposit?.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stripe card element */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Card details</label>
        <div className="border border-gray-300 rounded-xl px-4 py-3.5 bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#1E3A5F",
                  "::placeholder": { color: "#9ca3af" },
                },
                invalid: { color: "#ef4444" },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-4">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={paying || !stripe}
        className="w-full h-13 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold text-base flex items-center justify-center gap-2 transition-colors"
      >
        {paying ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
        ) : (
          <><Lock className="w-4 h-4" /> Pay £{booking.total_amount?.toFixed(2)}</>
        )}
      </button>

      <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
        <Shield className="w-3 h-3" /> Payments secured by Stripe
      </p>
    </form>
  );
}

// ── Main page component ──────────────────────────────────────────────────────
export default function Pay() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get("booking_id");

  const [booking, setBooking] = useState(null);
  const [rentalSecret, setRentalSecret] = useState(null);
  const [depositSecret, setDepositSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  useEffect(() => {
    if (!bookingId) {
      setPageError("No booking ID provided.");
      setLoading(false);
      return;
    }

    const init = async () => {
      // Load booking
      const bookings = await base44.entities.Booking.filter({ id: bookingId });
      const b = bookings?.[0];
      if (!b) {
        setPageError("Booking not found.");
        setLoading(false);
        return;
      }
      setBooking(b);

      // Create PaymentIntents
      const res = await base44.functions.invoke("createBookingPaymentIntent", { booking_id: bookingId });
      setRentalSecret(res.data.rental_client_secret);
      setDepositSecret(res.data.deposit_client_secret || null);
      setLoading(false);
    };

    init().catch((err) => {
      setPageError(err?.response?.data?.error || err.message || "Failed to load payment.");
      setLoading(false);
    });
  }, [bookingId]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // ── Error ──
  if (pageError) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 text-sm">{pageError}</p>
          <a href={createPageUrl("Home")} className="inline-block mt-6 text-sm text-teal-600 hover:underline">
            Return home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5] py-10 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
            <Home className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Complete your booking</h1>
          <p className="text-gray-500 text-sm mt-1">Secure card payment via Stripe</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <Elements stripe={stripePromise}>
            <PaymentForm
              booking={booking}
              rentalSecret={rentalSecret}
              depositSecret={depositSecret}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}