import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay, parseISO, isWithinInterval, isBefore, isToday, startOfDay, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// UK School Holidays & Half-term Breaks — England & Wales
// Sources: gov.uk/school-term-and-holiday-dates, eparenting.co.uk — verified April 2026
// Dates are the ACTUAL school holiday start/end (Mon–Fri).
// expandHolidayWindow() extends each window to include the surrounding weekend(s)
// and, for bank holiday weekends, rolls forward to include the Monday too.
const UK_SCHOOL_HOLIDAYS_RAW = [
  // ── 2024-2025 Academic Year ──────────────────────────────────────────────
  { label: "Oct Half Term",  start: new Date(2024, 9, 28),  end: new Date(2024, 10, 1),  boost: 1.20, bankHoliday: false },
  { label: "Christmas",      start: new Date(2024, 11, 23), end: new Date(2025, 0, 3),   boost: 1.30, bankHoliday: false },
  { label: "Feb Half Term",  start: new Date(2025, 1, 17),  end: new Date(2025, 1, 21),  boost: 1.15, bankHoliday: false },
  { label: "Easter",         start: new Date(2025, 3, 11),  end: new Date(2025, 3, 25),  boost: 1.28, bankHoliday: false },
  { label: "May Half Term",  start: new Date(2025, 4, 26),  end: new Date(2025, 4, 30),  boost: 1.20, bankHoliday: true  }, // incl. Early May BH
  { label: "Summer",         start: new Date(2025, 6, 22),  end: new Date(2025, 8, 1),   boost: 1.40, bankHoliday: false },

  // ── 2025-2026 Academic Year ──────────────────────────────────────────────
  { label: "Oct Half Term",  start: new Date(2025, 9, 27),  end: new Date(2025, 9, 31),  boost: 1.20, bankHoliday: false },
  { label: "Christmas",      start: new Date(2025, 11, 22), end: new Date(2026, 0, 2),   boost: 1.32, bankHoliday: false },
  { label: "Feb Half Term",  start: new Date(2026, 1, 16),  end: new Date(2026, 1, 20),  boost: 1.15, bankHoliday: false },
  { label: "Easter",         start: new Date(2026, 2, 30),  end: new Date(2026, 3, 13),  boost: 1.28, bankHoliday: false },
  { label: "May Half Term",  start: new Date(2026, 4, 25),  end: new Date(2026, 4, 29),  boost: 1.22, bankHoliday: true  }, // incl. Spring BH
  { label: "Summer",         start: new Date(2026, 6, 20),  end: new Date(2026, 8, 1),   boost: 1.40, bankHoliday: false },

  // ── 2026-2027 Academic Year ──────────────────────────────────────────────
  { label: "Oct Half Term",  start: new Date(2026, 9, 26),  end: new Date(2026, 9, 30),  boost: 1.20, bankHoliday: false },
  { label: "Christmas",      start: new Date(2026, 11, 21), end: new Date(2027, 0, 1),   boost: 1.32, bankHoliday: false },
  { label: "Feb Half Term",  start: new Date(2027, 1, 15),  end: new Date(2027, 1, 19),  boost: 1.15, bankHoliday: false },
  { label: "Easter",         start: new Date(2027, 2, 26),  end: new Date(2027, 3, 9),   boost: 1.28, bankHoliday: false },
  { label: "May Half Term",  start: new Date(2027, 4, 31),  end: new Date(2027, 5, 4),   boost: 1.22, bankHoliday: true  },
  { label: "Summer",         start: new Date(2027, 6, 22),  end: new Date(2027, 8, 1),   boost: 1.40, bankHoliday: false },

  // ── UK Bank Holidays (standalone — not part of school hols) ─────────────
  // New Year's Day
  { label: "New Year's Day", start: new Date(2025, 0, 1),   end: new Date(2025, 0, 1),   boost: 1.25, bankHoliday: true  },
  { label: "New Year's Day", start: new Date(2026, 0, 1),   end: new Date(2026, 0, 1),   boost: 1.25, bankHoliday: true  },
  { label: "New Year's Day", start: new Date(2027, 0, 1),   end: new Date(2027, 0, 1),   boost: 1.25, bankHoliday: true  },
  // Early May Bank Holiday
  { label: "May Bank Holiday", start: new Date(2025, 4, 5),  end: new Date(2025, 4, 5),  boost: 1.22, bankHoliday: true  },
  { label: "May Bank Holiday", start: new Date(2026, 4, 4),  end: new Date(2026, 4, 4),  boost: 1.22, bankHoliday: true  },
  { label: "May Bank Holiday", start: new Date(2027, 4, 3),  end: new Date(2027, 4, 3),  boost: 1.22, bankHoliday: true  },
  // August Bank Holiday
  { label: "Aug Bank Holiday", start: new Date(2025, 7, 25), end: new Date(2025, 7, 25), boost: 1.30, bankHoliday: true  },
  { label: "Aug Bank Holiday", start: new Date(2026, 7, 31), end: new Date(2026, 7, 31), boost: 1.30, bankHoliday: true  },
  { label: "Aug Bank Holiday", start: new Date(2027, 7, 30), end: new Date(2027, 7, 30), boost: 1.30, bankHoliday: true  },
];

// Expand each holiday window:
// - Roll start BACK to the preceding Saturday (includes Sat + Sun before holiday starts)
// - Roll end FORWARD to the following Sunday (includes Sat + Sun after holiday ends)
// - Exception: if bankHoliday=true, roll end forward to the following Monday instead
function expandHolidayWindow(h) {
  let start = new Date(h.start);
  let end = new Date(h.end);

  // Always roll start back to the nearest preceding Saturday
  // (so the weekend before the holiday is included)
  const startDay = start.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  if (startDay !== 6) {
    // Days to subtract to reach the previous Saturday
    const daysBack = startDay === 0 ? 1 : startDay + 1;
    start = subDays(start, daysBack);
  }
  // start is now a Saturday — Sat + Sun before the holiday are included

  // Always roll end forward to the following Sunday,
  // OR to the following Monday if this is a bank holiday weekend
  const endDay = end.getDay();
  const targetEndDay = h.bankHoliday ? 1 : 0; // 1=Mon, 0=Sun

  if (endDay !== targetEndDay) {
    let daysForward;
    if (targetEndDay === 0) {
      // Roll to Sunday
      daysForward = endDay === 0 ? 0 : 7 - endDay;
    } else {
      // Roll to Monday
      daysForward = endDay === 0 ? 1 : endDay === 1 ? 0 : (8 - endDay) % 7 + 1;
    }
    end = addDays(end, daysForward);
  }
  // end is now a Sunday (or Monday for bank holidays) — Sat + Sun after the holiday are included

  return { ...h, start, end };
}

const UK_SCHOOL_HOLIDAYS = UK_SCHOOL_HOLIDAYS_RAW.map(expandHolidayWindow);

export default function PricingCalendar({ pricingSettings, onDateClick, selectedDates = [], currentMonth, onMonthChange }) {
  const [internalMonth, setInternalMonth] = useState(new Date());
  const activeMonth = currentMonth || internalMonth;
  const setActiveMonth = (m) => { if (onMonthChange) onMonthChange(m); else setInternalMonth(m); };

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
    const override = pricingSettings?.date_overrides?.[dateStr];
    
    if (override) {
      return override.holiday
        ? "bg-orange-100 text-orange-700 border-orange-300"
        : "bg-purple-100 text-purple-700 border-purple-300";
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

  const monthStart = startOfMonth(activeMonth);
  const monthEnd = endOfMonth(activeMonth);
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
            <Button variant="outline" size="icon" onClick={() => setActiveMonth(subMonths(activeMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-[140px] text-center font-semibold">
              {format(activeMonth, 'MMMM yyyy')}
            </div>
            <Button variant="outline" size="icon" onClick={() => setActiveMonth(addMonths(activeMonth, 1))}>
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
            const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
            const isTodayDate = isToday(day);
            const colorClass = getPriceColor(day);

            return (
              <button
                key={day.toString()}
                onClick={() => onDateClick?.(format(day, 'yyyy-MM-dd'))}
                className={`
                  p-2 rounded-lg border text-xs transition-all
                  ${!isSameMonth(day, activeMonth) ? 'opacity-20' : ''}
                  ${isPast && !isTodayDate ? 'opacity-40 bg-gray-200 text-gray-400 border-gray-300 saturate-0' : ''}
                  ${!isPast && !isTodayDate ? colorClass : ''}
                  ${isTodayDate ? 'bg-teal-500 text-white border-teal-600 font-bold ring-2 ring-teal-400' : ''}
                  ${isSelected ? 'ring-2 ring-teal-500' : ''}
                  hover:shadow-md hover:scale-105
                `}
              >
                <div className="font-semibold">{format(day, 'd')}</div>
                <div className="font-bold">£{price}</div>
                {!isPast && pricingSettings?.date_overrides?.[format(day, 'yyyy-MM-dd')]?.holiday && (
                  <div className="text-xs font-semibold mt-0.5 truncate leading-tight">
                    {pricingSettings.date_overrides[format(day, 'yyyy-MM-dd')].holiday}
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
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-teal-500 border-2 border-teal-600"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-gray-200 border-2 border-gray-300 opacity-40"></div>
              <span>Past Date</span>
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