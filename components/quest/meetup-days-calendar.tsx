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

type Props = {
  timezone: string;
  selectedDays: Date[];
  onDaysChange: (days: Date[]) => void;
  disabledBefore: Date;
  numberOfMonths?: number;
  className?: string;
};

/**
 * Multi-day picker with tap–drag painting. Uses pointer events so touch and mouse
 * both paint across days without double-toggling on click.
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
  const suppressClickRef = React.useRef(false);
  const selectedRef = React.useRef(selectedDays);
  const onDaysChangeRef = React.useRef(onDaysChange);

  React.useLayoutEffect(() => {
    selectedRef.current = selectedDays;
    onDaysChangeRef.current = onDaysChange;
  }, [selectedDays, onDaysChange]);

  React.useEffect(() => {
    function onPointerEnd() {
      dragActiveRef.current = null;
      dragWorkRef.current = null;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    return () => {
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
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
            suppressClickRef.current = false;
            if (props.modifiers.disabled) return;
            /* Touch/pen primary contact may not use mouse button 0; only filter secondary mouse buttons. */
            if (e.pointerType === "mouse" && e.button !== 0) return;
            const key = dateToDayKeyInTimezone(props.day.date, timezone);
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
            suppressClickRef.current = true;
          }}
          onPointerEnter={(e) => {
            props.onPointerEnter?.(e);
            if (props.modifiers.disabled) return;
            const st = dragActiveRef.current;
            const work = dragWorkRef.current;
            if (!st?.active || !work) return;
            const key = dateToDayKeyInTimezone(props.day.date, timezone);
            if (st.mode === "add") work.add(key);
            else work.delete(key);
            onDaysChangeRef.current(keysToSortedDates(work));
          }}
          onClick={(e) => {
            if (suppressClickRef.current) {
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
