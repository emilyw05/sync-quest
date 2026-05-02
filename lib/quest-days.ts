import { addDays, differenceInCalendarDays, isValid } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import type { Quest } from "@/lib/types";

/** Ordered calendar columns for the availability grid (host-local midnight anchors). */
export function expandQuestDays(quest: Quest): Date[] {
  if (quest.meeting_day_keys?.length) {
    return [...new Set(quest.meeting_day_keys.filter(Boolean))]
      .sort()
      .map((k) => fromZonedTime(`${k}T00:00:00`, quest.host_timezone));
  }
  const start = new Date(quest.start_date);
  const end = new Date(quest.end_date);
  if (!isValid(start) || !isValid(end)) return [];
  const n = Math.max(0, differenceInCalendarDays(end, start)) + 1;
  const days: Date[] = [];
  for (let i = 0; i < n; i++) days.push(addDays(start, i));
  return days;
}
