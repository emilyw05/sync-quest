/**
 * Timezone helpers for SyncQuest.
 *
 * Rule: availability slots are stored in the database as UTC ISO strings.
 * When rendering, we always project them into a viewer's IANA timezone so
 * participants see their own clock — never the host's.
 */

import { addMinutes, differenceInCalendarDays, format } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

const MINUTES_PER_DAY = 24 * 60;

/** Resolve the browser's IANA timezone with a safe fallback. */
export function getLocalTimezone(): string {
  if (typeof Intl === "undefined") return "UTC";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Given a calendar day (in `timezone`) and a minute-offset within that day,
 * return the absolute UTC `Date` it represents.
 *
 * Example: in "America/Los_Angeles", day=2026-05-03, offset=9*60 (9:00am)
 * returns `2026-05-03T16:00:00Z` on most dates, `2026-05-03T17:00:00Z` off DST.
 */
export function zonedDayMinuteToUtc(
  day: Date,
  minutesFromMidnight: number,
  timezone: string,
): Date {
  const dayKey = format(day, "yyyy-MM-dd");
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const local = `${dayKey}T${pad(hours)}:${pad(minutes)}:00`;
  return fromZonedTime(local, timezone);
}

/** Convert a UTC date to a zoned `Date` whose wall-clock fields reflect `timezone`. */
export function utcToZoned(utc: Date | string, timezone: string): Date {
  return toZonedTime(utc, timezone);
}

/** Format a UTC instant in a viewer's timezone with a date-fns format string. */
export function formatZoned(
  utc: Date | string,
  timezone: string,
  fmt = "EEE MMM d, h:mm a",
): string {
  return formatInTimeZone(utc, timezone, fmt);
}

/** Like `formatZoned`, but never throws (invalid timezone / date → fallback). */
export function formatZonedSafe(
  utc: Date | string,
  timezone: string,
  fmt: string,
  fallback = "—",
): string {
  try {
    return formatInTimeZone(utc, timezone, fmt);
  } catch {
    return fallback;
  }
}

/** Return HH:mm for a minutes-from-midnight value (display helper). */
export function formatMinutesOfDay(minutes: number, use12h = true): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  if (!use12h) {
    return `${h24.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = ((h24 + 11) % 12) + 1;
  return m === 0
    ? `${h12} ${period}`
    : `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

/**
 * Build the list of UTC slot instants for a quest grid.
 *
 * The host defines a [dayStart, dayEnd) window *in their own timezone* across a
 * date range. We expand it into discrete `slotMinutes`-wide UTC instants so the
 * database never has to know about calendar days.
 */
export function buildSlotGridUtc(params: {
  startDate: Date;
  endDate: Date;
  dayStartMinutes: number;
  dayEndMinutes: number;
  slotMinutes: number;
  hostTimezone: string;
}): Date[] {
  const {
    startDate,
    endDate,
    dayStartMinutes,
    dayEndMinutes,
    slotMinutes,
    hostTimezone,
  } = params;

  if (slotMinutes <= 0) return [];

  const totalDays = Math.max(0, differenceInCalendarDays(endDate, startDate)) + 1;
  const slots: Date[] = [];

  for (let d = 0; d < totalDays; d++) {
    const dayAnchor = zonedDayMinuteToUtc(startDate, 0, hostTimezone);
    const day = addMinutes(dayAnchor, d * MINUTES_PER_DAY);
    let t = dayStartMinutes;
    while (t < dayEndMinutes) {
      slots.push(addMinutes(day, t));
      t += slotMinutes;
    }
  }
  return slots;
}

/**
 * The "Midnight Line" — for a viewer whose local clock crosses midnight while
 * looking at a given host column, this returns the index (0-based) within the
 * column's slot list where the viewer's date rolls over. Returns `null` if the
 * column stays on a single calendar day for the viewer.
 */
export function findMidnightLine(
  slotsUtc: Date[],
  viewerTimezone: string,
): number | null {
  try {
    if (slotsUtc.length < 2) return null;
    const firstDate = formatInTimeZone(slotsUtc[0], viewerTimezone, "yyyy-MM-dd");
    for (let i = 1; i < slotsUtc.length; i++) {
      const here = formatInTimeZone(slotsUtc[i], viewerTimezone, "yyyy-MM-dd");
      if (here !== firstDate) return i;
    }
    return null;
  } catch {
    return null;
  }
}

/** Short label like "GMT-7" for status chips. */
export function timezoneOffsetLabel(timezone: string, at: Date = new Date()): string {
  try {
    return formatInTimeZone(at, timezone, "zzz");
  } catch {
    return timezone;
  }
}
