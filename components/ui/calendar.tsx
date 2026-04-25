"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        month_caption: "flex items-center justify-center pt-1 pb-2",
        caption_label: "text-sm font-semibold text-foreground tracking-wide",
        nav: "flex items-center justify-between absolute inset-x-2 top-2",
        button_previous:
          "h-7 w-7 inline-flex items-center justify-center rounded-md border border-border/70 bg-background/60 text-muted-foreground hover:text-foreground hover:border-primary/60 transition",
        button_next:
          "h-7 w-7 inline-flex items-center justify-center rounded-md border border-border/70 bg-background/60 text-muted-foreground hover:text-foreground hover:border-primary/60 transition",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/80 text-center pb-1",
        week: "flex w-full mt-1",
        day: "h-9 w-9 p-0 text-center text-sm relative",
        day_button:
          "h-9 w-9 rounded-md text-sm font-medium text-foreground/90 hover:bg-primary/15 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        today: "text-accent font-bold",
        outside: "text-muted-foreground/40",
        disabled: "text-muted-foreground/30 pointer-events-none",
        hidden: "invisible",
        selected:
          "[&_button]:bg-primary [&_button]:text-primary-foreground [&_button]:shadow-[0_0_20px_-4px_hsl(var(--primary))] [&_button]:hover:bg-primary",
        range_start:
          "[&_button]:bg-primary [&_button]:text-primary-foreground [&_button]:rounded-r-none",
        range_end:
          "[&_button]:bg-primary [&_button]:text-primary-foreground [&_button]:rounded-l-none",
        range_middle:
          "[&_button]:bg-primary/25 [&_button]:text-foreground [&_button]:rounded-none [&_button]:hover:bg-primary/35",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...p }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...p} />
          ) : (
            <ChevronRight className="h-4 w-4" {...p} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
