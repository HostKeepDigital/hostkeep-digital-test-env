import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { CardElement, Elements, useStripe, useElements } from "@stripe/react-stripe-js";

const [stripePromise, setStripePromise] = useState(null);

useEffect(() => {
  base44.functions.invoke('getStripePublishableKey', {})
    .then(res => {
      const key = res.data?.publishable_key;
      if (key) setStripePromise(loadStripe(key));
    });
}, []);

export default function BalancePaymentAlert({
  booking,
  property,
  onPaymentSuccess,
}) {
  const [showModal, setShowModal] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [hoursRemaining, setHoursRemaining] = useState(0);

  // Calculate countdown
  useEffect(() => {
    if (!booking.balance_failed_at) return;

    const updateCountdown = () => {
      const failedAt = new Date(booking.balance_failed_at);
      const deadline = new Date(failedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const diff = deadline - now;

      if (diff <= 0) {
        setDaysRemaining(0);
        setHoursRemaining(0);
      } else {
        setDaysRemaining(Math.floor(diff / (1000 * 60 * 60 * 24)));
        setHoursRemaining(Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [booking.balance_failed_at]);

  const balanceOwed = booking.total_amount - (booking.amount_paid || 0);
  const failedAtDate = new Date(booking.balance_failed_at);
  const failedAtFormatted = failedAtDate.toLocaleDateString("en-GB", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const isSuperStrict =
    booking.cancellation_policy_snapshot?.type === "Super Strict";
  const depositRefund = isSuperStrict
    ? (booking.security_deposit || 0) * 0.5
    : 0;

  const isExpired = daysRemaining === 0 && hoursRemaining === 0;

  if (isExpired && booking.booking_status !== "cancelled") {
    return (
      <div className="bg-red-500 text-white rounded-lg p-4 mb-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Payment window expired</p>
          <p className="text-sm mt-1">
            Your payment window has expired. Your booking is being cancelled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-red-500 text-white rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-1">
                Action required — payment failed
              </h3>
              <p className="text-sm mb-3">
                We were unable to collect your remaining balance of £
                {balanceOwed.toFixed(2)} for your stay at {property?.title}.
                Your booking will be automatically cancelled if payment is not
                received within 7 days of {failedAtFormatted}.
              </p>

              {isSuperStrict && (
                <p className="text-sm bg-red-600 rounded px-2 py-1 mt-2">
                  Please note — if your booking is cancelled, 50% of your
                  deposit (£{depositRefund.toFixed(2)}) will be retained by the
                  host as per the Super Strict cancellation policy you agreed to
                  at booking.
                </p>
              )}

              <p className="text-sm font-medium mt-3">
                Time remaining to pay: {daysRemaining} day
                {daysRemaining !== 1 ? "s" : ""} {hoursRemaining} hour
                {hoursRemaining !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          className="bg-white hover:bg-gray-100 text-red-600 font-semibold w-full"
        >
          Pay remaining balance — £{balanceOwed.toFixed(2)}
        </Button>
      </div>

      {showModal && (
        <BalancePaymentModal
          booking={booking}
          property={property}
          balanceOwed={balanceOwed}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            onPaymentSuccess?.();
          }}
        />
      )}
    </>
  );
}

function BalancePaymentModal({
  booking,
  property,
  balanceOwed,
  onClose,
  onSuccess,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        <ModalContent
          booking={booking}
          property={property}
          balanceOwed={balanceOwed}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
}

function ModalContent({ booking, property, balanceOwed, onClose, onSuccess }) {
  const [cardError, setCardError] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setCardError("Stripe not loaded");
      return;
    }

    setLoading(true);
    setCardError("");

    try {
      // Get payment intent
      const intentRes = await base44.functions.invoke(
        "createBookingPaymentIntent",
        {
          booking_id: booking.id,
          amount: balanceOwed,
          type: "balance",
        }
      );

      const clientSecret = intentRes.data?.rental_client_secret;
      if (!clientSecret) {
        throw new Error("Failed to create payment intent");
      }

      // Confirm payment
      const { paymentIntent, error } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
          },
        });

      if (error) {
        setCardError(error.message || "Payment failed");
        setLoading(false);
        return;
      }

      if (paymentIntent.status === "succeeded") {
        // Update booking
        await base44.entities.Booking.update(booking.id, {
          balance_payment_status: "paid",
          amount_paid: booking.total_amount,
          payment_status: "paid",
        });

        // Notify host
        const host = await base44.entities.User.filter({ id: booking.host_id });
        if (host?.length > 0) {
          await base44.integrations.Core.SendEmail({
            to: host[0].email,
            subject: "Full payment received",
            body: `Full payment has been received from ${booking.guest_name}. Their booking at ${property?.title} is confirmed.`,
          });
        }

        setPaymentSucceeded(true);
        toast.success("Payment received — your booking is confirmed");

        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      }
    } catch (err) {
      setCardError(err.message || "Payment processing failed");
      console.error(err);
    }

    setLoading(false);
  };

  if (paymentSucceeded) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-emerald-600 text-xl">✓</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Payment received
        </h2>
        <p className="text-sm text-gray-600">
          Your booking is confirmed. You'll receive a confirmation email shortly.
        </p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1E3A5F]">
            Pay remaining balance
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Booking Summary */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{property?.title}</span>
            <span className="font-medium text-gray-900">
              {booking.check_in} – {booking.check_out}
            </span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between">
            <span className="text-gray-600">Amount owed</span>
            <span className="font-semibold text-[#0d9488]">
              £{balanceOwed.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Card Input */}
        <div className="border border-gray-300 rounded-lg p-3 bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "14px",
                  color: "#1E3A5F",
                  "::placeholder": {
                    color: "#999",
                  },
                },
                invalid: {
                  color: "#ef4444",
                },
              },
            }}
          />
        </div>

        {/* Note */}
        <p className="text-xs text-gray-500">
          Your saved card will be used if you do not enter a new one.
        </p>

        {/* Error */}
        {cardError && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-xs text-red-600">{cardError}</p>
          </div>
        )}

        {/* Button */}
        <Button
          type="submit"
          disabled={loading || !stripe}
          className="w-full bg-[#0d9488] hover:bg-[#0f766e] text-white font-medium"
        >
          {loading ? "Processing..." : `Pay £${balanceOwed.toFixed(2)}`}
        </Button>
      </form>
    </Elements>
  );
}