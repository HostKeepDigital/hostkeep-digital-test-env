/**
 * iCal Service
 *
 * Provides:
 *  - parseICal(text): Parse VEVENTs from an iCal feed
 *  - generateICal(events): Convert events → iCal text
 *
 * This is intentionally dependency‑free and Deno‑compatible.
 */

export interface ICalEvent {
  uid: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  summary?: string;
  raw?: Record<string, unknown>;
}

/**
 * Convert YYYYMMDD → YYYY-MM-DD
 */
function normaliseDate(raw: string): string {
  if (!raw) return "";
  return raw.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
}

/**
 * Convert YYYY-MM-DD → YYYYMMDD
 */
function toICalDate(date: string): string {
  return date.replace(/-/g, "");
}

/**
 * Parse an iCal feed into VEVENT objects.
 */
export function parseICal(icalText: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = icalText.split(/\r?\n/);

  let current: any = null;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = {};
    } else if (line.startsWith("END:VEVENT")) {
      if (current?.start && current?.end) {
        events.push({
          uid: current.uid || crypto.randomUUID(),
          start: current.start,
          end: current.end,
          summary: current.summary || "External Booking",
          raw: { ...current }
        });
      }
      current = null;
    } else if (current) {
      if (line.startsWith("UID:")) {
        current.uid = line.replace("UID:", "").trim();
      }
      if (line.startsWith("DTSTART")) {
        const raw = line.split(":")[1]?.trim();
        current.start = normaliseDate(raw);
      }
      if (line.startsWith("DTEND")) {
        const raw = line.split(":")[1]?.trim();
        current.end = normaliseDate(raw);
      }
      if (line.startsWith("SUMMARY:")) {
        current.summary = line.replace("SUMMARY:", "").trim();
      }
    }
  }

  return events;
}

/**
 * Generate an iCal feed from event objects.
 */
export function generateICal(events: ICalEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HostKeep//ChannelManager//EN"
  ];

  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTART;VALUE=DATE:${toICalDate(ev.start)}`);
    lines.push(`DTEND;VALUE=DATE:${toICalDate(ev.end)}`);
    lines.push(`SUMMARY:${ev.summary || "Booking"}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}