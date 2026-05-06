"use client";

import * as React from "react";
import { DayButton, type DayButtonProps } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { dateToDayKeyInTimezone } from "@/lib/timezone";

function keysToSortedDates(keys: Set<string>): Date[] {
  return [...keys]
    .sort()
    .map((k) => {
      const [y, m, d] = k.split("-").map(Number);
      return new Date(y, m - 1, d);
    });
}

/** Delay before clearing painted keys so iOS/WebKit synthetic clicks are suppressed. */
const PAINTED_KEY_CLICK_GUARD_MS = 480;

type Props = {
  timezone: string;
  selectedDays: Date[];
  onDaysChange: (days: Date[]) => void;
  disabledBefore: Date;
  numberOfMonths?: number;
  className?: string;
};

/**
 * Multi-day picker with tap–drag painting. Pointer events own selection; we block the
 * follow-up synthetic click from react-day-picker so taps don't double-toggle.
 */
export function MeetupDaysCalendar({
  timezone,
  selectedDays,
  onDaysChange,
  disabledBefore,
  numberOfMonths = 2,
  className,
}: Props) {
  const dragActiveRef = React.useRef<{ active: boolean; mode: "add" | "remove" } | null>(
    null,
  );
  const dragWorkRef = React.useRef<Set<string> | null>(null);
  /** Days updated during the current pointer gesture — suppress library click for these. */
  const paintedKeysRef = React.useRef<Set<string>>(new Set());
  const clearPaintedTimerRef = React.useRef<number | null>(null);
  const selectedRef = React.useRef(selectedDays);
  const onDaysChangeRef = React.useRef(onDaysChange);

  React.useLayoutEffect(() => {
    selectedRef.current = selectedDays;
    onDaysChangeRef.current = onDaysChange;
  }, [selectedDays, onDaysChange]);

  function scheduleClearPaintedKeys() {
    if (clearPaintedTimerRef.current != null) {
      clearTimeout(clearPaintedTimerRef.current);
    }
    clearPaintedTimerRef.current = window.setTimeout(() => {
      paintedKeysRef.current.clear();
      clearPaintedTimerRef.current = null;
    }, PAINTED_KEY_CLICK_GUARD_MS);
  }

  React.useEffect(() => {
    function onPointerEnd() {
      dragActiveRef.current = null;
      dragWorkRef.current = null;
      scheduleClearPaintedKeys();
    }
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    return () => {
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      if (clearPaintedTimerRef.current != null) {
        clearTimeout(clearPaintedTimerRef.current);
        clearPaintedTimerRef.current = null;
      }
    };
  }, []);

  const DragDayButton = React.useMemo(() => {
    function MeetupDragDayButton(props: DayButtonProps) {
      return (
        <DayButton
          {...props}
          className={cn(props.className, "touch-manipulation select-none")}
          onPointerDown={(e) => {
            props.onPointerDown?.(e);
            if (props.modifiers.disabled) return;
            if (e.pointerType === "mouse" && e.button !== 0) return;

            if (clearPaintedTimerRef.current != null) {
              clearTimeout(clearPaintedTimerRef.current);
              clearPaintedTimerRef.current = null;
            }

            const key = dateToDayKeyInTimezone(props.day.date, timezone);
            paintedKeysRef.current.clear();
            paintedKeysRef.current.add(key);

            const base = new Set(
              selectedRef.current.map((d) => dateToDayKeyInTimezone(d, timezone)),
            );
            const isSel = base.has(key);
            const mode = isSel ? "remove" : "add";
            dragActiveRef.current = { active: true, mode };
            if (mode === "add") base.add(key);
            else base.delete(key);
            dragWorkRef.current = base;
            onDaysChangeRef.current(keysToSortedDates(base));

            const el = e.currentTarget;
            if (el instanceof HTMLButtonElement && typeof el.setPointerCapture === "function") {
              try {
                el.setPointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
            }
          }}
          onPointerEnter={(e) => {
            props.onPointerEnter?.(e);
            if (props.modifiers.disabled) return;
            const st = dragActiveRef.current;
            const work = dragWorkRef.current;
            if (!st?.active || !work) return;
            const key = dateToDayKeyInTimezone(props.day.date, timezone);
            paintedKeysRef.current.add(key);
            if (st.mode === "add") work.add(key);
            else work.delete(key);
            onDaysChangeRef.current(keysToSortedDates(work));
          }}
          onClick={(e) => {
            const key = dateToDayKeyInTimezone(props.day.date, timezone);
            if (paintedKeysRef.current.has(key)) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            props.onClick?.(e);
          }}
        />
      );
    }
    MeetupDragDayButton.displayName = "MeetupDragDayButton";
    return MeetupDragDayButton;
  }, [timezone]);

  return (
    <Calendar
      mode="multiple"
      numberOfMonths={numberOfMonths}
      selected={selectedDays}
      onSelect={(d) => onDaysChange(d ?? [])}
      disabled={{ before: disabledBefore }}
      className={className}
      components={{ DayButton: DragDayButton }}
    />
  );
}
