import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { differenceInDays, differenceInHours, parseISO } from "date-fns";
import { toast } from "sonner";

export default function CancelBookingModal({ booking, open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // 48-hour cooling-off period from point of booking creation
  const isWithinCoolingOff = () => {
    const bookedAt = booking.request_timestamp || booking.created_date;
    if (!bookedAt) return false;
    return differenceInHours(new Date(), new Date(bookedAt)) < 48;
  };

  const coolingOff = booking && open ? isWithinCoolingOff() : false;

  const calculateRefund = () => {
    const checkInDate = parseISO(booking.check_in);
    const now = new Date();
    const daysUntilCheckIn = differenceInDays(checkInDate, now);

    const snapshot = booking.cancellation_policy_snapshot;
    if (!snapshot) return null;

    let accommodationRefundPct = snapshot.final_tier_refund_percentage || 0;
    
    if (daysUntilCheckIn >= (snapshot.tier_1_deadline_days || 0)) {
      accommodationRefundPct = snapshot.tier_1_refund_percentage || 0;
    } else if (daysUntilCheckIn >= (snapshot.tier_2_deadline_days || 0)) {
      accommodationRefundPct = snapshot.tier_2_refund_percentage || 0;
    }

    const nightlyTotal = booking.subtotal || 0;
    const accommodationRefund = (nightlyTotal * accommodationRefundPct) / 100;
    
    const cleaningRefund = snapshot.cleaning_fee_refundable && daysUntilCheckIn >= 0 
      ? (booking.cleaning_fee || 0) 
      : 0;
      
    const serviceRefund = snapshot.service_fee_refundable && daysUntilCheckIn >= 0 
      ? (booking.service_fee || 0) 
      : 0;

    const totalRefund = accommodationRefund + cleaningRefund + serviceRefund;
    
    return {
      daysUntilCheckIn,
      accommodationRefundPct,
      nightlyTotal,
      accommodationRefund,
      cleaningRefund,
      serviceRefund,
      totalRefund
    };
  };

  const refundDetails = booking && open ? calculateRefund() : null;

  const cancelMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);

      // During cooling-off: full refund regardless of policy
      const totalAmount = booking.total_amount || 0;
      const refundAmount = coolingOff ? totalAmount : refundDetails.totalRefund;
      const nightlyTotal = coolingOff ? (booking.subtotal || 0) : refundDetails.nightlyTotal;
      const cleaningRefund = coolingOff ? (booking.cleaning_fee || 0) : refundDetails.cleaningRefund;
      const serviceRefund = coolingOff ? (booking.service_fee || 0) : refundDetails.serviceRefund;
      const policyName = coolingOff ? "48-Hour Cooling-Off Period" : (booking.cancellation_policy_snapshot?.policy_name || "Unknown");

      await base44.entities.CancellationLog.create({
        booking_id: booking.id,
        cancelled_by: user.id,
        cancellation_date: new Date().toISOString(),
        check_in_date: booking.check_in,
        days_before_check_in: coolingOff ? refundDetails?.daysUntilCheckIn : refundDetails.daysUntilCheckIn,
        applied_policy_name: policyName,
        original_nightly_total: nightlyTotal,
        original_cleaning_fee: booking.cleaning_fee || 0,
        original_service_fee: booking.service_fee || 0,
        accommodation_refund: coolingOff ? (booking.subtotal || 0) : refundDetails.accommodationRefund,
        cleaning_fee_refund: cleaningRefund,
        service_fee_refund: serviceRefund,
        total_refund_amount: refundAmount,
        host_payout_adjustment: refundAmount * -1,
        platform_fee_clawback: serviceRefund * -1
      });

      await base44.entities.Booking.update(booking.id, {
        booking_status: "cancelled",
        refund_amount: refundAmount,
        host_payout_adjustment: refundAmount * -1,
        platform_fee_clawback: serviceRefund * -1
      });
      setIsProcessing(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
      toast.success("Booking cancelled successfully.");
      onOpenChange(false);
    },
    onError: () => {
      setIsProcessing(false);
      toast.error("Failed to cancel booking.");
    }
  });

  if (!booking) return null;

  // If no policy snapshot and not in cooling-off, can't proceed
  if (!refundDetails && !coolingOff) {
    if (!booking?.cancellation_policy_snapshot && open) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cannot calculate refund</DialogTitle>
              <DialogDescription>This booking does not have a cancellation policy snapshot. Please contact support.</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
    }
    return null;
  }

  const totalRefundAmount = coolingOff ? (booking.total_amount || 0) : refundDetails.totalRefund;

  return (
    <Dialog open={open} onOpenChange={(val) => !isProcessing && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
            Cancel Booking
          </DialogTitle>
          <DialogDescription>
            Please review the cancellation details and refund breakdown before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {coolingOff ? (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg text-sm">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h4 className="font-semibold text-emerald-800">48-Hour Cooling-Off Period</h4>
              </div>
              <p className="text-emerald-700 mb-2">
                You are within 48 hours of making this booking. You are entitled to a <strong>full refund</strong> regardless of the cancellation policy.
              </p>
              <div className="pt-3 border-t border-emerald-200 flex justify-between font-semibold text-emerald-800">
                <span>Total Refund</span>
                <span className="text-lg">£{totalRefundAmount.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <h4 className="font-semibold text-gray-900 mb-2">Policy: {booking.cancellation_policy_snapshot?.policy_name}</h4>
                <p className="text-gray-600 mb-2">{booking.cancellation_policy_snapshot?.description}</p>
                <p className="text-gray-900 font-medium">
                  You are cancelling {refundDetails.daysUntilCheckIn} days before check-in.
                </p>
              </div>

              <div className="border border-gray-100 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-900">Refund Breakdown</h4>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Accommodation ({refundDetails.accommodationRefundPct}%)</span>
                  <span className="font-medium">£{refundDetails.accommodationRefund.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cleaning Fee</span>
                  <span className="font-medium">£{refundDetails.cleaningRefund.toFixed(2)}</span>
                </div>
                
                {booking.service_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Service Fee</span>
                    <span className="font-medium">£{refundDetails.serviceRefund.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="pt-3 mt-3 border-t border-gray-100 flex justify-between">
                  <span className="font-semibold text-gray-900">Total Refund</span>
                  <span className="font-bold text-emerald-600 text-lg">£{totalRefundAmount.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Keep Booking</Button>
          <Button variant="destructive" onClick={() => cancelMutation.mutate()} disabled={isProcessing}>
            {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelling...</> : "Confirm Cancellation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}