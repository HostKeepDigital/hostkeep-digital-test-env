export default function CalendarEventDrawer({ event, onClose }) {
  const {
    type,
    guest_name,
    cleaner_name,
    company_name,
    scheduled_start,
    scheduled_end,
    status,
    started_at,
    completed_at,
    delay_reported,
  } = event;

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

  return (
    <div className="drawer-overlay">
      <div className="drawer">
        <div className="drawer-header">
          <h2>
            {type === "booking" && guest_name}
            {type === "cleaning" && (cleaner_name || company_name)}
            {type === "blocked" && "Blocked Date"}
            {type === "conflict" && "Calendar Conflict"}
          </h2>

          <button className="drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="drawer-section">
          <h3>Time Window</h3>
          <p>
            {start.toDateString()} — {startTime} → {endTime}
          </p>
        </div>

        {type === "booking" && (
          <div className="drawer-section">
            <h3>Booking Details</h3>
            <p>Guest: {guest_name}</p>
            <p>Source: {event.source}</p>
          </div>
        )}

        {type === "cleaning" && (
          <div className="drawer-section">
            <h3>Cleaning Job</h3>
            <p>Status: {statusLabel(status)}</p>

            {started_at && (
              <p>
                Started:{" "}
                {new Date(started_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            {completed_at && (
              <p>
                Completed:{" "}
                {new Date(completed_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            {delay_reported && <p>Delay reported by cleaner</p>}
          </div>
        )}

        {type === "cleaning" && (
          <div className="drawer-section drawer-actions">
            {status === "assigned" || status === "awaiting_start" ? (
              <button className="drawer-btn-primary">Start Job</button>
            ) : null}

            {status === "in_progress" ? (
              <button className="drawer-btn-primary">Complete Job</button>
            ) : null}

            <button className="drawer-btn-secondary">Reschedule Clean</button>
          </div>
        )}
      </div>
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