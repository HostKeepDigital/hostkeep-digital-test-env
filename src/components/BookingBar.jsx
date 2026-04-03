export default function BookingBar({ event, onClick }) {
  const {
    type,
    guest_name,
    cleaner_name,
    company_name,
    scheduled_start,
    scheduled_end,
    status,
    color,
  } = event;

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

      {status && type === "cleaning" && (
        <div
          className="booking-bar-status"
          style={{
            marginTop: "2px",
            fontSize: "10px",
            opacity: 0.8,
          }}
        >
          {statusLabel(status)}
        </div>
      )}
    </div>
  );
}

function statusLabel(status) {
  switch (status) {
    case "assigned":
      return "Scheduled";
    case "awaiting_start":
      return "Awaiting Start";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    default:
      return status;
  }
}