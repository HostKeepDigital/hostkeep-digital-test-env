import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, User, Mail, Phone, CreditCard, X } from "lucide-react";

export default function BookingForm({ booking, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(booking || {
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    check_in: "",
    check_out: "",
    total_amount: "",
    deposit_amount: 0,
    deposit_paid: 0,
    remaining_balance: 0,
    amount_paid: 0,
    payment_status: "pending",
    booking_status: "confirmed",
    notes: "",
    payment_link_id: crypto.randomUUID().slice(0, 8)
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const totalAmount = parseFloat(formData.total_amount) || 0;
    const depositAmount = parseFloat(formData.deposit_amount) || 0;
    const depositPaid = parseFloat(formData.deposit_paid) || 0;
    const remainingBalance = totalAmount - depositPaid;
    
    onSubmit({
      ...formData,
      total_amount: totalAmount,
      deposit_amount: depositAmount,
      deposit_paid: depositPaid,
      remaining_balance: remainingBalance,
      amount_paid: parseFloat(formData.amount_paid) || 0
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
        <h2 className="text-xl font-semibold text-gray-900">
          {booking ? "Edit Booking" : "New Booking"}
        </h2>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="guest_name" className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            Guest Name
          </Label>
          <Input
            id="guest_name"
            value={formData.guest_name}
            onChange={(e) => handleChange("guest_name", e.target.value)}
            placeholder="John Smith"
            required
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guest_email" className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            Email
          </Label>
          <Input
            id="guest_email"
            type="email"
            value={formData.guest_email}
            onChange={(e) => handleChange("guest_email", e.target.value)}
            placeholder="john@example.com"
            required
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guest_phone" className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" />
            Phone
          </Label>
          <Input
            id="guest_phone"
            value={formData.guest_phone}
            onChange={(e) => handleChange("guest_phone", e.target.value)}
            placeholder="+44 7123 456789"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="total_amount" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            Total Booking Price (£)
          </Label>
          <Input
            id="total_amount"
            type="text"
            value={formData.total_amount}
            onChange={(e) => {
              const value = e.target.value.replace(/,/g, '');
              handleChange("total_amount", value);
            }}
            placeholder="500.00 or 1,500"
            required
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deposit_amount" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            Deposit Required (£)
          </Label>
          <Input
            id="deposit_amount"
            type="text"
            value={formData.deposit_amount}
            onChange={(e) => {
              const value = e.target.value.replace(/,/g, '');
              handleChange("deposit_amount", value);
            }}
            placeholder="0.00 or 1,000"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deposit_paid" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            Deposit Paid (£)
          </Label>
          <Input
            id="deposit_paid"
            type="text"
            value={formData.deposit_paid}
            onChange={(e) => {
              const value = e.target.value.replace(/,/g, '');
              handleChange("deposit_paid", value);
            }}
            placeholder="0.00 or 500"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            Remaining Balance (£)
          </Label>
          <div className="h-11 px-3 flex items-center bg-gray-50 rounded-md border border-gray-200 font-semibold text-gray-700">
            £{((parseFloat(formData.total_amount) || 0) - (parseFloat(formData.deposit_paid) || 0)).toFixed(2)}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="check_in" className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            Check-in Date
          </Label>
          <Input
            id="check_in"
            type="date"
            value={formData.check_in}
            onChange={(e) => handleChange("check_in", e.target.value)}
            required
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="check_out" className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            Check-out Date
          </Label>
          <Input
            id="check_out"
            type="date"
            value={formData.check_out}
            onChange={(e) => handleChange("check_out", e.target.value)}
            required
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label>Booking Status</Label>
          <Select
            value={formData.booking_status}
            onValueChange={(value) => handleChange("booking_status", value)}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Payment Status</Label>
          <Select
            value={formData.payment_status}
            onValueChange={(value) => handleChange("payment_status", value)}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Any special requests or notes..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-teal-600 hover:bg-teal-700">
          {isLoading ? "Saving..." : booking ? "Update Booking" : "Create Booking"}
        </Button>
      </div>
    </motion.form>
  );
}