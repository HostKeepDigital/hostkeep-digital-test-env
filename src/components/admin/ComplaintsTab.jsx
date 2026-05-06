import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Search, Filter, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import ComplaintDetailPanel from "./ComplaintDetailPanel";

const TYPE_LABEL = {
  damage_claim: { label: "Damage Claim", cls: "bg-orange-100 text-orange-800" },
  rental_dispute: { label: "Rental Dispute", cls: "bg-blue-100 text-blue-800" },
};
const STATUS_LABEL = {
  open: { label: "Open", cls: "bg-amber-100 text-amber-800" },
  under_review: { label: "Under Review", cls: "bg-blue-100 text-blue-800" },
  resolved: { label: "Resolved", cls: "bg-green-100 text-green-800" },
  dismissed: { label: "Dismissed", cls: "bg-gray-100 text-gray-500" },
};

export default function ComplaintsTab() {
  const queryClient = useQueryClient();
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active"); // active | resolved | all

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["complaints"],
    queryFn: () => base44.entities.Complaint.list("-created_date", 500),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-for-complaints"],
    queryFn: () => base44.entities.Booking.list("-created_date", 5000),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["properties-for-complaints"],
    queryFn: () => base44.entities.Property.list("-created_date", 5000),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-for-complaints"],
    queryFn: () => base44.entities.User.list(),
  });

  const bookingMap = useMemo(() => Object.fromEntries(bookings.map(b => [b.id, b])), [bookings]);
  const propertyMap = useMemo(() => Object.fromEntries(properties.map(p => [p.id, p])), [properties]);
  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);

  const filtered = useMemo(() => {
    return complaints.filter(c => {
      const booking = bookingMap[c.booking_id];
      const guest = userMap[booking?.guest_id];
      const host = userMap[booking?.host_id];
      const property = propertyMap[booking?.property_id];

      const matchSearch = !search || [
        c.booking_id, c.category, c.description,
        guest?.full_name, host?.full_name, property?.title,
        guest?.email, host?.email,
      ].some(v => v?.toLowerCase().includes(search.toLowerCase()));

      const matchType = filterType === "all" || c.complaint_type === filterType;

      const isActive = ["open", "under_review"].includes(c.status);
      const matchStatus = filterStatus === "all"
        ? true
        : filterStatus === "active"
        ? isActive
        : !isActive;

      return matchSearch && matchType && matchStatus;
    });
  }, [complaints, search, filterType, filterStatus, bookingMap, userMap, propertyMap]);

  // Alert: hosts or guests with 3+ complaints
  const alerts = useMemo(() => {
    const hostCounts = {};
    const guestCounts = {};
    complaints.forEach(c => {
      const booking = bookingMap[c.booking_id];
      if (booking?.host_id) hostCounts[booking.host_id] = (hostCounts[booking.host_id] || 0) + 1;
      if (c.raised_by === "guest" && c.raised_by_user_id) guestCounts[c.raised_by_user_id] = (guestCounts[c.raised_by_user_id] || 0) + 1;
    });
    const out = [];
    Object.entries(hostCounts).forEach(([id, n]) => {
      if (n >= 3) out.push(`⚠️ Host ${userMap[id]?.full_name || id} has ${n} complaints`);
    });
    Object.entries(guestCounts).forEach(([id, n]) => {
      if (n >= 3) out.push(`⚠️ Guest ${userMap[id]?.full_name || id} has raised ${n} complaints`);
    });
    return out;
  }, [complaints, bookingMap, userMap]);

  const openCount = complaints.filter(c => ["open", "under_review"].includes(c.status)).length;

  if (isLoading) {
    return <div className="text-center py-20 text-gray-400 text-sm">Loading disputes…</div>;
  }

  return (
    <div className="space-y-5">
      {/* Alerts */}
      {alerts.map((msg, i) => (
        <div key={i} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{msg}</p>
        </div>
      ))}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by guest, host, property, booking…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="active">Active ({openCount})</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="all">All Types</option>
            <option value="damage_claim">Damage Claims</option>
            <option value="rental_dispute">Rental Disputes</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <p className="text-gray-400 text-sm">No disputes match your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Type", "Raised By", "Guest", "Property", "Amount", "Status", "Date", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => {
                const booking = bookingMap[c.booking_id];
                const guest = userMap[booking?.guest_id];
                const host = userMap[booking?.host_id];
                const property = propertyMap[booking?.property_id];
                const { label: typeLabel, cls: typeCls } = TYPE_LABEL[c.complaint_type] || { label: c.complaint_type, cls: "bg-gray-100 text-gray-600" };
                const { label: statusLabel, cls: statusCls } = STATUS_LABEL[c.status] || { label: c.status, cls: "bg-gray-100 text-gray-600" };
                const claimedAmt = c.complaint_type === "damage_claim"
                  ? c.damage_total_claimed
                  : c.requested_amount;

                return (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedComplaint(c)}>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeCls}`}>{typeLabel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.raised_by === "host" ? "bg-teal-100 text-teal-800" : "bg-blue-100 text-blue-800"}`}>
                        {c.raised_by === "host" ? "Host" : "Guest"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs truncate max-w-[120px]">
                      {guest?.full_name || booking?.guest_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs truncate max-w-[120px]">
                      {property?.title || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-xs font-medium">
                      {claimedAmt != null ? `£${Number(claimedAmt).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCls}`}>{statusLabel}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {c.created_date ? new Date(c.created_date).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs bg-[#0d9488] hover:bg-[#0f766e] text-white"
                        onClick={e => { e.stopPropagation(); setSelectedComplaint(c); }}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Review
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Panel */}
      {selectedComplaint && (() => {
        const booking = bookingMap[selectedComplaint.booking_id];
        const property = propertyMap[booking?.property_id];
        return (
          <ComplaintDetailPanel
            complaint={selectedComplaint}
            booking={booking}
            property={property}
            host={userMap[booking?.host_id]}
            guest={userMap[booking?.guest_id]}
            onClose={() => setSelectedComplaint(null)}
            onResolved={() => queryClient.invalidateQueries({ queryKey: ["complaints"] })}
          />
        );
      })()}
    </div>
  );
}