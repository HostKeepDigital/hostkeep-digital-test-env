import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { format, eachDayOfInterval, addMonths, parseISO } from "date-fns";

export default function ExportPricing({ pricingSettings }) {
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

  const exportCSV = () => {
    const today = new Date();
    const endDate = addMonths(today, 12);
    const dates = eachDayOfInterval({ start: today, end: endDate });

    let csv = "Date,Day,Price (£),Rule Type\n";
    
    dates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayName = format(date, 'EEEE');
      const price = calculatePrice(date);
      
      let ruleType = "Base Rate";
      if (pricingSettings?.date_overrides?.[dateStr]) {
        ruleType = "Manual Override";
      } else if (pricingSettings?.seasons?.some(s => {
        const start = parseISO(s.start_date);
        const end = parseISO(s.end_date);
        return date >= start && date <= end;
      })) {
        ruleType = "Seasonal";
      } else if ((date.getDay() === 0 || date.getDay() === 5 || date.getDay() === 6) && pricingSettings?.weekend_rate) {
        ruleType = "Weekend";
      } else if (pricingSettings?.weekday_rate) {
        ruleType = "Weekday";
      }

      csv += `${dateStr},${dayName},${price},${ruleType}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pricing-calendar-${format(today, 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Pricing</CardTitle>
        <CardDescription>Download your pricing calendar for the next 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={exportCSV} className="w-full">
          <Download className="w-4 h-4 mr-2" />
          Export to CSV
        </Button>
      </CardContent>
    </Card>
  );
}