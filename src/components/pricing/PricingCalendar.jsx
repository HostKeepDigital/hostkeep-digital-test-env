import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PricingCalendar({ pricingSettings, onDateClick, selectedDates = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calculatePrice = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

    // Priority 1: Manual override
    if (pricingSettings?.date_overrides?.[dateStr]) {
      return pricingSettings.date_overrides[dateStr].rate;
    }

    // Priority 2: Seasonal rules
    if (pricingSettings?.seasons) {
      for (const season of pricingSettings.seasons) {
        const start = parseISO(season.start_date);
        const end = parseISO(season.end_date);
        
        if (date >= start && date <= end) {
          let rate = season.nightly_rate;
          if (isWeekend && season.weekend_modifier) {
            rate = rate * (1 + season.weekend_modifier / 100);
          }
          return applyRounding(rate);
        }
      }
    }

    // Priority 3: Weekday/Weekend rates
    if (isWeekend && pricingSettings?.weekend_rate) {
      return applyRounding(pricingSettings.weekend_rate);
    }
    if (!isWeekend && pricingSettings?.weekday_rate) {
      return applyRounding(pricingSettings.weekday_rate);
    }

    // Priority 4: Base rate
    return applyRounding(pricingSettings?.base_rate || 0);
  };

  const applyRounding = (price) => {
    if (!pricingSettings?.price_rounding) return Math.round(price);
    const rounding = pricingSettings.price_rounding;
    return Math.round(price / rounding) * rounding;
  };

  const getPriceColor = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    if (pricingSettings?.date_overrides?.[dateStr]) {
      return "bg-purple-100 text-purple-700 border-purple-300";
    }

    if (pricingSettings?.seasons) {
      for (const season of pricingSettings.seasons) {
        const start = parseISO(season.start_date);
        const end = parseISO(season.end_date);
        if (date >= start && date <= end) {
          return "bg-blue-100 text-blue-700 border-blue-300";
        }
      }
    }

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    
    if (isWeekend && pricingSettings?.weekend_rate) {
      return "bg-green-100 text-green-700 border-green-300";
    }

    return "bg-gray-50 text-gray-700 border-gray-200";
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Pricing Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-[140px] text-center font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const price = calculatePrice(day);
            const isSelected = selectedDates.some(d => isSameDay(parseISO(d), day));
            const colorClass = getPriceColor(day);
            
            return (
              <button
                key={day.toString()}
                onClick={() => onDateClick?.(format(day, 'yyyy-MM-dd'))}
                className={`
                  p-2 rounded-lg border text-xs transition-all
                  ${!isSameMonth(day, currentMonth) ? 'opacity-30' : 'opacity-100'}
                  ${isSelected ? 'ring-2 ring-teal-500' : ''}
                  ${colorClass}
                  hover:shadow-md hover:scale-105
                `}
              >
                <div className="font-semibold">{format(day, 'd')}</div>
                <div className="font-bold">£{price}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-semibold mb-2">Legend:</div>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-purple-100 border border-purple-300"></div>
              <span>Manual Override</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
              <span>Seasonal Rate</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
              <span>Weekend Rate</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-gray-50 border border-gray-200"></div>
              <span>Base Rate</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}