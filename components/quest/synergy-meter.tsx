"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { DuckMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * Squad Formation Meter — formerly the Synergy Meter.
 *
 * Instead of a bare progress bar, we render a row of baby ducks waddling
 * into formation. The first N ducks (proportional to availability) appear
 * in full sunny color; the rest are pale outlines waiting in the pond. At
 * 100% the whole line glows and bobs together: "all ducks in a row."
 *
 * `value` is a normalized ratio in [0, 1].
 */
const TOTAL_DUCKS = 7;

export function SynergyMeter({
  value,
  participants,
  className,
}: {
  value: number;
  participants: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value));
  const atMax = pct >= 0.999;
  const filled = Math.round(pct * TOTAL_DUCKS);
  const label = atMax ? "Full lineup" : `${Math.round(pct * 100)}% overlap`;

  return (
    <div className={cn("w-full space-y-2.5", className)}>
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <span className="flex items-center gap-1.5 text-foreground/80">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Squad overlap
        </span>
        <span className="tabular-nums text-foreground/80">
          {participants} here
        </span>
      </div>

      <div
        className={cn(
          "relative flex items-end justify-between gap-1 rounded-full border-2 border-border bg-card px-3 py-2",
          atMax && "glow-gold animate-synergy-pulse border-primary/60",
        )}
      >
        {/* Pond ripple line beneath the ducks */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-1 left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-transparent via-secondary/40 to-transparent"
        />

        {Array.from({ length: TOTAL_DUCKS }).map((_, i) => {
          const isFilled = i < filled;
          return (
            <motion.div
              key={i}
              className={cn(
                "relative flex h-7 w-7 items-center justify-center",
                atMax && isFilled && "animate-duck-bob",
              )}
              style={{ animationDelay: `${i * 120}ms` }}
              initial={{ y: 6, opacity: 0 }}
              animate={{
                y: 0,
                opacity: isFilled ? 1 : 0.28,
                scale: isFilled ? 1 : 0.9,
              }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 18,
                delay: i * 0.04,
              }}
              aria-hidden
            >
              <DuckMark size={26} className={cn(!isFilled && "grayscale")} />
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span
          className={cn(
            "text-muted-foreground",
            atMax && "text-primary font-bold",
          )}
        >
          {label}
        </span>
        {atMax && (
          <span className="inline-flex items-center gap-1 text-primary font-bold">
            <Sparkles className="h-3 w-3" /> Go
          </span>
        )}
      </div>
    </div>
  );
}
