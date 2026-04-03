// src/components/BookingBar.jsx

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getCleanerStats } from "@/api/cleanerStats";
import { useAuth } from "@/lib/AuthContext";

export default function BookingBar({ event, onClick }) {
  const { user } = useAuth();

  const {
    type,
    guest_name,
    cleaner_name,
    cleaner_id,
    company_name,
    scheduled_start,
    scheduled_end,
    status,
    color,
  } = event;

  //
  // Fetch reliability stats for cleaning jobs
  //
  const { data: stats } = useQuery({
    queryKey: ["cleaner-stats", cleaner_id],
    queryFn: () => getCleanerStats(cleaner_id),
    enabled: type === "cleaning" && !!cleaner_id,
  });

  //
  // Determine label text
  //
  let line1 = "";
  let line2 = "";

  if (type === "booking") {
    line1 = guest_name || "Booking";
  }

  if (type === "cleaning") {
    line1 = cleaner_name || company_name || "Cleaner";

    const start = new Date(scheduled_start);
    const end = new Date(scheduled_end);

    const startTime = start.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const endTime = end.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    line2 = `${startTime} → ${endTime}`;
  }

  if (type === "blocked") {
    line1 = "Blocked";
  }

  if (type === "conflict") {
    line1 = "Conflict";
  }

  //
  // Reliability badge colour
  //
  function reliabilityColor(score) {
    if (!score && score !== 0) return null;
    if (score >= 90) return "#16a34a"; // green
    if (score >= 70) return "#f59e0b"; // amber
    return "#dc2626"; // red
  }

  const badgeColor =
    type === "cleaning" && stats
      ? reliabilityColor(stats.reliabilityScore)
      : null;

  //
  // Render the bar
  //
  return (
    <div
      className="booking-bar"
      onClick={onClick}
      style={{
        backgroundColor: color,
        borderRadius: "4px",
        padding: "4px 6px",
        marginBottom: "4px",
        cursor: "pointer",
        color: "white",
        fontSize: "12px",
        lineHeight: "14px",
        position: "relative",
      }}
    >
      <div className="booking-bar-line1">{line1}</div>

      {line2 && (
        <div
          className="booking-bar-line2"
          style={{ opacity: 0.9, fontSize: "11px" }}
        >
          {line2}
        </div>
      )}

      {/* Reliability badge */}
      {badgeColor && (
        <div
          style={{
            position: "absolute",
            right: 4,
            top: 4,
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: badgeColor,
          }}
        />
      )}
    </div>
  );
}