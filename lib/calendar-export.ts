/**
 * Turn a confirmed meeting time into one-click links for the major calendar
 * apps. All inputs are UTC instants so output is consistent regardless of the
 * viewer's timezone.
 */

type CalendarEvent = {
  title: string;
  description?: string;
  location?: string;
  startUtc: Date;
  endUtc: Date;
};

function toGoogleDate(d: Date): string {
  const iso = d.toISOString();
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function qp(params: Record<string, string | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) usp.set(k, v);
  }
  return usp.toString();
}

export function buildGoogleCalendarUrl(ev: CalendarEvent): string {
  const dates = `${toGoogleDate(ev.startUtc)}/${toGoogleDate(ev.endUtc)}`;
  const qs = qp({
    action: "TEMPLATE",
    text: ev.title,
    dates,
    details: ev.description,
    location: ev.location,
  });
  return `https://www.google.com/calendar/render?${qs}`;
}

export function buildOutlookCalendarUrl(ev: CalendarEvent): string {
  const qs = qp({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: ev.title,
    body: ev.description,
    location: ev.location,
    startdt: ev.startUtc.toISOString(),
    enddt: ev.endUtc.toISOString(),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${qs}`;
}

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Build a self-contained .ics file payload. */
export function buildIcsContent(ev: CalendarEvent, uid: string): string {
  const stamp = toGoogleDate(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SyncQuest//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@syncquest`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toGoogleDate(ev.startUtc)}`,
    `DTEND:${toGoogleDate(ev.endUtc)}`,
    `SUMMARY:${icsEscape(ev.title)}`,
    ev.description ? `DESCRIPTION:${icsEscape(ev.description)}` : "",
    ev.location ? `LOCATION:${icsEscape(ev.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

/** Build a data: URL that, when opened, triggers the OS to add an .ics event (Apple Calendar). */
export function buildIcsDataUrl(ev: CalendarEvent, uid: string): string {
  const ics = buildIcsContent(ev, uid);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
