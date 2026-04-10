import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay, parseISO, isWithinInterval } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// UK School Holidays & Half-term Breaks with ±3 day buffer (2026-2027)
const UK_SCHOOL_HOLIDAYS = [
  // Christmas 2025/2026
  { label: "Christmas 2025", start: new Date(2025, 11, 12), end: new Date(2026, 0, 8), boost: 1.30 },
  // Half-term February 2026
  { label: "Half-term (Feb)", start: new Date(2026, 1, 13), end: new Date(2026, 1, 23), boost: 1.15 },
  // Easter 2026
  { label: "Easter", start: new Date(2026, 3, 3), end: new Date(2026, 3, 23), boost: 1.25 },
  // Half-term May 2026
  { label: "Half-term (May)", start: new Date(2026, 4, 22), end: new Date(2026, 5, 1), boost: 1.20 },
  // Summer 2026
  { label: "Summer", start: new Date(2026, 6, 12), end: new Date(2026, 8, 4), boost: 1.35 },
  // Half-term October 2026
  { label: "Half-term (Oct)", start: new Date(2026, 9, 16), end: new Date(2026, 9, 26), boost: 1.20 },
  // Halloween 2026
  { label: "Halloween", start: new Date(2026, 9, 28), end: new Date(2026, 10, 3), boost: 1.15 },
  // Christmas 2026/2027
  { label: "Christmas 2026", start: new Date(2026, 11, 12), end: new Date(2027, 0, 8), boost: 1.30 },
];

export default function PricingCalendar({ pricingSettings, onDateClick, selectedDates = [], onApplyHolidayPricing = null }) {
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

  const getHolidayOverride = (date) => {
    return UK_SCHOOL_HOLIDAYS.find(holiday => isWithinInterval(date, { start: holiday.start, end: holiday.end }));
  };

  const getPriceColor = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = getHolidayOverride(date);
    
    if (pricingSettings?.date_overrides?.[dateStr]) {
      return "bg-purple-100 text-purple-700 border-purple-300";
    }

    if (holiday) {
      return "bg-orange-100 text-orange-700 border-orange-300";
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
            {onApplyHolidayPricing && (
              <Button
                onClick={() => onApplyHolidayPricing(UK_SCHOOL_HOLIDAYS, pricingSettings)}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auto-fill Holidays
              </Button>
            )}
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
            const holiday = getHolidayOverride(day);
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
                {holiday && (
                  <div className="text-xs font-semibold mt-0.5 truncate leading-tight">
                    {holiday.label}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-semibold mb-2">Legend:</div>
          <div className="flex flex-wrap gap-3 text-xs mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-purple-100 border-2 border-purple-300"></div>
              <span>Manual Override</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-blue-100 border-2 border-blue-300"></div>
              <span>Seasonal Rate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-green-100 border-2 border-green-300"></div>
              <span>Weekend Rate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-gray-50 border-2 border-gray-200"></div>
              <span>Base Rate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-orange-100 border-2 border-orange-300"></div>
              <span>School Holiday</span>
            </div>
            </div>
          <div className="pt-2 border-t border-gray-200">
            <p className="font-semibold text-xs mb-1">Pricing Hierarchy:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs text-gray-600">
              <li>Manual Date Overrides (highest priority)</li>
              <li>Seasonal Rules</li>
              <li>Weekday/Weekend Rates</li>
              <li>Base Rate (fallback)</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}