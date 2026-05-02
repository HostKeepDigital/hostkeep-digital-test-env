import { useState } from "react";
import { Download } from "lucide-react";

export default function FinancialSummary({ bookings, cleaningJobs, subscription, properties }) {
  const currentYear = new Date().getFullYear();
  const [summaryYear, setSummaryYear] = useState(currentYear);
  const [summaryPeriod, setSummaryPeriod] = useState("tax");

  const periodStart = summaryPeriod === "tax"
    ? new Date(`${summaryYear - 1}-04-06`)
    : new Date(`${summaryYear}-01-01`);
  const periodEnd = summaryPeriod === "tax"
    ? new Date(`${summaryYear}-04-05`)
    : new Date(`${summaryYear}-12-31`);

  const periodLabel = summaryPeriod === "tax"
    ? `Tax Year ${summaryYear - 1}/${String(summaryYear).slice(2)}`
    : `Calendar Year ${summaryYear}`;

  const inPeriod = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= periodStart && d <= periodEnd;
  };

  const getPropertyName = (propertyId) =>
    properties.find(p => p.id === propertyId)?.title || "Unknown Property";

  const incomeRows = bookings
    .filter(b => ["completed", "checked_in", "confirmed"].includes(b.booking_status) && inPeriod(b.check_in))
    .map(b => ({
      date: b.check_in,
      description: `Booking — ${b.guest_name || "Guest"}`,
      property: getPropertyName(b.property_id),
      category: "Booking Income",
      amount: b.total_amount || 0,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const cleaningRows = cleaningJobs
    .filter(j => j.status === "completed" && inPeriod(j.scheduled_date))
    .map(j => ({
      date: j.scheduled_date,
      description: "Cleaning — " + getPropertyName(j.property_id),
      property: getPropertyName(j.property_id),
      category: "Cleaning Cost",
      amount: -(j.cleaner_price || 0),
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const subRows = (() => {
    if (!subscription?.price_monthly || !subscription?.start_date) return [];
    const rows = [];
    const start = new Date(subscription.start_date);
    const d = new Date(Math.max(start.getTime(), periodStart.getTime()));
    d.setDate(1);
    while (d <= periodEnd) {
      if (d >= start) {
        rows.push({
          date: d.toISOString().split("T")[0],
          description: `HostKeep Subscription — ${subscription.plan?.replace(/_/g, " ")}`,
          property: "Platform",
          category: "Subscription Fee",
          amount: -(subscription.price_monthly),
        });
      }
      d.setMonth(d.getMonth() + 1);
    }
    return rows;
  })();

  const totalIncome = incomeRows.reduce((s, r) => s + r.amount, 0);
  const totalCleaning = cleaningRows.reduce((s, r) => s + r.amount, 0);
  const totalSub = subRows.reduce((s, r) => s + r.amount, 0);
  const netTotal = totalIncome + totalCleaning + totalSub;

  const allRows = [
    ...incomeRows.map(r => ({ ...r, type: "income" })),
    ...cleaningRows.map(r => ({ ...r, type: "cost" })),
    ...subRows.map(r => ({ ...r, type: "cost" })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  const handleExportCSV = () => {
    const headers = ["Date", "Description", "Property", "Category", "Amount (£)"];
    const rows = allRows.map(r => [
      new Date(r.date).toLocaleDateString("en-GB"),
      `"${r.description}"`,
      `"${r.property}"`,
      r.category,
      r.amount.toFixed(2),
    ]);
    const totalsSection = [
      [],
      ["", "TOTALS", "", "", ""],
      ["", "Total Booking Income", "", "", totalIncome.toFixed(2)],
      ["", "Total Cleaning Costs", "", "", totalCleaning.toFixed(2)],
      ["", "Total Subscription Fees", "", "", totalSub.toFixed(2)],
      ["", "NET TOTAL", "", "", netTotal.toFixed(2)],
    ];
    const csv = [headers, ...rows, ...totalsSection].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HostKeep-${periodLabel.replace(/\s/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Earliest year the host has any data — derived from subscription start or earliest booking
  const signUpYear = (() => {
    const dates = [];
    if (subscription?.start_date) dates.push(new Date(subscription.start_date).getFullYear());
    if (subscription?.created_date) dates.push(new Date(subscription.created_date).getFullYear());
    bookings.forEach(b => { if (b.check_in) dates.push(new Date(b.check_in).getFullYear()); });
    return dates.length > 0 ? Math.min(...dates) : currentYear;
  })();

  // For tax year mode, the "year" label is the April end year, so earliest selectable = signUpYear
  // Generate years from signUpYear up to currentYear + 1
  const yearOptions = Array.from(
    { length: currentYear + 1 - signUpYear + 1 },
    (_, i) => signUpYear + i
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Financial Summary</h3>
          <p className="text-xs text-gray-500 mt-0.5">Bookings, cleaning costs and subscription fees — ready for your accountant</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3 py-2 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#16304f] transition-colors flex-shrink-0"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Period controls */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          <button onClick={() => setSummaryPeriod("tax")} className={`px-3 py-1.5 font-medium ${summaryPeriod === "tax" ? "bg-[#1E3A5F] text-white" : "bg-white text-gray-600"}`}>UK Tax Year</button>
          <button onClick={() => setSummaryPeriod("calendar")} className={`px-3 py-1.5 font-medium ${summaryPeriod === "calendar" ? "bg-[#1E3A5F] text-white" : "bg-white text-gray-600"}`}>Calendar Year</button>
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {yearOptions.map(y => (
            <button key={y} onClick={() => setSummaryYear(y)} className={`px-3 py-1.5 font-medium ${summaryYear === y ? "bg-[#1E3A5F] text-white" : "bg-white text-gray-600"}`}>
              {summaryPeriod === "tax" ? `${y - 1}/${String(y).slice(2)}` : y}
            </button>
          ))}
        </div>
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {[
          { label: "Booking Income", value: totalIncome, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Cleaning Costs", value: totalCleaning, color: "text-red-600", bg: "bg-red-50" },
          { label: "Subscription Fees", value: totalSub, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Net Total", value: netTotal, color: netTotal >= 0 ? "text-teal-700" : "text-red-700", bg: netTotal >= 0 ? "bg-teal-50" : "bg-red-50" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-lg p-3`}>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className={`text-base font-bold ${color}`}>£{Math.abs(value).toFixed(2)}{value < 0 ? " CR" : ""}</p>
          </div>
        ))}
      </div>

      {/* Transaction table */}
      {allRows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No transactions found for {periodLabel}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-xs min-w-[420px]">
            <thead>
              <tr className="bg-gray-50 text-gray-400 uppercase tracking-wide">
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Description</th>
                <th className="text-left px-3 py-2 hidden sm:table-cell">Property</th>
                <th className="text-right px-3 py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {allRows.map((r, i) => (
                <tr key={i} className={`border-t border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                  <td className="px-3 py-2 text-gray-900">{r.description}</td>
                  <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{r.property}</td>
                  <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${r.amount >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {r.amount >= 0 ? "+" : ""}£{Math.abs(r.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                <td colSpan={3} className="px-3 py-2.5 text-gray-900 text-xs">Net Total — {periodLabel}</td>
                <td className={`px-3 py-2.5 text-right text-sm ${netTotal >= 0 ? "text-teal-700" : "text-red-600"}`}>
                  {netTotal >= 0 ? "+" : ""}£{Math.abs(netTotal).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-3">This summary is for reference only and does not constitute a formal tax return. Please consult your accountant before submission.</p>
    </div>
  );
}