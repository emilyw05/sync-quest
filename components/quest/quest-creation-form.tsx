"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { addDays, format } from "date-fns";
import {
  CalendarDays,
  Clock,
  Compass,
  Feather,
  Footprints,
  Loader2,
  Sparkles,
  Sun,
} from "lucide-react";
import { DuckMark } from "@/components/brand/logo";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  dateToDayKeyInTimezone,
  formatMinutesOfDay,
  getLocalTimezone,
  timezoneOffsetLabel,
} from "@/lib/timezone";
import { createQuest } from "@/lib/quest-api";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useClientValue, useHasMounted } from "@/lib/use-client-value";
import type { PostgrestError } from "@supabase/supabase-js";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h * 60);
const SLOT_PRESETS = [15, 30, 60];

function createQuestErrorMessage(
  isConfigured: boolean,
  persisted: boolean,
  supabaseError: PostgrestError | null,
): string | null {
  if (persisted) return null;
  if (!isConfigured) return null;

  if (supabaseError) {
    const code = (supabaseError as PostgrestError & { code?: string }).code;
    if (code === "PGRST202" || /Could not find the function/i.test(supabaseError.message)) {
      return "Database RPC missing or outdated. In Supabase: SQL Editor → paste and run the full `supabase/schema.sql` from this repo → wait ~1 min → try again.";
    }
    if (/JWT|invalid api key|Invalid API key/i.test(supabaseError.message)) {
      return "Bad Supabase API key. Match Vercel env to Project Settings → API, redeploy.";
    }
    return `Save failed: ${supabaseError.message}${supabaseError.hint ? ` — ${supabaseError.hint}` : ""}`;
  }

  return "Not saved. Check the console.";
}

export function QuestCreationForm() {
  const router = useRouter();
  const mounted = useHasMounted();
  const timezone = useClientValue(() => getLocalTimezone(), "UTC");

  const [title, setTitle] = React.useState("Team meetup");
  const [callsign, setCallsign] = React.useState("");
  /** `undefined` = use seeded default days until the host edits the calendar. */
  const [userDays, setUserDays] = React.useState<Date[] | undefined>(undefined);
  const [dayStart, setDayStart] = React.useState(9 * 60);
  const [dayEnd, setDayEnd] = React.useState(22 * 60);
  const [slotMinutes, setSlotMinutes] = React.useState(30);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const defaultDays = React.useMemo(() => {
    if (!mounted) return [] as Date[];
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => addDays(today, i));
  }, [mounted]);

  const selectedDays = userDays ?? defaultDays;

  const meetingDayKeys = React.useMemo(() => {
    const keys = new Set(
      selectedDays.map((d) => dateToDayKeyInTimezone(d, timezone)),
    );
    return [...keys].sort();
  }, [selectedDays, timezone]);

  const canSubmit =
    mounted &&
    callsign.trim().length >= 2 &&
    meetingDayKeys.length >= 1 &&
    dayEnd > dayStart &&
    !submitting;

  const daysLabel = React.useMemo(() => {
    if (meetingDayKeys.length === 0) return "Pick days";
    if (meetingDayKeys.length <= 2) {
      return meetingDayKeys
        .map((k) => {
          const [y, m, d] = k.split("-").map(Number);
          return format(new Date(y, m - 1, d), "MMM d");
        })
        .join(", ");
    }
    return `${meetingDayKeys.length} days`;
  }, [meetingDayKeys]);

  const totalSlots = React.useMemo(() => {
    if (!meetingDayKeys.length || dayEnd <= dayStart) return 0;
    return (
      meetingDayKeys.length *
      Math.ceil((dayEnd - dayStart) / slotMinutes)
    );
  }, [meetingDayKeys.length, dayStart, dayEnd, slotMinutes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || meetingDayKeys.length < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      const { quest, persisted, error: supabaseError } = await createQuest({
        title: title.trim(),
        hostCallsign: callsign.trim(),
        hostTimezone: timezone,
        meetingDayKeys,
        dayStartMinutes: dayStart,
        dayEndMinutes: dayEnd,
        slotMinutes,
      });

      const message = createQuestErrorMessage(
        isSupabaseConfigured(),
        persisted,
        supabaseError,
      );
      if (message) {
        setError(message);
        setSubmitting(false);
        return;
      }

      router.push(`/meetup/${quest.slug}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not create.");
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/20 ring-2 ring-primary/40">
              <DuckMark size={28} />
            </span>
            <div>
              <CardTitle className="text-2xl">New meetup</CardTitle>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="relative space-y-6">
            {!isSupabaseConfigured() && (
              <div className="flex items-start gap-2 rounded-2xl border-2 border-secondary/40 bg-secondary/10 px-3 py-2 text-xs text-secondary-foreground">
                <Sparkles className="mt-[2px] h-3.5 w-3.5 shrink-0 text-secondary" />
                <span>
                  Preview — add{" "}
                  <code className="font-mono">NEXT_PUBLIC_SUPABASE_*</code> to{" "}
                  <code className="font-mono">.env.local</code> for live data.
                </span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" icon={<Sparkles className="h-3.5 w-3.5" />}>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Team meetup"
                  maxLength={80}
                />
              </Field>

              <Field label="Your name" icon={<Compass className="h-3.5 w-3.5" />}>
                <Input
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  placeholder="Alex"
                  maxLength={24}
                  autoComplete="off"
                  required
                />
              </Field>
            </div>

            <Field label="Days" icon={<CalendarDays className="h-3.5 w-3.5" />}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className={cn(
                      "w-full justify-between text-left font-medium",
                      meetingDayKeys.length === 0 && "text-muted-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {daysLabel}
                    </span>
                    {meetingDayKeys.length > 0 && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {meetingDayKeys.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto" align="start">
                  <Calendar
                    mode="multiple"
                    numberOfMonths={2}
                    selected={selectedDays}
                    onSelect={(d) => setUserDays(d ?? [])}
                    disabled={{ before: new Date() }}
                  />
                </PopoverContent>
              </Popover>
            </Field>

            <Field label="Hours" icon={<Sun className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-2 gap-2">
                <TimeSelect
                  value={dayStart}
                  onChange={setDayStart}
                  options={HOUR_OPTIONS}
                  ariaLabel="Start"
                />
                <TimeSelect
                  value={dayEnd}
                  onChange={setDayEnd}
                  options={HOUR_OPTIONS.map((m) => m + 60)}
                  ariaLabel="End"
                />
              </div>
            </Field>

            <Field label="Slot" icon={<Footprints className="h-3.5 w-3.5" />}>
              <div className="flex gap-2">
                {SLOT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSlotMinutes(preset)}
                    className={cn(
                      "relative h-11 flex-1 rounded-2xl border-2 text-sm font-bold transition-all",
                      preset === slotMinutes
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/60",
                    )}
                  >
                    {preset}m
                  </button>
                ))}
              </div>
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-border bg-card/60 px-4 py-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 items-center rounded-full bg-secondary/20 px-2 font-bold text-secondary">
                  {mounted ? timezoneOffsetLabel(timezone) : "—"}
                </span>
                <span className="truncate">{mounted ? timezone : "…"}</span>
              </div>
              <div className="tabular-nums">
                <span className="text-foreground font-bold">{totalSlots}</span> slots
                <span className="mx-1">·</span>
                <span className="text-foreground font-bold">{meetingDayKeys.length}</span>{" "}
                days
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Share link · guests pick a name</p>
            <Button
              type="submit"
              variant="raid"
              size="lg"
              disabled={!canSubmit}
              className="min-w-[200px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> …
                </>
              ) : (
                <>
                  <Feather className="h-4 w-4" /> Create
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}

function TimeSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  options: number[];
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "h-11 w-full appearance-none rounded-2xl border-2 border-border bg-card px-4 pr-9 text-sm font-medium text-foreground",
          "outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
        )}
      >
        {options.map((m) => (
          <option key={m} value={m} className="bg-popover text-foreground">
            {formatMinutesOfDay(m)}
          </option>
        ))}
      </select>
      <Clock className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
