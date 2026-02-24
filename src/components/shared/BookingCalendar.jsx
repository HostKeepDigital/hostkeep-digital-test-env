import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function BookingCalendar({
  label,
  value,
  onSelect,
  disabled,
  placeholder = "Select date",
  bookedDates = [],
  numberOfMonths = 2
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (date) => {
    onSelect(date);
    setOpen(false);
  };

  return (
    <div>
      {label && <label className="text-xs mb-1 block">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left font-normal">
            <Calendar className="mr-2 h-4 w-4 text-gray-400" />
            {value ? format(typeof value === 'string' ? parseISO(value) : value, "MMM d, yyyy") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={value ? (typeof value === 'string' ? parseISO(value) : value) : undefined}
            onSelect={handleSelect}
            disabled={disabled}
            modifiers={{ booked: bookedDates }}
            modifiersStyles={{
              booked: { 
                backgroundColor: '#FEE2E2', 
                color: '#991B1B',
                textDecoration: 'line-through'
              }
            }}
            className="rounded-md border"
            numberOfMonths={numberOfMonths}
            showOutsideDays={false}
          />
          {bookedDates.length > 0 && (
            <div className="p-3 border-t flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div>
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-teal-600"></div>
                <span>Selected</span>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}