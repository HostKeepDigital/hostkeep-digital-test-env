import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { format, eachDayOfInterval, addMonths, parseISO, differenceInDays } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { jsPDF } from "jspdf";

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

  const exportGroupedPDF = () => {
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

    // Build PDF
    const doc = new jsPDF();
    
    // Add logo at the top left
    const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698eee4108bd1d9467648326/4314a0b14_HostKeepandLogo.png';
    doc.addImage(logoUrl, 'PNG', 14, 8, 50, 25);
    
    doc.setFontSize(16);
    doc.text("Pricing Calendar - Grouped View", 14, 42);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${format(today, 'dd/MM/yyyy')}`, 14, 42);
    doc.text(`Period: ${format(today, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`, 14, 47);

    // Draw table manually
    let y = 55;
    const lineHeight = 7;
    const pageHeight = 280;
    
    // Table headers
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text("Start Date", 14, y);
    doc.text("End Date", 44, y);
    doc.text("Price", 74, y);
    doc.text("Nights", 94, y);
    doc.text("Total", 114, y);
    doc.text("Rule Type", 140, y);
    y += lineHeight;
    
    doc.setFont(undefined, 'normal');
    
    ranges.forEach(range => {
      if (y > pageHeight) {
        doc.addPage();
        y = 20;
      }
      
      const startStr = format(range.startDate, 'dd/MM/yyyy');
      const endStr = format(range.endDate, 'dd/MM/yyyy');
      const nights = differenceInDays(range.endDate, range.startDate) + 1;
      const totalValue = range.price * nights;

      doc.text(startStr, 14, y);
      doc.text(endStr, 44, y);
      doc.text(`£${range.price}`, 74, y);
      doc.text(String(nights), 94, y);
      doc.text(`£${totalValue}`, 114, y);
      doc.text(range.ruleType, 140, y);
      y += lineHeight;
    });

    doc.save(`pricing-grouped-${format(today, 'dd-MM-yyyy')}.pdf`);
  };

  const exportDetailedPDF = () => {
    const today = new Date();
    const endDate = addMonths(today, 12);
    const dates = eachDayOfInterval({ start: today, end: endDate });

    const doc = new jsPDF();
    
    // Add logo at the top left
    const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698eee4108bd1d9467648326/4314a0b14_HostKeepandLogo.png';
    doc.addImage(logoUrl, 'PNG', 14, 10, 25, 12);
    
    doc.setFontSize(16);
    doc.text("Pricing Calendar - Detailed View", 14, 35);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${format(today, 'dd/MM/yyyy')}`, 14, 42);
    doc.text(`Period: ${format(today, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`, 14, 47);

    // Draw table manually
    let y = 55;
    const lineHeight = 6;
    const pageHeight = 280;
    
    // Table headers
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text("Date", 14, y);
    doc.text("Day", 50, y);
    doc.text("Price", 90, y);
    doc.text("Rule Type", 120, y);
    y += lineHeight;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    
    dates.forEach(date => {
      if (y > pageHeight) {
        doc.addPage();
        y = 20;
      }
      
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayName = format(date, 'EEEE');
      const price = calculatePrice(date);
      const ruleType = getRuleType(date, dateStr);

      doc.text(format(date, 'dd/MM/yyyy'), 14, y);
      doc.text(dayName, 50, y);
      doc.text(`£${price}`, 90, y);
      doc.text(ruleType, 120, y);
      y += lineHeight;
    });

    doc.save(`pricing-detailed-${format(today, 'dd-MM-yyyy')}.pdf`);
  };

  const exportPDF = () => {
    if (exportDetailed) {
      exportDetailedPDF();
    } else {
      exportGroupedPDF();
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
        
        <Button type="button" onClick={exportPDF} className="w-full">
          <Download className="w-4 h-4 mr-2" />
          {exportDetailed ? "Export Detailed PDF" : "Export Grouped PDF"}
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