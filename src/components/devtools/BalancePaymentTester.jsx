import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function BalancePaymentTester() {
  const [loading, setLoading] = useState(false);
  const [testBookings, setTestBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [testResults, setTestResults] = useState([]);

  // Create test booking with failed balance payment
  const createTestBooking = async () => {
    setLoading(true);
    try {
      const sessionToken = localStorage.getItem("session_token") || sessionStorage.getItem("session_token");
      const sessionRes = await base44.functions.invoke("checkSession", { session_token: sessionToken });
      const user = sessionRes?.data;
      if (!user?.authenticated || !user?.user_id) {
        toast.error("User not authenticated");
        setLoading(false);
        return;
      }

      // Get or create a test property
      const properties = await base44.entities.Property.filter(
        { owner_id: user.user_id },
        "-created_date",
        1
      );

      if (properties.length === 0) {
        toast.error("No properties found. Create a property first.");
        setLoading(false);
        return;
      }

      const property = properties[0];

      // Create booking with failed balance payment
      const booking = await base44.entities.Booking.create({
        property_id: property.id,
        host_id: user.user_id,
        guest_id: user.user_id,
        guest_name: "Test Guest",
        guest_email: "test@example.com",
        guest_phone: "01234567890",
        check_in: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        check_out: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        nights: 7,
        nightly_rate: 100,
        subtotal: 700,
        cleaning_fee: 50,
        security_deposit: 200,
        service_fee: 30,
        total_amount: 980,
        payment_status: "pending",
        booking_status: "confirmed",
        balance_payment_status: "failed",
        balance_failed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        amount_paid: 0,
        deposit_paid: 200,
        deposit_status: "held",
        rental_payment_status: "unpaid",
      });

      setTestBookings([...testBookings, booking]);
      setSelectedBooking(booking);
      addTestResult(
        "✓ Test booking created",
        `ID: ${booking.id}, Balance owed: £${(booking.total_amount - (booking.amount_paid || 0)).toFixed(2)}`
      );
      toast.success("Test booking created");
    } catch (e) {
      toast.error(`Failed to create test booking: ${e.message}`);
      addTestResult("✗ Test booking creation failed", e.message);
    }
    setLoading(false);
  };

  // Simulate payment success
  const simulatePaymentSuccess = async () => {
    if (!selectedBooking) {
      toast.error("Select a test booking first");
      return;
    }

    setLoading(true);
    try {
      await base44.entities.Booking.update(selectedBooking.id, {
        balance_payment_status: "paid",
        amount_paid: selectedBooking.total_amount,
        payment_status: "paid",
      });

      const updated = {
        ...selectedBooking,
        balance_payment_status: "paid",
        amount_paid: selectedBooking.total_amount,
        payment_status: "paid",
      };
      setSelectedBooking(updated);
      setTestBookings(
        testBookings.map((b) => (b.id === selectedBooking.id ? updated : b))
      );

      addTestResult(
        "✓ Payment success simulated",
        `Booking ${selectedBooking.id} marked as paid`
      );
      toast.success("Payment marked as successful");
    } catch (e) {
      toast.error(`Failed to update booking: ${e.message}`);
      addTestResult("✗ Payment success simulation failed", e.message);
    }
    setLoading(false);
  };

  // Simulate payment retry (reset to failed with new timestamp)
  const simulatePaymentRetry = async () => {
    if (!selectedBooking) {
      toast.error("Select a test booking first");
      return;
    }

    setLoading(true);
    try {
      const newFailedAt = new Date(
        Date.now() - 1 * 24 * 60 * 60 * 1000
      ).toISOString();

      await base44.entities.Booking.update(selectedBooking.id, {
        balance_payment_status: "failed",
        balance_failed_at: newFailedAt,
      });

      const updated = {
        ...selectedBooking,
        balance_payment_status: "failed",
        balance_failed_at: newFailedAt,
      };
      setSelectedBooking(updated);
      setTestBookings(
        testBookings.map((b) => (b.id === selectedBooking.id ? updated : b))
      );

      addTestResult(
        "✓ Payment retry simulated",
        `Booking ${selectedBooking.id} reset to failed status`
      );
      toast.success("Payment reset to failed");
    } catch (e) {
      toast.error(`Failed to update booking: ${e.message}`);
      addTestResult("✗ Payment retry simulation failed", e.message);
    }
    setLoading(false);
  };

  // Simulate payment expiration (set failed_at to 8 days ago)
  const simulatePaymentExpiration = async () => {
    if (!selectedBooking) {
      toast.error("Select a test booking first");
      return;
    }

    setLoading(true);
    try {
      const expiredAt = new Date(
        Date.now() - 8 * 24 * 60 * 60 * 1000
      ).toISOString();

      await base44.entities.Booking.update(selectedBooking.id, {
        balance_failed_at: expiredAt,
      });

      const updated = {
        ...selectedBooking,
        balance_failed_at: expiredAt,
      };
      setSelectedBooking(updated);
      setTestBookings(
        testBookings.map((b) => (b.id === selectedBooking.id ? updated : b))
      );

      addTestResult(
        "✓ Payment expiration simulated",
        `Booking ${selectedBooking.id} window expired (8 days old)`
      );
      toast.success("Payment window set to expired");
    } catch (e) {
      toast.error(`Failed to update booking: ${e.message}`);
      addTestResult("✗ Payment expiration simulation failed", e.message);
    }
    setLoading(false);
  };

  // Delete test booking
  const deleteTestBooking = async (bookingId) => {
    setLoading(true);
    try {
      await base44.entities.Booking.delete(bookingId);
      setTestBookings(testBookings.filter((b) => b.id !== bookingId));
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(null);
      }
      addTestResult("✓ Test booking deleted", `ID: ${bookingId}`);
      toast.success("Test booking deleted");
    } catch (e) {
      toast.error(`Failed to delete booking: ${e.message}`);
      addTestResult("✗ Test booking deletion failed", e.message);
    }
    setLoading(false);
  };

  const addTestResult = (title, detail) => {
    setTestResults([
      {
        title,
        detail,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...testResults.slice(0, 9),
    ]);
  };

  const daysRemaining = selectedBooking?.balance_failed_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(selectedBooking.balance_failed_at).getTime() +
            7 * 24 * 60 * 60 * 1000 -
            Date.now()) /
            (24 * 60 * 60 * 1000)
        )
      )
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          Balance Payment Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Bookings List */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Test Bookings ({testBookings.length})
          </label>
          <div className="space-y-2">
            {testBookings.length === 0 ? (
              <p className="text-xs text-gray-500">No test bookings created</p>
            ) : (
              testBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBooking(b)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedBooking?.id === b.id
                      ? "border-orange-400 bg-orange-50"
                      : "border-gray-200 hover:border-orange-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-mono text-gray-600">
                        {b.id.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-gray-700 font-medium mt-1">
                        Balance owed: £
                        {(b.total_amount - (b.amount_paid || 0)).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Status: {b.balance_payment_status}
                      </p>
                      {b.balance_payment_status === "failed" && (
                        <p className="text-xs text-orange-600 mt-0.5">
                          Days remaining: {daysRemaining}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTestBooking(b.id);
                      }}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3 border-t border-gray-200 pt-3">
          <Button
            onClick={createTestBooking}
            disabled={loading}
            className="w-full h-9 bg-orange-500 hover:bg-orange-600 text-white text-sm"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin mr-2" />
            ) : null}
            Create Test Booking
          </Button>

          {selectedBooking && (
            <>
              <Button
                onClick={simulatePaymentSuccess}
                disabled={loading}
                className="w-full h-9 bg-emerald-500 hover:bg-emerald-600 text-white text-sm"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-2" />
                ) : null}
                Simulate Payment Success
              </Button>

              <Button
                onClick={simulatePaymentRetry}
                disabled={loading}
                variant="outline"
                className="w-full h-9 text-sm"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-2" />
                ) : null}
                Reset to Failed
              </Button>

              <Button
                onClick={simulatePaymentExpiration}
                disabled={loading}
                variant="outline"
                className="w-full h-9 text-sm text-red-600 border-red-200 hover:bg-red-50"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-2" />
                ) : null}
                Simulate Expiration
              </Button>
            </>
          )}
        </div>

        {/* Test Results */}
        <div className="border-t border-gray-200 pt-3">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Test Results
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-xs text-gray-500">No test results yet</p>
            ) : (
              testResults.map((result, i) => (
                <div
                  key={i}
                  className={`p-2 rounded text-xs font-mono ${
                    result.title.includes("✓")
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                      : "bg-red-50 border border-red-200 text-red-700"
                  }`}
                >
                  <p className="font-semibold">{result.title}</p>
                  <p className="text-xs opacity-75">{result.detail}</p>
                  <p className="text-xs opacity-50 mt-0.5">{result.timestamp}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}