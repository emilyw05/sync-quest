"use client";

import * as React from "react";
import { addMinutes } from "date-fns";
import { motion } from "framer-motion";
import { Anchor, CalendarCheck, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatZoned } from "@/lib/timezone";
import type { Quest } from "@/lib/types";
import type { QuestSnapshot } from "@/lib/quest-store";

type Candidate = {
  slotIso: string;
  count: number;
  ratio: number;
};

type Props = {
  quest: Quest;
  snapshot: QuestSnapshot;
  viewerTimezone: string;
  selectedSlotIso: string | null;
  onSelectSlot: (slotIso: string | null) => void;
  onConfirm: (startUtc: string, endUtc: string) => Promise<void> | void;
};

export function HostControls({
  quest,
  snapshot,
  viewerTimezone,
  selectedSlotIso,
  onSelectSlot,
  onConfirm,
}: Props) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const participantCount = snapshot.participants.length;

  const topCandidates = React.useMemo<Candidate[]>(() => {
    const totals = new Map<string, number>();
    for (const [, set] of snapshot.availability) {
      for (const iso of set) {
        totals.set(iso, (totals.get(iso) ?? 0) + 1);
      }
    }
    const arr: Candidate[] = [];
    for (const [iso, count] of totals) {
      arr.push({
        slotIso: iso,
        count,
        ratio: participantCount ? count / participantCount : 0,
      });
    }
    arr.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.slotIso.localeCompare(b.slotIso);
    });
    return arr.slice(0, 4);
  }, [snapshot.availability, participantCount]);

  const activeIso = selectedSlotIso ?? topCandidates[0]?.slotIso ?? null;

  async function handleConfirm() {
    if (!activeIso) return;
    setSubmitting(true);
    setError(null);
    try {
      const start = new Date(activeIso);
      const end = addMinutes(start, quest.slot_minutes);
      await onConfirm(start.toISOString(), end.toISOString());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't drop anchor on this time.",
      );
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky bottom-4 z-20 rounded-3xl border-2 border-primary/40 bg-card p-4 shadow-[0_22px_50px_-18px_hsl(43_96%_56%_/_0.55)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/20 ring-2 ring-primary/40">
            <Anchor className="h-4 w-4 text-primary-foreground" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">Host</p>
            <p className="text-[11px] text-muted-foreground">Pick slot · confirm</p>
          </div>
        </div>
        <Button
          type="button"
          variant="gold"
          size="lg"
          disabled={!activeIso || submitting || participantCount === 0}
          onClick={handleConfirm}
          className="min-w-[200px]"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> …
            </>
          ) : (
            <>
              <CalendarCheck className="h-4 w-4" /> Confirm time
            </>
          )}
        </Button>
      </div>

      {topCandidates.length === 0 ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">No votes yet.</p>
      ) : (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {topCandidates.map((c) => {
            const isActive = activeIso === c.slotIso;
            const atMax = c.ratio >= 0.999 && participantCount > 0;
            return (
              <button
                key={c.slotIso}
                type="button"
                onClick={() => onSelectSlot(c.slotIso)}
                className={cn(
                  "flex shrink-0 flex-col items-start gap-1 rounded-2xl border-2 px-3 py-2 text-left transition-colors",
                  isActive
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:border-primary/60",
                )}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">
                  {atMax ? (
                    <>
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span className="text-primary font-bold">All free</span>
                    </>
                  ) : (
                    <span>
                      {c.count}/{participantCount}
                    </span>
                  )}
                </span>
                <span className="text-sm font-bold tabular-nums">
                  {formatZoned(c.slotIso, viewerTimezone, "EEE MMM d · h:mm a")}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-2xl border-2 border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </motion.div>
  );
}
