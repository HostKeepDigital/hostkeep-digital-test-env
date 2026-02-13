import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Calendar, X } from "lucide-react";
import { format } from "date-fns";

export default function PaymentForm({ bookingId, maxAmount, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    booking_id: bookingId,
    amount: maxAmount || "",
    payment_method: "bank_transfer",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    reference: "",
    notes: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount) || 0
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">Record Payment</h2>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="amount" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            Amount (£)
          </Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            max={maxAmount}
            value={formData.amount}
            onChange={(e) => handleChange("amount", e.target.value)}
            placeholder="100.00"
            required
            className="h-11"
          />
          {maxAmount && (
            <p className="text-xs text-gray-500">Max: £{maxAmount.toFixed(2)} remaining</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select
            value={formData.payment_method}
            onValueChange={(value) => handleChange("payment_method", value)}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_date" className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            Payment Date
          </Label>
          <Input
            id="payment_date"
            type="date"
            value={formData.payment_date}
            onChange={(e) => handleChange("payment_date", e.target.value)}
            required
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference">Reference / Transaction ID</Label>
          <Input
            id="reference"
            value={formData.reference}
            onChange={(e) => handleChange("reference", e.target.value)}
            placeholder="TXN-123456"
            className="h-11"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Any payment notes..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-teal-600 hover:bg-teal-700">
          {isLoading ? "Recording..." : "Record Payment"}
        </Button>
      </div>
    </motion.form>
  );
}