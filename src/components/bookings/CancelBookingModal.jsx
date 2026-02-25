import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";

export default function CancelBookingModal({ booking, open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

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
      await base44.entities.CancellationLog.create({
        booking_id: booking.id,
        cancelled_by: user.id,
        cancellation_date: new Date().toISOString(),
        check_in_date: booking.check_in,
        days_before_check_in: refundDetails.daysUntilCheckIn,
        applied_policy_name: booking.cancellation_policy_snapshot?.policy_name || "Unknown",
        original_nightly_total: refundDetails.nightlyTotal,
        original_cleaning_fee: booking.cleaning_fee || 0,
        original_service_fee: booking.service_fee || 0,
        accommodation_refund: refundDetails.accommodationRefund,
        cleaning_fee_refund: refundDetails.cleaningRefund,
        service_fee_refund: refundDetails.serviceRefund,
        total_refund_amount: refundDetails.totalRefund,
        host_payout_adjustment: refundDetails.totalRefund * -1,
        platform_fee_clawback: refundDetails.serviceRefund * -1
      });

      await base44.entities.Booking.update(booking.id, {
        booking_status: "cancelled",
        refund_amount: refundDetails.totalRefund,
        host_payout_adjustment: refundDetails.totalRefund * -1,
        platform_fee_clawback: refundDetails.serviceRefund * -1
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

  if (!booking || !refundDetails) {
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
              <span className="font-bold text-emerald-600 text-lg">£{refundDetails.totalRefund.toFixed(2)}</span>
            </div>
          </div>
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