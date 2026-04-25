"use client";

import * as React from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Sparkles, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { CalendarLoot } from "@/components/quest/calendar-loot";
import { DuckMark } from "@/components/brand/logo";
import { formatZoned } from "@/lib/timezone";
import type { Quest } from "@/lib/types";
import type { QuestSnapshot } from "@/lib/quest-store";

type Props = {
  quest: Quest;
  snapshot: QuestSnapshot;
  viewerTimezone: string;
};

/*
 * Daisy-petal confetti.
 *
 * canvas-confetti supports custom shapes via Path2D objects (passed through
 * `confetti.shapeFromPath`). We construct a single 5-petal flower and let the
 * library scatter it in pastel cream/yellow/white tones to match the duck
 * theme. Falls back to plain shapes if shapeFromPath is unavailable.
 */
function makeDaisyShapes(): confetti.Shape[] | null {
  if (typeof confetti.shapeFromPath !== "function") return null;
  const petalsPath =
    // Five rounded petals around the center, then a small core.
    "M0,-7 C3,-7 4,-3 0,-2 C-4,-3 -3,-7 0,-7 Z " +
    "M6.7,-2.2 C7.6,0.6 4.6,2.4 1.5,0.6 C-0.5,-1 1.7,-3.6 6.7,-2.2 Z " +
    "M4.1,5.7 C2,8.2 -1.9,7.4 -1.4,4 C-1.1,1.8 2.5,1.7 4.1,5.7 Z " +
    "M-4.1,5.7 C-6,3.7 -3.6,1.7 -1.4,4 C-0.6,4.8 -2.5,7.6 -4.1,5.7 Z " +
    "M-6.7,-2.2 C-7.6,0.6 -4.6,2.4 -1.5,0.6 C0.5,-1 -1.7,-3.6 -6.7,-2.2 Z " +
    "M0,0 m-1.6,0 a1.6,1.6 0 1,0 3.2,0 a1.6,1.6 0 1,0 -3.2,0 Z";
  return [confetti.shapeFromPath({ path: petalsPath })];
}

export function VictoryState({ quest, snapshot, viewerTimezone }: Props) {
  const firedRef = React.useRef(false);

  React.useEffect(() => {
    if (firedRef.current) return;
    if (!snapshot.confirmedStartUtc) return;
    firedRef.current = true;

    /*
     * Daisy-petal palette: white center, soft yellow petals, hint of orange
     * and pond-green to feel like a sun-dappled meadow.
     */
    const colors = ["#FFFFFF", "#FBBF24", "#FDE68A", "#FB923C", "#A7F3D0"];
    const daisies = makeDaisyShapes();
    const baseOpts: confetti.Options = {
      colors,
      ticks: 240,
      gravity: 0.7,
      scalar: 1.15,
      ...(daisies ? { shapes: daisies } : {}),
    };

    const end = Date.now() + 1600;
    (function burst() {
      confetti({
        ...baseOpts,
        particleCount: 6,
        angle: 60,
        spread: 65,
        startVelocity: 50,
        origin: { x: 0, y: 0.85 },
      });
      confetti({
        ...baseOpts,
        particleCount: 6,
        angle: 120,
        spread: 65,
        startVelocity: 50,
        origin: { x: 1, y: 0.85 },
      });
      if (Date.now() < end) {
        requestAnimationFrame(burst);
      }
    })();

    confetti({
      ...baseOpts,
      particleCount: 110,
      spread: 110,
      startVelocity: 38,
      origin: { y: 0.45 },
    });
  }, [snapshot.confirmedStartUtc]);

  if (!snapshot.confirmedStartUtc || !snapshot.confirmedEndUtc) return null;

  const participants = snapshot.participants;
  const eventDescription =
    `"${quest.title}" — set sail via SyncQuest.\n\n` +
    `Squad: ${participants.map((p) => p.callsign).join(", ")}\n` +
    `Pond link: ${typeof window !== "undefined" ? window.location.href : ""}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="overflow-hidden glow-gold border-primary/40">
        <CardContent className="relative flex flex-col items-center gap-6 px-6 pt-10 pb-8 text-center">
          {/* High-flippers animation: two ducks fly in and bump flippers */}
          <FlipperBump />

          <span className="inline-flex items-center gap-2 rounded-full border-2 border-primary/40 bg-primary/15 px-4 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Adventure ahead
          </span>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              All ducks in a row!
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground sm:text-base">
              The squad is formed. Our adventure begins!
            </p>
          </div>

          <div className="w-full max-w-md rounded-3xl border-2 border-primary/40 bg-card/80 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
              Set sail
            </p>
            <p className="mt-1 text-xl font-extrabold text-primary tabular-nums">
              {formatZoned(snapshot.confirmedStartUtc, viewerTimezone, "EEEE, MMM d")}
            </p>
            <p className="text-lg font-bold text-foreground/90 tabular-nums">
              {formatZoned(snapshot.confirmedStartUtc, viewerTimezone, "h:mm a")}
              {" → "}
              {formatZoned(snapshot.confirmedEndUtc, viewerTimezone, "h:mm a")}
              <span className="ml-2 text-xs font-medium text-muted-foreground">
                ({viewerTimezone})
              </span>
            </p>
          </div>

          <CalendarLoot
            title={quest.title}
            description={eventDescription}
            startUtc={snapshot.confirmedStartUtc}
            endUtc={snapshot.confirmedEndUtc}
            uid={`syncquest-${quest.slug}`}
          />

          {participants.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>The squad:</span>
              {participants.map((p) => (
                <span
                  key={p.id}
                  className="rounded-full border-2 border-border bg-card px-2.5 py-0.5 font-bold text-foreground/90"
                >
                  {p.callsign}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Two baby ducks waddle in from opposite sides and bump flippers ("high
 * flippers!"). Loops gently after the initial bump so the moment lingers
 * without becoming distracting.
 */
function FlipperBump() {
  return (
    <div className="relative flex h-20 w-44 items-end justify-center" aria-hidden>
      <motion.div
        className="absolute bottom-0 left-0"
        initial={{ x: -60, opacity: 0, rotate: -10 }}
        animate={{
          x: [-60, 28, 24, 28, 24],
          opacity: [0, 1, 1, 1, 1],
          rotate: [-10, 0, -4, 0, -4],
        }}
        transition={{
          duration: 1.6,
          times: [0, 0.45, 0.55, 0.75, 1],
          repeat: Infinity,
          repeatType: "reverse",
          repeatDelay: 0.4,
          ease: "easeOut",
        }}
      >
        <DuckMark size={56} />
      </motion.div>
      <motion.div
        className="absolute bottom-0 right-0 -scale-x-100"
        initial={{ x: 60, opacity: 0, rotate: 10 }}
        animate={{
          x: [60, -28, -24, -28, -24],
          opacity: [0, 1, 1, 1, 1],
          rotate: [10, 0, 4, 0, 4],
        }}
        transition={{
          duration: 1.6,
          times: [0, 0.45, 0.55, 0.75, 1],
          repeat: Infinity,
          repeatType: "reverse",
          repeatDelay: 0.4,
          ease: "easeOut",
        }}
      >
        <DuckMark size={56} />
      </motion.div>
      {/* Spark of contact at the apex of the bump */}
      <motion.div
        className="absolute bottom-8"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
        transition={{
          duration: 1.6,
          times: [0.4, 0.55, 0.7],
          repeat: Infinity,
          repeatDelay: 0.4,
        }}
      >
        <Sparkles className="h-6 w-6 text-primary" />
      </motion.div>
    </div>
  );
}
