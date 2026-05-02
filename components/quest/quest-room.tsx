"use client";

import * as React from "react";
import Link from "next/link";
import { Anchor, ArrowLeft, Check, Copy, Loader2, LogOut, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncQuestLogo } from "@/components/brand/logo";
import { AvailabilityGrid } from "@/components/quest/availability-grid";
import { CallsignGate } from "@/components/quest/callsign-gate";
import { HostControls } from "@/components/quest/host-controls";
import { SynergyMeter } from "@/components/quest/synergy-meter";
import { VictoryState } from "@/components/quest/victory-state";

import { cn } from "@/lib/utils";
import { createQuestStore, type QuestStore } from "@/lib/quest-store";
import { getLocalTimezone } from "@/lib/timezone";
import {
  forgetParticipant,
  readParticipant,
  rememberParticipant,
  type ParticipantSession,
} from "@/lib/participant-token";
import { readHostToken } from "@/lib/host-token";
import { useClientValue } from "@/lib/use-client-value";
import type { Quest } from "@/lib/types";

type Props = { quest: Quest };

export function QuestRoom({ quest }: Props) {
  const [store] = React.useState<QuestStore>(() => createQuestStore(quest));
  const snapshot = React.useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const viewerTimezone = useClientValue(() => getLocalTimezone(), "UTC");
  // `useClientValue` does not re-render when localStorage changes (no-op
  // subscribe). After a successful join we must set React state, or
  // `readParticipant` stays stale and the gate never dismisses.
  const storedParticipant = useClientValue(
    () => readParticipant(quest.slug),
    null as ParticipantSession | null,
  );
  const [joinSession, setJoinSession] = React.useState<ParticipantSession | null>(null);
  const participantSession = joinSession ?? storedParticipant;
  // We can no longer SELECT quests.host_token, so host gating is optimistic:
  // any browser that holds a token for this slug sees host UI. The server
  // RPC rejects mismatched tokens at confirm time, so this is UX-only.
  const hostToken = useClientValue(() => readHostToken(quest.slug), null as string | null);
  const isHost = Boolean(hostToken);

  const viewerParticipant = React.useMemo(
    () =>
      participantSession
        ? snapshot.participants.find((p) => p.id === participantSession.id) ?? null
        : null,
    [snapshot.participants, participantSession],
  );

  const [highlightedSlotIso, setHighlightedSlotIso] = React.useState<string | null>(null);

  const serverMine = React.useMemo(() => {
    if (!viewerParticipant) return new Set<string>();
    return new Set(snapshot.availability.get(viewerParticipant.id) ?? []);
  }, [snapshot.availability, viewerParticipant?.id]);

  const [draftMine, setDraftMine] = React.useState<Set<string> | null>(null);
  const [availabilitySaving, setAvailabilitySaving] = React.useState(false);

  const viewerMine = React.useMemo(() => {
    if (!viewerParticipant) return new Set<string>();
    return draftMine ?? serverMine;
  }, [viewerParticipant, serverMine, draftMine]);

  const availabilityDirty = React.useMemo(() => {
    if (!viewerParticipant || draftMine === null) return false;
    if (draftMine.size !== serverMine.size) return true;
    for (const iso of draftMine) {
      if (!serverMine.has(iso)) return true;
    }
    for (const iso of serverMine) {
      if (!draftMine.has(iso)) return true;
    }
    return false;
  }, [viewerParticipant, draftMine, serverMine]);

  function patchDraftMine(slotIso: string) {
    setDraftMine((prev) => {
      const base = new Set(prev ?? serverMine);
      if (base.has(slotIso)) base.delete(slotIso);
      else base.add(slotIso);
      return base;
    });
  }

  async function submitAvailability() {
    if (!viewerParticipant || !participantSession || availabilitySaving) return;
    const target = draftMine ?? serverMine;
    setAvailabilitySaving(true);
    try {
      await store.commitParticipantAvailability(
        viewerParticipant.id,
        participantSession.authToken,
        target,
      );
      setDraftMine(null);
    } catch (e) {
      console.error(e);
    } finally {
      setAvailabilitySaving(false);
    }
  }

  const synergy = React.useMemo(() => {
    const count = snapshot.participants.length;
    if (count === 0) return 0;
    const totals = new Map<string, number>();
    for (const [, set] of snapshot.availability) {
      for (const iso of set) {
        totals.set(iso, (totals.get(iso) ?? 0) + 1);
      }
    }
    let best = 0;
    for (const n of totals.values()) if (n > best) best = n;
    return best / count;
  }, [snapshot.availability, snapshot.participants.length]);

  async function handleJoin(callsign: string) {
    const participant = await store.joinAsParticipant(callsign, viewerTimezone);
    const session = { id: participant.id, authToken: participant.auth_token };
    rememberParticipant(quest.slug, session);
    setJoinSession(session);
  }

  function handleLeave() {
    forgetParticipant(quest.slug);
    window.location.reload();
  }

  const isConfirmed = snapshot.status === "confirmed" && !!snapshot.confirmedStartUtc;

  return (
    <div className="relative flex flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-raid-grid opacity-[0.12]"
      />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-6 py-4">
        <Link href="/">
          <SyncQuestLogo size={24} />
        </Link>
        <div className="flex items-center gap-2">
          {viewerParticipant && (
            <ViewerChip
              callsign={viewerParticipant.callsign}
              isHost={isHost}
              onLeave={handleLeave}
            />
          )}
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 pb-24">
        <div className="mb-6 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">
            {quest.slug}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {quest.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            Host <span className="text-foreground font-bold">{quest.host_callsign}</span>
            <span className="mx-1.5">·</span>
            {quest.host_timezone}
          </p>
        </div>

        {snapshot.error && snapshot.ready === 0 && (
          <Card className="mb-6 border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                Couldn&apos;t load
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {snapshot.error}
            </CardContent>
          </Card>
        )}

        {snapshot.ready === 0 ? (
          <LoadingCard />
        ) : isConfirmed ? (
          <div className="space-y-6">
            <VictoryState
              quest={quest}
              snapshot={snapshot}
              viewerTimezone={viewerTimezone}
            />
            <ShareRow slug={quest.slug} />
            <ReadOnlyGrid
              quest={quest}
              snapshot={snapshot}
              viewerTimezone={viewerTimezone}
            />
          </div>
        ) : !viewerParticipant ? (
          <CallsignGate
            quest={quest}
            defaultCallsign={isHost ? quest.host_callsign : ""}
            isHost={isHost}
            onJoin={handleJoin}
          />
        ) : (
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 pt-6">
                {isHost ? (
                  <div className="-mt-1 mb-1 space-y-0.5">
                    <h2 className="text-lg font-extrabold tracking-tight">Share link</h2>
                    <p className="text-xs text-muted-foreground">
                      Invite your squad. Use <span className="font-semibold text-foreground">Submit times</span> to save your grid.
                    </p>
                  </div>
                ) : (
                  <div className="-mt-1 mb-1 space-y-0.5">
                    <h2 className="text-lg font-extrabold tracking-tight">Your grid</h2>
                    <p className="text-xs text-muted-foreground">
                      Times in <span className="font-bold text-foreground">{viewerTimezone}</span>.{" "}
                      <span className="font-semibold text-foreground">Submit times</span> to save.
                    </p>
                  </div>
                )}
                <SynergyMeter
                  value={synergy}
                  participants={snapshot.participants.length}
                />
                <RaiderRail
                  participants={snapshot.participants}
                  viewerId={viewerParticipant.id}
                />
              </CardContent>
            </Card>

            <AvailabilityGrid
              quest={quest}
              snapshot={snapshot}
              viewerTimezone={viewerTimezone}
              viewerParticipantId={viewerParticipant.id}
              viewerMineSet={viewerMine}
              onToggleSlot={patchDraftMine}
              highlightedSlotIso={highlightedSlotIso}
            />

            <div className="flex justify-end">
              <Button
                type="button"
                variant="raid"
                size="lg"
                disabled={!availabilityDirty || availabilitySaving}
                onClick={() => void submitAvailability()}
              >
                {availabilitySaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Submit times
                  </>
                )}
              </Button>
            </div>

            {isHost && (
              <HostControls
                quest={quest}
                snapshot={snapshot}
                viewerTimezone={viewerTimezone}
                selectedSlotIso={highlightedSlotIso}
                onSelectSlot={setHighlightedSlotIso}
                onConfirm={(start, end) => store.confirmMeeting(start, end)}
              />
            )}

            <ShareRow slug={quest.slug} />
          </div>
        )}
      </main>
    </div>
  );
}

function ViewerChip({
  callsign,
  isHost,
  onLeave,
}: {
  callsign: string;
  isHost: boolean;
  onLeave: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border-2 px-3 py-1 text-xs font-bold",
        isHost
          ? "border-primary/50 bg-primary/15 text-foreground"
          : "border-border bg-card text-foreground/90",
      )}
    >
      {isHost && <Anchor className="h-3 w-3 text-secondary" />}
      <span>{callsign}</span>
      <button
        type="button"
        onClick={onLeave}
        className="text-muted-foreground/80 hover:text-foreground"
        aria-label="Leave the expedition"
        title="Leave the expedition"
      >
        <LogOut className="h-3 w-3" />
      </button>
    </div>
  );
}

function RaiderRail({
  participants,
  viewerId,
}: {
  participants: { id: string; callsign: string }[];
  viewerId: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="flex items-center gap-1 font-bold uppercase tracking-[0.12em] text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        Squad
      </span>
      {participants.length === 0 ? (
        <span className="text-muted-foreground/80">…</span>
      ) : (
        participants.map((p) => (
          <span
            key={p.id}
            className={cn(
              "rounded-full border-2 px-2.5 py-0.5 font-bold",
              p.id === viewerId
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-card text-foreground/90",
            )}
          >
            {p.callsign}
          </span>
        ))
      )}
    </div>
  );
}

function ShareRow({ slug }: { slug: string }) {
  const url = useClientValue(
    () => `${window.location.origin}/meetup/${slug}`,
    `/meetup/${slug}`,
  );
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl border-2 border-border bg-card/80 px-3 py-2 text-xs font-mono text-foreground/80">
      <span className="flex-1 truncate">{url}</span>
      <Button type="button" size="sm" variant="outline" onClick={copy}>
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" /> Copied!
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" /> Copy
          </>
        )}
      </Button>
    </div>
  );
}

function ReadOnlyGrid({
  quest,
  snapshot,
  viewerTimezone,
}: {
  quest: Quest;
  snapshot: import("@/lib/quest-store").QuestSnapshot;
  viewerTimezone: string;
}) {
  return (
    <AvailabilityGrid
      quest={quest}
      snapshot={snapshot}
      viewerTimezone={viewerTimezone}
      viewerParticipantId={null}
      viewerMineSet={new Set()}
      readOnly
      highlightedSlotIso={snapshot.confirmedStartUtc}
    />
  );
}

function LoadingCard() {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Loading…
      </CardContent>
    </Card>
  );
}
