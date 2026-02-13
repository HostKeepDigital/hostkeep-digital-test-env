import { motion } from "framer-motion";
import { format, parseISO, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { User, Calendar, MoreVertical, Edit, Trash2, Link2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function BookingList({ bookings = [], onEdit, onDelete }) {
  const statusColors = {
    confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    checked_in: "bg-emerald-50 text-emerald-700 border-emerald-200",
    completed: "bg-gray-50 text-gray-700 border-gray-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200"
  };

  const paymentColors = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    partial: "bg-orange-50 text-orange-700 border-orange-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200"
  };

  const copyPaymentLink = (booking) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/Pay?id=${booking.payment_link_id}`;
    navigator.clipboard.writeText(link);
    toast.success("Payment link copied to clipboard");
  };

  const sortedBookings = [...bookings].sort((a, b) => 
    new Date(b.check_in) - new Date(a.check_in)
  );

  if (bookings.length === 0) {
    return (
      <div className="text-center py-16">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
        <p className="text-gray-500">Create your first booking to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedBookings.map((booking, idx) => {
        const nights = differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in));
        const paidPercentage = booking.total_amount > 0 
          ? Math.round((booking.amount_paid / booking.total_amount) * 100) 
          : 0;

        return (
          <motion.div
            key={booking.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-lg">
                  {booking.guest_name?.charAt(0)?.toUpperCase() || "G"}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{booking.guest_name}</h3>
                  <p className="text-sm text-gray-500">{booking.guest_email}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(parseISO(booking.check_in), "MMM d")} - {format(parseISO(booking.check_out), "MMM d, yyyy")}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span>{nights} night{nights !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900">£{booking.total_amount?.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">
                    £{booking.amount_paid?.toFixed(2)} paid ({paidPercentage}%)
                  </p>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(booking)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copyPaymentLink(booking)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Payment Link
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => window.open(`/Pay?id=${booking.payment_link_id}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Payment Page
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(booking)}
                      className="text-rose-600 focus:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
              <Badge variant="outline" className={statusColors[booking.booking_status]}>
                {booking.booking_status?.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={paymentColors[booking.payment_status]}>
                {booking.payment_status}
              </Badge>
              {booking.notes && (
                <span className="text-sm text-gray-500 ml-auto truncate max-w-xs">
                  {booking.notes}
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}