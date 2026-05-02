"use client";

import * as React from "react";
import { addDays, differenceInCalendarDays, isValid } from "date-fns";
import { Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildSlotGridUtc,
  findMidnightLine,
  formatMinutesOfDay,
  formatZonedSafe,
} from "@/lib/timezone";
import type { Quest } from "@/lib/types";
import type { QuestSnapshot } from "@/lib/quest-store";

type Props = {
  quest: Quest;
  snapshot: QuestSnapshot;
  viewerTimezone: string;
  viewerParticipantId: string | null;
  readOnly?: boolean;
  onToggleSlot?: (slotIso: string) => void;
  /** Host UI can tell the grid to highlight / select a given slot. */
  highlightedSlotIso?: string | null;
  onSlotClick?: (slotIso: string) => void;
};

type CellMeta = {
  slotIso: string;
  count: number;
  mine: boolean;
};

function pickHeatVar(ratio: number, participants: number): string {
  if (participants <= 0) return "var(--color-heat-0)";
  if (ratio >= 0.999) return "var(--color-heat-max)";
  if (ratio <= 0) return "var(--color-heat-0)";
  const bucket = Math.min(5, Math.max(1, Math.ceil(ratio * 5)));
  return `var(--color-heat-${bucket})`;
}

export function AvailabilityGrid({
  quest,
  snapshot,
  viewerTimezone,
  viewerParticipantId,
  readOnly,
  onToggleSlot,
  highlightedSlotIso,
  onSlotClick,
}: Props) {
  const gridRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ mode: "add" | "remove" | null; visited: Set<string> }>({
    mode: null,
    visited: new Set(),
  });

  const { days, rowStarts } = React.useMemo(() => {
    const start = new Date(quest.start_date);
    const end = new Date(quest.end_date);
    if (!isValid(start) || !isValid(end)) {
      return { days: [] as Date[], rowStarts: [] as number[] };
    }
    const totalDays = Math.max(0, differenceInCalendarDays(end, start)) + 1;
    const daysArr: Date[] = [];
    for (let i = 0; i < totalDays; i++) daysArr.push(addDays(start, i));
    if (quest.slot_minutes <= 0) {
      return { days: daysArr, rowStarts: [] as number[] };
    }
    const rowsPerDay = Math.ceil(
      (quest.day_end_minutes - quest.day_start_minutes) / quest.slot_minutes,
    );
    const rowMins: number[] = [];
    for (let r = 0; r < rowsPerDay; r++) {
      rowMins.push(quest.day_start_minutes + r * quest.slot_minutes);
    }
    return { days: daysArr, rowStarts: rowMins };
  }, [quest]);

  const slotMatrix = React.useMemo(() => {
    // Expand [days x rows] into UTC Date instants.
    const matrix: Date[][] = [];
    try {
      for (const day of days) {
        const slots = buildSlotGridUtc({
          startDate: day,
          endDate: day,
          dayStartMinutes: quest.day_start_minutes,
          dayEndMinutes: quest.day_end_minutes,
          slotMinutes: quest.slot_minutes,
          hostTimezone: quest.host_timezone,
        });
        matrix.push(slots);
      }
    } catch (err) {
      console.error("[syncquest] buildSlotGridUtc failed", err);
      return days.map(() => []);
    }
    return matrix;
  }, [days, quest]);

  const midnightLines = React.useMemo(() => {
    return slotMatrix.map((slots) => findMidnightLine(slots, viewerTimezone));
  }, [slotMatrix, viewerTimezone]);

  const countsBySlot = React.useMemo(() => {
    const totals = new Map<string, number>();
    for (const [, set] of snapshot.availability) {
      for (const iso of set) {
        totals.set(iso, (totals.get(iso) ?? 0) + 1);
      }
    }
    return totals;
  }, [snapshot.availability]);

  const mineSet = React.useMemo(() => {
    if (!viewerParticipantId) return new Set<string>();
    return snapshot.availability.get(viewerParticipantId) ?? new Set<string>();
  }, [snapshot.availability, viewerParticipantId]);

  const participantCount = snapshot.participants.length;

  function cellMeta(slot: Date): CellMeta {
    if (!isValid(slot)) {
      return { slotIso: "", count: 0, mine: false };
    }
    const iso = slot.toISOString();
    return {
      slotIso: iso,
      count: countsBySlot.get(iso) ?? 0,
      mine: mineSet.has(iso),
    };
  }

  function applyCell(slotIso: string, mode: "add" | "remove") {
    if (readOnly || !viewerParticipantId || !onToggleSlot) return;
    const mine = mineSet.has(slotIso);
    if (mode === "add" && !mine) onToggleSlot(slotIso);
    if (mode === "remove" && mine) onToggleSlot(slotIso);
  }

  function handlePointerDown(slotIso: string, e: React.PointerEvent) {
    if (readOnly || !viewerParticipantId || !onToggleSlot) {
      onSlotClick?.(slotIso);
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const mine = mineSet.has(slotIso);
    const mode: "add" | "remove" = mine ? "remove" : "add";
    dragRef.current = { mode, visited: new Set([slotIso]) };
    onToggleSlot(slotIso);
  }

  function handlePointerEnter(slotIso: string) {
    const drag = dragRef.current;
    if (!drag.mode) return;
    if (drag.visited.has(slotIso)) return;
    drag.visited.add(slotIso);
    applyCell(slotIso, drag.mode);
  }

  function endDrag() {
    dragRef.current = { mode: null, visited: new Set() };
  }

  React.useEffect(() => {
    const handler = () => endDrag();
    window.addEventListener("pointerup", handler);
    window.addEventListener("pointercancel", handler);
    return () => {
      window.removeEventListener("pointerup", handler);
      window.removeEventListener("pointercancel", handler);
    };
  }, []);

  const timeLabels = React.useMemo(() => {
    // Render time labels in the viewer's timezone by using column 0 as reference.
    const ref = slotMatrix[0] ?? [];
    return rowStarts.map((_, idx) => {
      const slot = ref[idx];
      if (!slot) return "";
      return formatZonedSafe(slot, viewerTimezone, "h:mm a");
    });
  }, [rowStarts, slotMatrix, viewerTimezone]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Pond clock: <span className="text-foreground font-bold">{viewerTimezone}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span
              aria-hidden
              className="h-3.5 w-3.5 rounded-md border border-border/60"
              style={{ background: "var(--color-heat-0)" }}
            />
            empty pond
          </span>
          <span className="flex items-center gap-1">
            <span
              aria-hidden
              className="h-3.5 w-3.5 rounded-md"
              style={{ background: "var(--color-heat-3)" }}
            />
            some ducks
          </span>
          <span className="flex items-center gap-1">
            <span
              aria-hidden
              className="h-3.5 w-3.5 rounded-md glow-gold"
              style={{ background: "var(--color-heat-max)" }}
            />
            all in! {participantCount > 0 ? `(${participantCount})` : ""}
          </span>
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          ref={gridRef}
          className="inline-block min-w-full select-none rounded-3xl border-2 border-border bg-card p-4"
          onPointerLeave={endDrag}
        >
          {/* Day headers */}
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `72px repeat(${days.length}, minmax(64px, 1fr))`,
            }}
          >
            <div />
            {days.map((day, idx) => (
              <DayHeader key={idx} day={day} hostTimezone={quest.host_timezone} />
            ))}
          </div>

          {/* Rows */}
          <div
            className="mt-1 grid gap-1"
            style={{
              gridTemplateColumns: `72px repeat(${days.length}, minmax(64px, 1fr))`,
            }}
          >
            {rowStarts.map((rowMin, rowIdx) => (
              <React.Fragment key={rowIdx}>
                <div className="sticky left-0 z-10 -ml-1 flex items-start justify-end bg-gradient-to-r from-background/90 via-background/60 to-transparent pr-2 pt-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                  {timeLabels[rowIdx] || formatMinutesOfDay(rowMin)}
                </div>
                {days.map((_, colIdx) => {
                  const slot = slotMatrix[colIdx]?.[rowIdx];
                  if (!slot) {
                    return <div key={colIdx} className="h-7 rounded-sm bg-transparent" />;
                  }
                  const meta = cellMeta(slot);
                  const ratio = participantCount ? meta.count / participantCount : 0;
                  const color = pickHeatVar(ratio, participantCount);
                  const atMax = ratio >= 0.999 && participantCount > 0;
                  const midnightAt = midnightLines[colIdx];
                  const showMidnightLine = midnightAt === rowIdx;
                  const isHighlighted = highlightedSlotIso === meta.slotIso;
                  return (
                    <button
                      key={colIdx}
                      type="button"
                      data-slot={meta.slotIso}
                      onPointerDown={(e) => handlePointerDown(meta.slotIso, e)}
                      onPointerEnter={() => handlePointerEnter(meta.slotIso)}
                      onClick={() => {
                        // Click handler for read-only/host selection flows.
                        if (readOnly) onSlotClick?.(meta.slotIso);
                      }}
                      className={cn(
                        "relative grid h-7 place-items-center rounded-md border border-white/40 outline-none transition-transform touch-none",
                        "focus-visible:ring-2 focus-visible:ring-primary/60",
                        meta.mine && "ring-2 ring-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]",
                        meta.mine && "animate-paint-pop",
                        atMax && "glow-gold",
                        isHighlighted &&
                          "ring-2 ring-secondary shadow-[0_0_0_2px_hsl(var(--secondary)/0.6),0_0_18px_-2px_hsl(var(--secondary))]",
                        readOnly ? "cursor-pointer" : "cursor-crosshair",
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Slot ${formatZonedSafe(slot, viewerTimezone, "EEE MMM d, h:mm a")} — ${meta.count} duck${meta.count === 1 ? "" : "s"} ready`}
                    >
                      {atMax && (
                        <Sun
                          aria-hidden
                          className="h-3 w-3 text-primary-foreground/80"
                          strokeWidth={2.6}
                        />
                      )}
                      {!atMax && meta.mine && (
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_2px_hsl(var(--card))]"
                        />
                      )}
                      {showMidnightLine && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-x-0 -top-[1px] h-[2px] rounded-full bg-gradient-to-r from-transparent via-secondary to-transparent shadow-[0_0_6px_hsl(var(--secondary))]"
                        />
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {participantCount === 0 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Waiting for the first duckling to paint a waddle window…
            </p>
          )}
        </div>
      </div>

      {!readOnly && viewerParticipantId && (
        <p className="text-center text-[11px] text-muted-foreground">
          Tap or drag to paint your waddle windows. The{" "}
          <span className="text-secondary font-bold">orange line</span> marks
          where your local day rolls into the next.
        </p>
      )}
    </div>
  );
}

function DayHeader({ day, hostTimezone }: { day: Date; hostTimezone: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1 py-1">
      <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/80">
        {formatZonedSafe(day, hostTimezone, "EEE")}
      </span>
      <span className="text-xs font-semibold text-foreground tabular-nums">
        {formatZonedSafe(day, hostTimezone, "MMM d")}
      </span>
    </div>
  );
}
