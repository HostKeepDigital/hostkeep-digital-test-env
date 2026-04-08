import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ComplaintDetailPanel from "./ComplaintDetailPanel";

export default function ComplaintsTab() {
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Query complaints
  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["complaints"],
    queryFn: () => base44.entities.Complaint.list("-created_date", 500),
  });

  // Query bookings, properties, and users for context
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

  // Separate open and resolved
  const openComplaints = complaints.filter(c =>
    ["open", "under_review"].includes(c.status)
  );
  const resolvedComplaints = complaints.filter(c =>
    ["resolved", "dismissed"].includes(c.status)
  );

  // Detect alert conditions
  const getAlerts = () => {
    const alerts = [];

    // Count complaints per host
    const hostComplaintCounts = {};
    complaints.forEach(c => {
      const booking = bookings.find(b => b.id === c.booking_id);
      if (booking?.host_id) {
        hostComplaintCounts[booking.host_id] = (hostComplaintCounts[booking.host_id] || 0) + 1;
      }
    });

    // Check for hosts with 3+ complaints
    Object.entries(hostComplaintCounts).forEach(([hostId, count]) => {
      if (count >= 3) {
        const host = users.find(u => u.id === hostId);
        alerts.push({
          type: "host_complaints",
          message: `Warning: ${host?.full_name || hostId} has ${count} complaints`,
        });
      }
    });

    // Count complaints per guest
    const guestComplaintCounts = {};
    complaints.forEach(c => {
      if (c.raised_by === "guest" && c.raised_by_user_id) {
        guestComplaintCounts[c.raised_by_user_id] = (guestComplaintCounts[c.raised_by_user_id] || 0) + 1;
      }
    });

    Object.entries(guestComplaintCounts).forEach(([guestId, count]) => {
      if (count >= 3) {
        const guest = users.find(u => u.id === guestId);
        alerts.push({
          type: "guest_complaints",
          message: `Warning: ${guest?.full_name || guestId} has raised ${count} complaints`,
        });
      }
    });

    return alerts;
  };

  const alerts = getAlerts();

  if (isLoading) {
    return (
      <div className="text-center py-20 text-gray-300 text-sm">
        Loading complaints...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Open Complaints */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Open Complaints
          </h2>
          <span className="ml-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
            {openComplaints.length}
          </span>
        </div>

        {openComplaints.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">No open complaints</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Booking ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Raised By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Date Raised
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {openComplaints.map(complaint => (
                  <tr key={complaint.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-mono text-xs">
                      {complaint.booking_id?.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          complaint.raised_by === "host"
                            ? "bg-teal-50 text-teal-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {complaint.raised_by === "host" ? "Host" : "Guest"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      {complaint.complaint_type === "damage_claim"
                        ? "Damage Claim"
                        : "Rental Dispute"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {complaint.category || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {complaint.created_date
                        ? new Date(complaint.created_date).toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs bg-[#0d9488] hover:bg-[#0f766e] text-white"
                        onClick={() => setSelectedComplaint(complaint)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolved Complaints */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Resolved Complaints
          </h2>
          <span className="ml-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
            {resolvedComplaints.length}
          </span>
        </div>

        {resolvedComplaints.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">No resolved complaints</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Booking ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Raised By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Resolution
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    Resolved
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {resolvedComplaints.map(complaint => (
                  <tr key={complaint.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-mono text-xs">
                      {complaint.booking_id?.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          complaint.raised_by === "host"
                            ? "bg-teal-50 text-teal-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {complaint.raised_by === "host" ? "Host" : "Guest"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      {complaint.complaint_type === "damage_claim"
                        ? "Damage Claim"
                        : "Rental Dispute"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {complaint.admin_resolution?.replace(/_/g, " ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {complaint.resolved_at
                        ? new Date(complaint.resolved_at).toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedComplaint && (
        <ComplaintDetailPanel
          complaint={selectedComplaint}
          booking={bookings.find(b => b.id === selectedComplaint.booking_id)}
          property={properties.find(
            p => p.id === bookings.find(b => b.id === selectedComplaint.booking_id)?.property_id
          )}
          host={users.find(
            u => u.id === bookings.find(b => b.id === selectedComplaint.booking_id)?.host_id
          )}
          guest={users.find(
            u => u.id === bookings.find(b => b.id === selectedComplaint.booking_id)?.guest_id
          )}
          onClose={() => setSelectedComplaint(null)}
        />
      )}
    </div>
  );
}