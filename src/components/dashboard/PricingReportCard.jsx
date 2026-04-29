import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, ChevronDown, ChevronUp } from "lucide-react";
import { format, eachDayOfInterval, parseISO, differenceInDays, addDays } from "date-fns";
import { jsPDF } from "jspdf";

const LOGO_URL = "https://drive.google.com/uc?export=view&id=1yazuu-6sWc7hEOpyTncZpt-P9Cd-UOt1";

function getCurrentFYEnd(from) {
  const year = from.getFullYear();
  const fyEndThisYear = new Date(year, 3, 5);
  if (from <= fyEndThisYear) return fyEndThisYear;
  return new Date(year + 1, 3, 5);
}

function getNextFYRange(fyEnd) {
  const start = addDays(fyEnd, 1);
  const end = new Date(start.getFullYear() + 1, 3, 5);
  return { start, end };
}

export default function PricingReportCard({ properties = [], bookings = [] }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || "");
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const property = properties.find(p => p.id === selectedPropertyId);
  const ps = property?.pricing_settings || {};

  const calculatePrice = (date, pricingSettings) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

    if (pricingSettings?.date_overrides?.[dateStr]) return pricingSettings.date_overrides[dateStr].rate;

    if (pricingSettings?.seasons) {
      for (const season of pricingSettings.seasons) {
        const start = parseISO(season.start_date);
        const end = parseISO(season.end_date);
        if (date >= start && date <= end) {
          let rate = season.nightly_rate;
          if (isWeekend && season.weekend_modifier) rate *= (1 + season.weekend_modifier / 100);
          return Math.round(rate);
        }
      }
    }

    if (isWeekend && pricingSettings?.weekend_rate) return pricingSettings.weekend_rate;
    if (!isWeekend && pricingSettings?.weekday_rate) return pricingSettings.weekday_rate;
    return pricingSettings?.base_rate || 0;
  };

  const isBooked = (dateStr, propBookings) => {
    return propBookings.some(b =>
      ['confirmed', 'checked_in', 'completed'].includes(b.booking_status) &&
      dateStr >= b.check_in && dateStr < b.check_out
    );
  };

  const getBookingForDate = (dateStr, propBookings) => {
    return propBookings.find(b =>
      ['confirmed', 'checked_in', 'completed'].includes(b.booking_status) &&
      dateStr >= b.check_in && dateStr < b.check_out
    );
  };

  const handleGenerate = async () => {
    if (!property) return;
    setGenerating(true);

    const today = new Date();
    const fyEnd = getCurrentFYEnd(today);
    const nextFY = getNextFYRange(fyEnd);
    const propBookings = bookings.filter(b => b.property_id === property.id);
    const pricingSettings = property.pricing_settings || {};

    const periods = [
      { start: today, end: fyEnd, label: `Current Financial Year (to 5 Apr ${fyEnd.getFullYear()})` },
      { start: nextFY.start, end: nextFY.end, label: `Financial Year ${nextFY.start.getFullYear()}–${nextFY.end.getFullYear()}` },
    ];

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    let pageNum = 1;

    const addHeader = (isFirst) => {
      doc.setFillColor(13, 148, 136);
      doc.rect(0, 0, pageW, 28, 'F');
      try { doc.addImage(LOGO_URL, 'PNG', margin, 4, 36, 20); } catch (_) {
        doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont(undefined,'bold'); doc.text("HostKeep", margin, 17);
      }
      doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont(undefined, 'bold');
      doc.text("Pricing Calendar — Grouped View", margin + 40, 14);
      doc.setFontSize(8); doc.setFont(undefined, 'normal');
      doc.text("hostkeepdigital.co.uk", margin + 40, 21);
      doc.text(`Generated: ${format(today, 'dd/MM/yyyy')}`, pageW - margin, 14, { align: 'right' });

      doc.setFillColor(240, 253, 250);
      doc.rect(0, 28, pageW, 20, 'F');
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 58, 95);
      doc.text(property.title || "Property", margin, 38);
      doc.setFontSize(8); doc.setFont(undefined, 'normal'); doc.setTextColor(100, 116, 139);
      const detail = [property.town || property.postcode_area, property.bedrooms ? `${property.bedrooms} bed` : "", property.guest_capacity ? `Sleeps ${property.guest_capacity}` : ""].filter(Boolean).join("  ·  ");
      if (detail) doc.text(detail, margin, 44);

      if (!isFirst) return 52;

      doc.setFillColor(255, 255, 255);
      doc.rect(0, 48, pageW, 22, 'F');
      doc.setDrawColor(226, 232, 240); doc.line(0, 48, pageW, 48); doc.line(0, 70, pageW, 70);
      const stats = [
        { label: "Base Rate", value: `£${pricingSettings?.base_rate || 0}/night` },
        { label: "Weekend Rate", value: pricingSettings?.weekend_rate ? `£${pricingSettings.weekend_rate}/night` : "—" },
        { label: "Cleaning Fee", value: property.cleaning_fee ? `£${property.cleaning_fee}` : "—" },
        { label: "Min Stay", value: property.minimum_stay ? `${property.minimum_stay} nights` : "—" },
        { label: "Seasons", value: String(pricingSettings?.seasons?.length || 0) },
        { label: "Overrides", value: String(Object.keys(pricingSettings?.date_overrides || {}).length) },
      ];
      const colW = (pageW - margin * 2) / stats.length;
      stats.forEach((s, i) => {
        const x = margin + i * colW + colW / 2;
        doc.setFontSize(7); doc.setFont(undefined,'normal'); doc.setTextColor(100,116,139); doc.text(s.label, x, 56, { align:'center' });
        doc.setFontSize(9); doc.setFont(undefined,'bold'); doc.setTextColor(15,23,42); doc.text(s.value, x, 64, { align:'center' });
      });
      return 76;
    };

    const addFooter = (num) => {
      doc.setFillColor(248, 250, 252); doc.rect(0, pageH - 12, pageW, 12, 'F');
      doc.setDrawColor(226, 232, 240); doc.line(0, pageH - 12, pageW, pageH - 12);
      doc.setFontSize(7); doc.setTextColor(148, 163, 184); doc.setFont(undefined, 'normal');
      doc.text("HostKeep Digital — Pricing Report. For internal use only.", margin, pageH - 4);
      doc.text(`Page ${num}`, pageW - margin, pageH - 4, { align: 'right' });
    };

    let y = addHeader(true);

    const checkPage = () => {
      if (y > pageH - 20) {
        addFooter(pageNum); doc.addPage(); pageNum++;
        y = addHeader(false);
      }
    };

    periods.forEach((period, idx) => {
      const dates = eachDayOfInterval({ start: period.start, end: period.end });

      checkPage();
      doc.setFillColor(13, 148, 136); doc.rect(margin - 2, y - 4, pageW - margin * 2 + 4, 10, 'F');
      doc.setTextColor(255,255,255); doc.setFontSize(9); doc.setFont(undefined,'bold');
      doc.text("Pricing Ranges", margin, y + 2);
      doc.text(period.label, pageW - margin, y + 2, { align: 'right' });
      y += 12;

      // Summary
      let totalRev = 0, bookedN = 0;
      dates.forEach(d => { if (isBooked(format(d,'yyyy-MM-dd'), propBookings)) { totalRev += calculatePrice(d, pricingSettings); bookedN++; } });
      const occ = dates.length > 0 ? ((bookedN / dates.length) * 100).toFixed(1) : 0;
      const avgRate = dates.length > 0 ? (dates.reduce((s,d) => s + calculatePrice(d, pricingSettings), 0) / dates.length).toFixed(0) : 0;
      checkPage();
      doc.setFillColor(254,252,232); doc.setDrawColor(251,191,36); doc.roundedRect(margin-2, y-2, pageW-margin*2+4, 22, 2,2,'FD');
      doc.setFontSize(8); doc.setFont(undefined,'bold'); doc.setTextColor(120,53,15); doc.text("Period Summary", margin+2, y+5);
      [{ l:"Total Nights", v: String(dates.length) },{ l:"Booked Nights", v: String(bookedN) },{ l:"Occupancy", v:`${occ}%` },{ l:"Revenue", v:`£${totalRev.toLocaleString()}` },{ l:"Avg Rate", v:`£${avgRate}` }].forEach((item,i) => {
        const iW = (pageW-margin*2-2)/5, x = margin+2+i*iW;
        doc.setFontSize(7); doc.setFont(undefined,'normal'); doc.setTextColor(120,53,15); doc.text(item.l, x, y+12);
        doc.setFontSize(9); doc.setFont(undefined,'bold'); doc.setTextColor(92,48,10); doc.text(item.v, x, y+19);
      });
      y += 28;

      // Grouped ranges
      const ranges = []; let cur = null;
      dates.forEach(date => {
        const dateStr = format(date,'yyyy-MM-dd');
        const price = calculatePrice(date, pricingSettings);
        const booked = isBooked(dateStr, propBookings);
        const booking = getBookingForDate(dateStr, propBookings);
        const key = `${price}|${booked ? (booking?.guest_name||'booked') : ''}`;
        if (!cur || cur.key !== key) { if (cur) ranges.push(cur); cur = { key, startDate: date, endDate: date, price, booked, guestName: booking?.guest_name||"" }; }
        else cur.endDate = date;
      });
      if (cur) ranges.push(cur);

      checkPage();
      doc.setFillColor(240,253,250); doc.rect(margin-2, y-4, pageW-margin*2+4, 8, 'F');
      doc.setTextColor(13,148,136); doc.setFontSize(8); doc.setFont(undefined,'bold');
      [["From",margin],["To",margin+32],["Nights",margin+64],["Rate",margin+84],["Period Total",margin+104],["Status",margin+150]].forEach(([l,x]) => doc.text(l,x,y));
      y += 7; doc.setDrawColor(209,250,229); doc.line(margin-2, y-2, pageW-margin+2, y-2);

      let alt = false;
      ranges.forEach(r => {
        checkPage();
        const nights = differenceInDays(r.endDate, r.startDate)+1;
        const total = r.price * nights;
        if (alt) { doc.setFillColor(248,250,252); doc.rect(margin-2,y-4,pageW-margin*2+4,7,'F'); }
        alt = !alt;
        doc.setFontSize(8); doc.setFont(undefined,'normal');
        doc.setTextColor(r.booked ? 13 : 15, r.booked ? 148 : 23, r.booked ? 136 : 42);
        doc.text(format(r.startDate,'dd/MM/yyyy'), margin, y);
        doc.text(format(r.endDate,'dd/MM/yyyy'), margin+32, y);
        doc.text(String(nights), margin+64, y);
        doc.text(`£${r.price}`, margin+84, y);
        doc.text(`£${total.toLocaleString()}`, margin+104, y);
        if (r.booked) { doc.setFont(undefined,'bold'); doc.text(`Booked${r.guestName ? ` — ${r.guestName}` : ''}`, margin+150, y); }
        else { doc.setTextColor(148,163,184); doc.text("Available", margin+150, y); }
        y += 7;
      });
      if (idx < periods.length - 1) y += 8;
    });

    addFooter(pageNum);
    const fyEndYear = getCurrentFYEnd(today).getFullYear();
    doc.save(`hostkeep-pricing-${(property.title||'property').replace(/\s+/g,'-').toLowerCase()}-FY${fyEndYear}.pdf`);
    setGenerating(false);
  };

  if (properties.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <FileDown className="w-4 h-4 text-teal-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Pricing Report</h3>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {properties.length > 1 && (
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={selectedPropertyId}
              onChange={e => setSelectedPropertyId(e.target.value)}
            >
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-500">
            Grouped pricing report covering the current financial year (today → 5 Apr) and the full following year. Bookings are highlighted.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={generating || !selectedPropertyId}
            className="w-full bg-teal-600 hover:bg-teal-700 text-sm h-9"
          >
            <FileDown className="w-4 h-4 mr-2" />
            {generating ? "Generating…" : "Download PDF Report"}
          </Button>
        </div>
      )}
    </div>
  );
}