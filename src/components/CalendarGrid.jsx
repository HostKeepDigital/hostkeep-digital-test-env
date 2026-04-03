export default function CalendarGrid({ currentMonth, children }) {
  const startOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );

  const endOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  );

  const startDay = startOfMonth.getDay();
  const offset = startDay === 0 ? 6 : startDay - 1;
  const daysInMonth = endOfMonth.getDate();
  const totalCells = offset + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

  const dates = [];
  for (let i = 0; i < rows * 7; i++) {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      i - offset + 1
    );
    dates.push(date);
  }

  return (
    <div className="calendar-grid">
      <div className="calendar-row calendar-header-row">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="calendar-header-cell">
            {d}
          </div>
        ))}
      </div>

      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="calendar-row">
          {dates.slice(rowIndex * 7, rowIndex * 7 + 7).map((date, i) => (
            <div key={i} className="calendar-cell">
              <div className="calendar-date-number">{date.getDate()}</div>
              <div className="calendar-events-container">
                {children(date)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}