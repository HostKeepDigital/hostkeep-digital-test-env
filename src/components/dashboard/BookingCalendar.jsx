import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Info, Edit, X, Calendar as CalendarIcon, MessageSquare, CreditCard, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, differenceInDays, startOfWeek, endOfWeek, parseISO, addMonths, subMonths } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function BookingCalendar({ bookings = [], properties = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockDates, setBlockDates] = useState({ start: "", end: "", reason: "", property_id: "" });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getProperty = (id) => properties.find(p => p.id === id) || {};

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
    setIsDrawerOpen(true);
  };

  const handleBlockDates = async () => {
    if (!blockDates.property_id || !blockDates.start || !blockDates.end) {
      toast.error("Please select property and dates.");
      return;
    }
    
    if (isBefore(parseISO(blockDates.end), parseISO(blockDates.start))) {
      toast.error("End date cannot be before start date.");
      return;
    }
    
    setIsBlocking(true);
    try {
      const prop = getProperty(blockDates.property_id);
      
      await base44.entities.Booking.create({
        property_id: blockDates.property_id,
        host_id: prop.owner_id,
        guest_name: "Blocked Date",
        guest_email: "blocked@system.com",
        check_in: blockDates.start,
        check_out: blockDates.end,
        total_amount: 0,
        booking_status: "blocked",
        payment_status: "paid",
        special_requests: blockDates.reason || "Manual Block"
      });
      
      toast.success("Dates blocked successfully");
      setIsBlockModalOpen(false);
      setBlockDates({ start: "", end: "", reason: "", property_id: "" });
      queryClient.invalidateQueries({ queryKey: ['host-bookings'] });
    } catch (e) {
      toast.error("Failed to block dates");
    } finally {
      setIsBlocking(false);
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-500 border-blue-600 text-white';
      case 'pending': return 'bg-amber-400 border-amber-500 text-white';
      case 'cancelled': return 'bg-red-500 border-red-600 text-white line-through opacity-70';
      case 'blocked': return 'bg-gray-500 border-gray-600 text-white';
      default: return 'bg-teal-500 border-teal-600 text-white';
    }
  };

  const renderBookingDrawer = () => {
    if (!selectedBooking) return null;
    const prop = getProperty(selectedBooking.property_id);
    const nights = differenceInDays(parseISO(selectedBooking.check_out), parseISO(selectedBooking.check_in));
    
    return (
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <div className="flex justify-between items-start">
              <div className="text-left">
                <SheetTitle className="text-2xl">{selectedBooking.guest_name}</SheetTitle>
                <SheetDescription>{prop.title || 'Unknown Property'}</SheetDescription>
              </div>
              <Badge className={getStatusColor(selectedBooking.booking_status)}>
                {selectedBooking.booking_status.toUpperCase()}
              </Badge>
            </div>
          </SheetHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <p className="text-sm text-gray-500">Check-in</p>
                <p className="font-semibold">{format(parseISO(selectedBooking.check_in), "MMM do, yyyy")}</p>
                <p className="text-xs text-gray-500">{prop.check_in_time || '15:00'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Check-out</p>
                <p className="font-semibold">{format(parseISO(selectedBooking.check_out), "MMM do, yyyy")}</p>
                <p className="text-xs text-gray-500">{prop.check_out_time || '11:00'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Nights</p>
                <p className="font-semibold">{nights}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Guests</p>
                <p className="font-semibold">{selectedBooking.guests_count || 1}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4"/> Payment Info</h3>
              <div className="bg-white border rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-semibold text-base">£{selectedBooking.total_amount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status</span>
                  <Badge variant="outline" className="bg-gray-50">{selectedBooking.payment_status}</Badge>
                </div>
              </div>
            </div>

            {selectedBooking.special_requests && (
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2"><Info className="w-4 h-4"/> Special Requests</h3>
                <p className="text-sm bg-amber-50 text-amber-900 p-3 rounded-xl border border-amber-100">
                  {selectedBooking.special_requests}
                </p>
              </div>
            )}

            <div className="pt-4 flex flex-col gap-2">
              <Button className="w-full bg-teal-600 hover:bg-teal-700">
                <MessageSquare className="w-4 h-4 mr-2" /> Message Guest
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  Modify
                </Button>
                <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  const getDeadPropertiesForDate = (date) => {
    const dayName = format(date, 'EEEE').toLowerCase();
    return properties.filter(p => {
      if (!p.day_based_restrictions_enabled || !p.booking_rules) return false;
      const rule = p.booking_rules[dayName];
      if (!rule || !rule.enabled) return false;
      const type = rule.rule_type || 'any';
      if (['fixed', 'fixed_or_multiples', 'multiples'].includes(type)) {
         const hasFixed = rule.fixed_values && Array.isArray(rule.fixed_values) && rule.fixed_values.length > 0;
         const hasMultiples = rule.multiple_of && (Array.isArray(rule.multiple_of) ? rule.multiple_of.some(m=>m>0) : rule.multiple_of > 0);
         if (type === 'fixed') return !hasFixed;
         if (type === 'multiples') return !hasMultiples;
         return !(hasFixed || hasMultiples);
      }
      return false;
    });
  };

  const weeks = [];
  let currentWeek = [];
  days.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-gray-900 w-40">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 rounded-lg font-medium" onClick={() => setCurrentMonth(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button onClick={() => setIsBlockModalOpen(true)} variant="outline" className="text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl">
            <CalendarIcon className="w-4 h-4 mr-2" /> Block Dates
          </Button>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50 shadow-sm overflow-x-auto">
          <div className="grid grid-cols-7 border-b bg-white min-w-[600px]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 py-3 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          <div className="flex flex-col min-w-[600px]">
            {weeks.map((week, wIdx) => {
              const weekBookings = bookings.map(booking => {
                if (!booking.check_in || !booking.check_out) return null;
                const checkIn = parseISO(booking.check_in);
                const checkOut = parseISO(booking.check_out);
                
                const weekStart = week[0];
                const weekEnd = week[6];
                
                if (isBefore(checkOut, weekStart) || isBefore(weekEnd, checkIn) || isSameDay(checkOut, weekStart)) return null;

                let startIndex = 0;
                let startDay = checkIn;
                if (isBefore(checkIn, weekStart)) {
                  startDay = weekStart;
                } else {
                  startIndex = week.findIndex(d => isSameDay(d, checkIn));
                }

                let endDay = checkOut;
                if (isBefore(weekEnd, checkOut)) {
                  endDay = weekEnd;
                }
                
                const isStartCell = isSameDay(checkIn, startDay);
                const isEndCell = isSameDay(checkOut, endDay);
                
                const spanDays = differenceInDays(endDay, startDay);
                const leftPercent = (startIndex / 7) * 100 + (isStartCell ? (1/7)*50 : 0);
                const widthPercent = (spanDays / 7) * 100 + (isEndCell ? (1/7)*50 : (1/7)*100) - (isStartCell ? (1/7)*50 : 0);

                return { booking, leftPercent, widthPercent, isStartCell, isEndCell, checkIn, checkOut, startIndex, spanDays };
              }).filter(Boolean);

              weekBookings.sort((a, b) => a.startIndex - b.startIndex || b.spanDays - a.spanDays);

              const placedBookings = [];
              weekBookings.forEach(wb => {
                let row = 0;
                while (placedBookings.some(pb => pb.row === row && !(wb.startIndex >= pb.startIndex + pb.spanDays || pb.startIndex >= wb.startIndex + wb.spanDays))) {
                  row++;
                }
                placedBookings.push({ ...wb, row });
              });

              const maxRows = Math.max(0, ...placedBookings.map(pb => pb.row));
              const rowHeight = Math.max(100, (maxRows + 1) * 36 + 40);

              return (
                <div key={wIdx} className="grid grid-cols-7 relative border-b last:border-b-0" style={{ minHeight: `${rowHeight}px` }}>
                  {week.map(day => {
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    const isToday = isSameDay(day, new Date());
                    const deadProps = getDeadPropertiesForDate(day);
                    
                    return (
                      <div 
                        key={day.toISOString()} 
                        className={`
                          border-r last:border-r-0 p-2 relative transition-colors hover:bg-gray-100/50
                          ${!isCurrentMonth ? 'bg-gray-100/30 text-gray-400' : 'bg-white'}
                          ${isToday ? 'bg-teal-50/20' : ''}
                        `}
                      >
                        <div className="flex justify-between items-start">
                          <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'text-white bg-teal-600' : 'text-gray-600'}`}>
                            {format(day, "d")}
                          </div>
                          {deadProps.length > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help">
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 opacity-70 hover:opacity-100" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-semibold text-red-600 text-xs">Unbookable Configuration</p>
                                  <p className="text-[10px] text-gray-500">No valid durations for:</p>
                                  <ul className="list-disc pl-3 text-[10px] text-gray-600">
                                    {deadProps.map(p => <li key={p.id}>{p.title}</li>)}
                                  </ul>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="absolute top-10 left-0 right-0 bottom-0 pointer-events-none px-1">
                    {placedBookings.map((pb, idx) => {
                      const { booking, leftPercent, widthPercent, isStartCell, isEndCell, checkIn, checkOut } = pb;
                      const prop = getProperty(booking.property_id);
                      const nights = differenceInDays(checkOut, checkIn);
                      const isPast = isBefore(checkOut, startOfDay(new Date()));

                      return (
                        <Tooltip key={`${booking.id}-${wIdx}-${idx}`}>
                          <TooltipTrigger asChild>
                            <div 
                              className={`
                                absolute h-7 flex items-center px-2.5 text-xs font-medium cursor-pointer pointer-events-auto
                                shadow-sm transition-all hover:brightness-110 hover:shadow-md border
                                ${getStatusColor(booking.booking_status)}
                                ${isStartCell ? 'rounded-l-md ml-1' : 'border-l-0'}
                                ${isEndCell ? 'rounded-r-md mr-1' : 'border-r-0'}
                                ${isPast ? 'opacity-50' : 'opacity-100'}
                              `}
                              style={{ 
                                left: `${leftPercent}%`, 
                                width: `calc(${widthPercent}% - ${isStartCell ? '4px' : '0px'} - ${isEndCell ? '4px' : '0px'})`,
                                top: `${pb.row * 34}px`,
                                zIndex: 10 + pb.row
                              }}
                              onClick={() => handleBookingClick(booking)}
                            >
                              <span className="truncate flex-1 font-semibold tracking-tight mix-blend-overlay text-white">{prop.title || 'Property'} • {booking.guest_name}</span>
                              {widthPercent > 20 && booking.total_amount && (
                                <span className="ml-2 font-bold bg-white/20 px-1.5 py-0.5 rounded text-[10px] shadow-sm hidden sm:inline">£{booking.total_amount}</span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="p-0 overflow-hidden w-72 bg-white text-gray-900 border-gray-200 shadow-xl rounded-xl" side="top" sideOffset={10}>
                            <div className="bg-gray-50 border-b p-3">
                              <p className="font-bold text-sm mb-0.5 text-gray-900">{prop.title}</p>
                              <p className="text-gray-500 text-xs">Guest: <span className="font-medium text-gray-900">{booking.guest_name}</span></p>
                            </div>
                            <div className="p-3 bg-white">
                              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                                <div>
                                  <p className="text-gray-500 mb-1">Check-in</p>
                                  <p className="font-semibold">{format(checkIn, "EEEE do MMM")}</p>
                                  <p className="text-gray-500">{prop.check_in_time || '15:00'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 mb-1">Check-out</p>
                                  <p className="font-semibold">{format(checkOut, "EEEE do MMM")}</p>
                                  <p className="text-gray-500">{prop.check_out_time || '11:00'}</p>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-xs border-t pt-3">
                                <span className="text-gray-600">Total Nights: <strong className="text-gray-900">{nights}</strong></span>
                                <span className="text-gray-400">ID: #{booking.id.slice(0,6)}</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium px-2">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" /> Confirmed</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" /> Pending</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-500 shadow-sm" /> Blocked</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" /> Cancelled</div>
        </div>

        <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Block Calendar Dates</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label>Property</Label>
                <Select value={blockDates.property_id} onValueChange={v => setBlockDates(p => ({...p, property_id: v}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={blockDates.start} onChange={e => setBlockDates(p => ({...p, start: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={blockDates.end} onChange={e => setBlockDates(p => ({...p, end: e.target.value}))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Select value={blockDates.reason} onValueChange={v => setBlockDates(p => ({...p, reason: v}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="owner_stay">Owner Stay</SelectItem>
                    <SelectItem value="private_event">Private Event</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBlockModalOpen(false)} disabled={isBlocking}>Cancel</Button>
              <Button onClick={handleBlockDates} disabled={isBlocking} className="bg-gray-900 text-white hover:bg-gray-800">
                {isBlocking ? 'Blocking...' : 'Block Dates'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {renderBookingDrawer()}
      </motion.div>
    </TooltipProvider>
  );
}