import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { format, eachDayOfInterval, addMonths, parseISO, differenceInDays } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function ExportPricing({ pricingSettings }) {
  const [exportDetailed, setExportDetailed] = useState(false);
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

  const getRuleType = (date, dateStr) => {
    if (pricingSettings?.date_overrides?.[dateStr]) {
      return "Manual Override";
    } else if (pricingSettings?.seasons?.some(s => {
      const start = parseISO(s.start_date);
      const end = parseISO(s.end_date);
      return date >= start && date <= end;
    })) {
      return "Seasonal";
    } else if ((date.getDay() === 0 || date.getDay() === 5 || date.getDay() === 6) && pricingSettings?.weekend_rate) {
      return "Weekend";
    } else if (pricingSettings?.weekday_rate) {
      return "Weekday";
    }
    return "Base Rate";
  };

  const exportGroupedCSV = () => {
    const today = new Date();
    const endDate = addMonths(today, 12);
    const dates = eachDayOfInterval({ start: today, end: endDate });

    // Group consecutive dates with same price and rule type
    const ranges = [];
    let currentRange = null;

    dates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const price = calculatePrice(date);
      const ruleType = getRuleType(date, dateStr);

      if (!currentRange || currentRange.price !== price || currentRange.ruleType !== ruleType) {
        if (currentRange) ranges.push(currentRange);
        currentRange = {
          startDate: date,
          endDate: date,
          price,
          ruleType,
          dateStr: dateStr
        };
      } else {
        currentRange.endDate = date;
      }
    });
    if (currentRange) ranges.push(currentRange);

    // Build CSV
    let csv = "Start Date,End Date,Nightly Price,Nights,Total Value,Rule Type\n";
    
    ranges.forEach(range => {
      const startStr = format(range.startDate, 'dd/MM/yyyy');
      const endStr = format(range.endDate, 'dd/MM/yyyy');
      const nights = differenceInDays(range.endDate, range.startDate) + 1;
      const totalValue = range.price * nights;

      csv += `${startStr},${endStr},${range.price},${nights},${totalValue},${range.ruleType}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pricing-grouped-${format(today, 'dd-MM-yyyy')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportDetailedCSV = () => {
    const today = new Date();
    const endDate = addMonths(today, 12);
    const dates = eachDayOfInterval({ start: today, end: endDate });

    let csv = "Date,Day,Nightly Price,Rule Type\n";
    
    dates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayName = format(date, 'EEEE');
      const price = calculatePrice(date);
      const ruleType = getRuleType(date, dateStr);

      csv += `${format(date, 'dd/MM/yyyy')},${dayName},${price},${ruleType}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pricing-detailed-${format(today, 'dd-MM-yyyy')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (exportDetailed) {
      exportDetailedCSV();
    } else {
      exportGroupedCSV();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Pricing</CardTitle>
        <CardDescription>Download your pricing calendar for the next 12 months</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="export-mode" className="text-sm font-medium">Detailed Export</Label>
            <p className="text-xs text-gray-500">
              {exportDetailed ? "Individual dates (1 row per day)" : "Grouped ranges (default)"}
            </p>
          </div>
          <Switch
            id="export-mode"
            checked={exportDetailed}
            onCheckedChange={setExportDetailed}
          />
        </div>
        
        <Button type="button" onClick={exportCSV} className="w-full">
          <Download className="w-4 h-4 mr-2" />
          {exportDetailed ? "Export Detailed CSV" : "Export Grouped CSV"}
        </Button>

        {!exportDetailed && (
          <p className="text-xs text-gray-500">
            Grouped export combines consecutive dates with the same price into ranges for easy reading.
          </p>
        )}
      </CardContent>
    </Card>
  );
}