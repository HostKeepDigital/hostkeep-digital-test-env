import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { format, eachDayOfInterval, parseISO, differenceInDays, addDays } from "date-fns";
import { jsPDF } from "jspdf";

// UK Financial Year: 6 April → 5 April
function getCurrentFYEnd(from) {
  const year = from.getFullYear();
  const month = from.getMonth(); // 0-indexed
  // FY ends 5 April — if we're past 5 April this year, FY ends next year
  const fyEndThisYear = new Date(year, 3, 5); // April 5 (month 3)
  if (from <= fyEndThisYear) {
    return fyEndThisYear;
  }
  return new Date(year + 1, 3, 5);
}

function getNextFYRange(fyEnd) {
  const start = addDays(fyEnd, 1); // 6 April
  const end = new Date(start.getFullYear() + 1, 3, 5); // 5 April next year
  return { start, end };
}

// The correct HostKeep logo (matches index.html / layout)
const LOGO_URL = "https://drive.google.com/uc?export=view&id=1yazuu-6sWc7hEOpyTncZpt-P9Cd-UOt1";

export default function ExportPricing({ pricingSettings, property, bookings = [] }) {

  const calculatePrice = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

    if (pricingSettings?.date_overrides?.[dateStr]) {
      return pricingSettings.date_overrides[dateStr].rate;
    }

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

    if (isWeekend && pricingSettings?.weekend_rate) {
      return applyRounding(pricingSettings.weekend_rate);
    }
    if (!isWeekend && pricingSettings?.weekday_rate) {
      return applyRounding(pricingSettings.weekday_rate);
    }

    return applyRounding(pricingSettings?.base_rate || 0);
  };

  const applyRounding = (price) => {
    if (!pricingSettings?.price_rounding) return Math.round(price);
    const rounding = pricingSettings.price_rounding;
    return Math.round(price / rounding) * rounding;
  };

  const getRuleType = (date, dateStr) => {
    if (pricingSettings?.date_overrides?.[dateStr]) {
      return pricingSettings.date_overrides[dateStr].holiday
        ? `Holiday: ${pricingSettings.date_overrides[dateStr].holiday}`
        : "Manual Override";
    }
    if (pricingSettings?.seasons?.some(s => {
      const start = parseISO(s.start_date);
      const end = parseISO(s.end_date);
      return date >= start && date <= end;
    })) {
      return "Seasonal";
    }
    const d = date.getDay();
    if ((d === 0 || d === 5 || d === 6) && pricingSettings?.weekend_rate) return "Weekend";
    if (pricingSettings?.weekday_rate) return "Weekday";
    return "Base Rate";
  };

  const isBooked = (dateStr) => {
    return bookings.some(b => {
      if (!['confirmed', 'checked_in', 'completed'].includes(b.booking_status)) return false;
      const checkIn = b.check_in;
      const checkOut = b.check_out;
      return dateStr >= checkIn && dateStr < checkOut;
    });
  };

  const getBookingForDate = (dateStr) => {
    return bookings.find(b => {
      if (!['confirmed', 'checked_in', 'completed'].includes(b.booking_status)) return false;
      return dateStr >= b.check_in && dateStr < b.check_out;
    });
  };

  const buildPDF = (detailed) => {
    const today = new Date();
    const fyEnd = getCurrentFYEnd(today);

    // If FY has started (on or after April 6), start from tomorrow; otherwise today
    const fyStartDate = new Date(today.getFullYear(), 3, 6); // April 6
    const reportStart = today >= fyStartDate ? addDays(today, 1) : today;

    // Only current financial year: reportStart → end of current FY
    const periods = [
      { start: reportStart, end: fyEnd, label: `Current Financial Year (to 5 Apr ${fyEnd.getFullYear()})` },
    ];

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;

    // ── Header ──────────────────────────────────────────────────────────────
    const addHeader = (isFirstPage) => {
      // Teal header bar
      doc.setFillColor(13, 148, 136); // teal-600
      doc.rect(0, 0, pageW, 28, 'F');

      // Logo — try to add image, fall back to text if it fails
      try {
        doc.addImage(LOGO_URL, 'PNG', margin, 4, 36, 20);
      } catch (_) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("HostKeep", margin, 17);
      }

      // Title on header
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(detailed ? "Pricing Calendar — Detailed View" : "Pricing Calendar — Grouped View", margin + 40, 14);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text("hostkeepdigital.co.uk", margin + 40, 21);

      // Right side: generated date
      doc.setFontSize(8);
      doc.text(`Generated: ${format(today, 'dd/MM/yyyy')}`, pageW - margin, 14, { align: 'right' });

      // Property name / info block
      doc.setTextColor(30, 58, 95); // dark navy
      doc.setFillColor(240, 253, 250); // teal-50
      doc.rect(0, 28, pageW, 20, 'F');

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      const propName = property?.title || "Your Property";
      doc.text(propName, margin, 38);

      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 116, 139);
      const propDetail = [
        property?.town || property?.postcode_area || "",
        property?.property_type ? `${property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)}` : "",
        property?.bedrooms ? `${property.bedrooms} bed` : "",
        property?.guest_capacity ? `Sleeps ${property.guest_capacity}` : "",
      ].filter(Boolean).join("  ·  ");
      if (propDetail) doc.text(propDetail, margin, 44);

      if (!isFirstPage) return 52;

      // Summary stats block
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 48, pageW, 22, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(0, 48, pageW, 48);
      doc.line(0, 70, pageW, 70);

      const stats = [
        { label: "Base Rate", value: `£${pricingSettings?.base_rate || 0}/night` },
        { label: "Weekend Rate", value: pricingSettings?.weekend_rate ? `£${pricingSettings.weekend_rate}/night` : "—" },
        { label: "Cleaning Fee", value: property?.cleaning_fee ? `£${property.cleaning_fee}` : "—" },
        { label: "Min Stay", value: property?.minimum_stay ? `${property.minimum_stay} nights` : "—" },
        { label: "Seasons", value: String(pricingSettings?.seasons?.length || 0) },
        { label: "Overrides", value: String(Object.keys(pricingSettings?.date_overrides || {}).length) },
      ];

      const colW = (pageW - margin * 2) / stats.length;
      stats.forEach((s, i) => {
        const x = margin + i * colW + colW / 2;
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.setFont(undefined, 'normal');
        doc.text(s.label, x, 56, { align: 'center' });
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.setFont(undefined, 'bold');
        doc.text(s.value, x, 64, { align: 'center' });
      });

      return 76;
    };

    // ── Footer ───────────────────────────────────────────────────────────────
    const addFooter = (pageNum, totalPages) => {
      doc.setFillColor(248, 250, 252);
      doc.rect(0, pageH - 12, pageW, 12, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(0, pageH - 12, pageW, pageH - 12);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setFont(undefined, 'normal');
      doc.text("HostKeep Digital — Pricing Report. For internal use only.", margin, pageH - 4);
      doc.text(`Page ${pageNum}`, pageW - margin, pageH - 4, { align: 'right' });
    };

    let y = addHeader(true);
    let pageNum = 1;

    const checkPage = () => {
      if (y > pageH - 20) {
        addFooter(pageNum, "?");
        doc.addPage();
        pageNum++;
        y = addHeader(false);
      }
    };

    const drawSectionHeading = (label, periodLabel) => {
      checkPage();
      doc.setFillColor(13, 148, 136);
      doc.rect(margin - 2, y - 4, pageW - margin * 2 + 4, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text(label, margin, y + 2);
      doc.text(periodLabel, pageW - margin, y + 2, { align: 'right' });
      y += 12;
    };

    const drawTableHeader = (columns) => {
       y += 4; // Add spacing above the header
       doc.setFillColor(240, 253, 250);
       doc.rect(margin - 2, y - 4, pageW - margin * 2 + 4, 8, 'F');
       doc.setTextColor(13, 148, 136);
       doc.setFontSize(8);
       doc.setFont(undefined, 'bold');
       columns.forEach(col => doc.text(col.label, col.x, y));
       y += 8;
       doc.setDrawColor(209, 250, 229);
       doc.line(margin - 2, y - 2, pageW - margin + 2, y - 2);
     };

    const drawFinancialYearSummary = (dates) => {
       // Calculate summary stats for the period
       let totalRevenue = 0;
       let bookedNights = 0;
       let totalNights = dates.length;

       dates.forEach(date => {
         const dateStr = format(date, 'yyyy-MM-dd');
         const price = calculatePrice(date);
         const booked = isBooked(dateStr);
         if (booked) {
           totalRevenue += price;
           bookedNights++;
         }
       });

       const occupancy = totalNights > 0 ? ((bookedNights / totalNights) * 100).toFixed(1) : 0;
       const avgRate = totalNights > 0 ? (dates.reduce((s, d) => s + calculatePrice(d), 0) / totalNights).toFixed(0) : 0;

       checkPage();
       doc.setFillColor(13, 148, 136); // teal-600
       doc.setDrawColor(13, 148, 136);
       doc.rect(margin - 2, y - 2, pageW - margin * 2 + 4, 19, 'FD');

       doc.setFontSize(8);
       doc.setFont(undefined, 'bold');
       doc.setTextColor(255, 255, 255);
       doc.text("Period Summary", margin + 2, y + 4);

       const summaryItems = [
         { label: "Total Nights", value: String(totalNights) },
         { label: "Booked Nights", value: String(bookedNights) },
         { label: "Occupancy", value: `${occupancy}%` },
         { label: "Confirmed Revenue", value: `£${totalRevenue.toLocaleString()}` },
         { label: "Avg Nightly Rate", value: `£${avgRate}` },
       ];

       const itemW = (pageW - margin * 2 - 2) / summaryItems.length;
       summaryItems.forEach((item, i) => {
         const x = margin + 2 + i * itemW;
         doc.setFontSize(6.5);
         doc.setFont(undefined, 'normal');
         doc.setTextColor(220, 252, 231); // teal-100
         doc.text(item.label, x, y + 10);
         doc.setFontSize(8);
         doc.setFont(undefined, 'bold');
         doc.setTextColor(255, 255, 255);
         doc.text(item.value, x, y + 15);
       });

       y += 24;
     };

    // ── Grouped export ────────────────────────────────────────────────────────
     if (true) {
      periods.forEach((period, periodIdx) => {
        const dates = eachDayOfInterval({ start: period.start, end: period.end });
        drawSectionHeading("Pricing Ranges", period.label);
        drawFinancialYearSummary(dates);

        const ranges = [];
        let cur = null;

        dates.forEach(date => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const price = calculatePrice(date);
          const rule = getRuleType(date, dateStr);
          const booked = isBooked(dateStr);
          const booking = getBookingForDate(dateStr);

          const key = `${price}|${rule}|${booked ? (booking?.guest_name || 'booked') : ''}`;
          if (!cur || cur.key !== key) {
            if (cur) ranges.push(cur);
            cur = { key, startDate: date, endDate: date, price, rule, booked, guestName: booking?.guest_name || "" };
          } else {
            cur.endDate = date;
          }
        });
        if (cur) ranges.push(cur);

        checkPage();
        const cols = [
          { label: "From", x: margin },
          { label: "To", x: margin + 32 },
          { label: "Nights", x: margin + 64 },
          { label: "Nightly Rate", x: margin + 82 },
          { label: "Period Total", x: margin + 112 },
          { label: "Rule", x: margin + 142 },
          { label: "Status", x: margin + 172 },
        ];
        drawTableHeader(cols);

        let rowAlt = false;
        ranges.forEach(range => {
          checkPage();
          const nights = differenceInDays(range.endDate, range.startDate) + 1;
          const total = range.price * nights;

          if (rowAlt) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin - 2, y - 4, pageW - margin * 2 + 4, 7, 'F');
          }
          rowAlt = !rowAlt;

          doc.setFontSize(8);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(range.booked ? 13 : 15, range.booked ? 148 : 23, range.booked ? 136 : 42);

          doc.text(format(range.startDate, 'dd/MM/yyyy'), margin, y);
          doc.text(format(range.endDate, 'dd/MM/yyyy'), margin + 32, y);
          doc.text(String(nights), margin + 64, y);
          doc.text(`£${range.price}`, margin + 82, y);
          doc.text(`£${total.toLocaleString()}`, margin + 112, y);

          const ruleShort = range.rule.length > 20 ? range.rule.substring(0, 19) + "…" : range.rule;
          doc.text(ruleShort, margin + 142, y);

          if (range.booked) {
            doc.setFont(undefined, 'bold');
            doc.text(`Booked${range.guestName ? ` — ${range.guestName}` : ''}`, margin + 172, y);
            doc.setFont(undefined, 'normal');
          } else {
            doc.setTextColor(148, 163, 184);
            doc.text("Available", margin + 172, y);
          }

          y += 7;
        });

        if (periodIdx < periods.length - 1) y += 8;
        });
        }

        // Final summary section with potential totals and Stripe fees
        periods.forEach((period) => {
          const dates = eachDayOfInterval({ start: period.start, end: period.end });
          const potentialRevenue = dates.reduce((sum, date) => sum + calculatePrice(date), 0);
          const stripeFeeRate = 0.022; // 2.2%
          const stripeFeeFixed = 0.30; // £0.30 per transaction
          const estimatedStripeFee = Math.round((potentialRevenue * stripeFeeRate + stripeFeeFixed) * 100) / 100;
          const netAfterStripeFees = Math.round((potentialRevenue - estimatedStripeFee) * 100) / 100;

          checkPage();
          doc.setFillColor(15, 23, 42); // dark navy
          doc.rect(margin - 2, y - 2, pageW - margin * 2 + 4, 48, 'F');

          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text("Financial Summary — All Nights Rented", margin + 2, y + 4);

          y += 10;
          doc.setFontSize(8);
          doc.setTextColor(220, 252, 231); // teal-100
          doc.setFont(undefined, 'normal');

          const summaryLines = [
            { label: "Potential Revenue (All Nights)", value: `£${potentialRevenue.toLocaleString()}` },
            { label: "Estimated Stripe Processing Fee", value: `£${estimatedStripeFee.toLocaleString()}` },
            { label: "Your Net Income (After Stripe Fees)", value: `£${netAfterStripeFees.toLocaleString()}` },
          ];

          summaryLines.forEach((line, idx) => {
            const isFinal = idx === summaryLines.length - 1;
            if (isFinal) {
              doc.setFontSize(9);
              doc.setFont(undefined, 'bold');
              doc.setTextColor(255, 255, 255);
            }
            doc.text(line.label, margin + 4, y + idx * 6);
            doc.text(line.value, pageW - margin - 4, y + idx * 6, { align: 'right' });
          });

          y += 22;
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.setFont(undefined, 'normal');
          const disclaimer = "Note: Stripe fees (2.2% + £0.30) are required for secure payment processing and are not a HostKeep Digital commission.";
          doc.text(disclaimer, margin + 2, y, { maxWidth: pageW - margin * 2 - 4 });
        });

        // Final footer
        addFooter(pageNum, pageNum);

        const fyEndYear = getCurrentFYEnd(today).getFullYear();
        doc.save(`hostkeep-pricing-FY${fyEndYear}.pdf`);
        };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Pricing Report</CardTitle>
        <CardDescription>
          Download a financial year pricing calendar — includes booking status and rate breakdown
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
         <Button type="button" onClick={() => buildPDF(false)} className="w-full bg-teal-600 hover:bg-teal-700">
           <Download className="w-4 h-4 mr-2" />
           Export Pricing Report
         </Button>

         <p className="text-xs text-gray-500">
           Download a grouped pricing calendar showing date ranges with consistent rates, booking status, and period summaries. Covers the current financial year (from tomorrow to 5 Apr).
         </p>
       </CardContent>
    </Card>
  );
}