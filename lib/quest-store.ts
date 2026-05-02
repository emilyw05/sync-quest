"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import { readHostToken } from "@/lib/host-token";
import type {
  AvailabilitySlot,
  Participant,
  ParticipantWithAuth,
  Quest,
} from "@/lib/types";

/**
 * Client-side realtime store for a single quest.
 *
 * Design:
 *  - Lives outside React; components read it via `useSyncExternalStore`.
 *    That keeps us clear of `react-hooks/set-state-in-effect` and gives a
 *    consistent snapshot across concurrent renders.
 *  - The store opens a Supabase realtime channel on first subscribe and
 *    closes it on last unsubscribe (with a short grace period to survive
 *    StrictMode's double-invoke in dev).
 *  - Mutations go through SECURITY DEFINER RPC functions (fn_join_quest,
 *    fn_toggle_availability, fn_confirm_meeting). The anon key cannot
 *    INSERT/UPDATE these tables directly — the DB enforces it. Optimistic
 *    updates still apply on the client; realtime echoes reconcile.
 */

export type QuestSnapshot = {
  status: Quest["status"];
  confirmedStartUtc: string | null;
  confirmedEndUtc: string | null;
  participants: Participant[];
  /** Keyed by participant.id → Set of slot ISO strings (for O(1) checks). */
  availability: Map<string, Set<string>>;
  /** Number of successful initial fetches completed. 0 = still loading. */
  ready: number;
  error: string | null;
};

const emptySnapshot: QuestSnapshot = {
  status: "open",
  confirmedStartUtc: null,
  confirmedEndUtc: null,
  participants: [],
  availability: new Map(),
  ready: 0,
  error: null,
};

export type QuestStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => QuestSnapshot;
  getServerSnapshot: () => QuestSnapshot;
  /**
   * Create a new participant row via `fn_join_quest`. Returns the full row
   * including the auth_token the caller must stash to prove identity later.
   */
  joinAsParticipant: (
    callsign: string,
    timezone: string,
  ) => Promise<ParticipantWithAuth>;
  /**
   * Toggle a slot for the given participant. Requires the participant's
   * auth_token (from `joinAsParticipant`'s return value, persisted in
   * localStorage).
   */
  toggleSlot: (
    participantId: string,
    participantAuth: string,
    slotIso: string,
  ) => Promise<void>;
  /**
   * Replace this participant's availability with `desired` (batched toggles).
   */
  commitParticipantAvailability: (
    participantId: string,
    participantAuth: string,
    desired: ReadonlySet<string>,
  ) => Promise<void>;
  /**
   * Host action: lock in the meeting. Replays the host_token from
   * localStorage; the RPC rejects mismatches.
   */
  confirmMeeting: (startUtc: string, endUtc: string) => Promise<void>;
};

const PARTICIPANT_COLUMNS = "id, quest_id, callsign, timezone, joined_at";

/** Normalize RPC / PostgREST row shapes (snake_case vs camelCase). */
function coerceRpcParticipantWithAuth(raw: unknown): ParticipantWithAuth | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const str = (a: string, alt?: string): string | undefined => {
    const v = o[a] ?? (alt ? o[alt] : undefined);
    return typeof v === "string" ? v : undefined;
  };
  const id = str("id");
  const auth_token = str("auth_token", "authToken");
  const quest_id = str("quest_id", "questId");
  const callsign = str("callsign");
  const timezone = str("timezone");
  let joined_at = str("joined_at", "joinedAt");
  if (!id || !auth_token || !quest_id || !callsign || !timezone) return null;
  if (!joined_at) joined_at = new Date().toISOString();
  return {
    id,
    quest_id,
    callsign,
    timezone,
    joined_at,
    auth_token,
  };
}

export function createQuestStore(quest: Quest): QuestStore {
  let state: QuestSnapshot = {
    ...emptySnapshot,
    status: quest.status,
    confirmedStartUtc: quest.confirmed_start_utc,
    confirmedEndUtc: quest.confirmed_end_utc,
  };
  const listeners = new Set<() => void>();
  let channel: RealtimeChannel | null = null;
  let channelRef = 0;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  let initialized = false;

  function notify() {
    for (const l of listeners) l();
  }

  function setState(next: QuestSnapshot) {
    state = next;
    notify();
  }

  function withAvailability(
    updater: (next: Map<string, Set<string>>) => void,
  ) {
    const next = new Map<string, Set<string>>();
    for (const [k, v] of state.availability) next.set(k, new Set(v));
    updater(next);
    setState({ ...state, availability: next });
  }

  function withParticipants(
    updater: (next: Participant[]) => Participant[],
  ) {
    setState({ ...state, participants: updater(state.participants) });
  }

  async function fetchInitial() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setState({ ...state, ready: 1, error: "Supabase not configured" });
      return;
    }
    try {
      const [participantsRes, availabilityRes, questRes] = await Promise.all([
        supabase
          .from("participants")
          .select(PARTICIPANT_COLUMNS)
          .eq("quest_id", quest.id)
          .order("joined_at", { ascending: true }),
        supabase
          .from("availability")
          .select("*")
          .eq("quest_id", quest.id),
        supabase
          .from("quests")
          .select("status, confirmed_start_utc, confirmed_end_utc")
          .eq("id", quest.id)
          .single(),
      ]);
      if (participantsRes.error) throw participantsRes.error;
      if (availabilityRes.error) throw availabilityRes.error;
      if (questRes.error) throw questRes.error;

      const participants = (participantsRes.data ?? []) as Participant[];
      const fetchedIds = new Set(participants.map((p) => p.id));
      // Join can finish after this fetch was issued; merge optimistic rows so the
      // UI doesn't flash or lose the viewer before realtime/refresh catches up.
      const optimisticExtra = state.participants.filter(
        (p) => !fetchedIds.has(p.id),
      );
      const merged = [...participants, ...optimisticExtra].sort((a, b) => {
        const ta = Date.parse(a.joined_at);
        const tb = Date.parse(b.joined_at);
        return (
          (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0)
        );
      });
      const availability = new Map<string, Set<string>>();
      for (const row of (availabilityRes.data ?? []) as AvailabilitySlot[]) {
        let set = availability.get(row.participant_id);
        if (!set) {
          set = new Set();
          availability.set(row.participant_id, set);
        }
        set.add(row.slot_utc);
      }
      setState({
        ...state,
        participants: merged,
        availability,
        status: questRes.data?.status ?? state.status,
        confirmedStartUtc: questRes.data?.confirmed_start_utc ?? null,
        confirmedEndUtc: questRes.data?.confirmed_end_utc ?? null,
        ready: 1,
        error: null,
      });
    } catch (err) {
      console.warn("[syncquest] initial fetch failed", err);
      setState({
        ...state,
        ready: 1,
        error: err instanceof Error ? err.message : "Failed to load quest data",
      });
    }
  }

  function openChannel() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    channel = supabase
      .channel(`quest:${quest.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `quest_id=eq.${quest.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            // Realtime publication excludes auth_token, so the payload is
            // already safe to treat as a public Participant.
            const row = payload.new as Participant;
            if (state.participants.some((p) => p.id === row.id)) return;
            withParticipants((list) => [...list, row]);
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as Participant;
            withParticipants((list) => list.filter((p) => p.id !== row.id));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Participant;
            withParticipants((list) =>
              list.map((p) => (p.id === row.id ? { ...p, ...row } : p)),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "availability",
          filter: `quest_id=eq.${quest.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as AvailabilitySlot;
            withAvailability((next) => {
              let set = next.get(row.participant_id);
              if (!set) {
                set = new Set();
                next.set(row.participant_id, set);
              }
              set.add(row.slot_utc);
            });
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as AvailabilitySlot;
            withAvailability((next) => {
              const set = next.get(row.participant_id);
              if (!set) return;
              set.delete(row.slot_utc);
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quests",
          filter: `id=eq.${quest.id}`,
        },
        (payload) => {
          // Publication column list excludes host_token, so the payload is
          // the safe public Quest shape.
          const row = payload.new as Quest;
          setState({
            ...state,
            status: row.status,
            confirmedStartUtc: row.confirmed_start_utc,
            confirmedEndUtc: row.confirmed_end_utc,
          });
        },
      )
      .subscribe();
  }

  function closeChannel() {
    if (!channel) return;
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.removeChannel(channel);
    }
    channel = null;
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    channelRef += 1;
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    if (!initialized) {
      initialized = true;
      fetchInitial();
      openChannel();
    }
    return () => {
      listeners.delete(listener);
      channelRef -= 1;
      if (channelRef <= 0) {
        // Grace period so StrictMode remount doesn't thrash the realtime channel.
        closeTimer = setTimeout(() => {
          if (channelRef <= 0) {
            closeChannel();
            initialized = false;
          }
        }, 500);
      }
    };
  }

  async function joinAsParticipant(
    callsign: string,
    timezone: string,
  ): Promise<ParticipantWithAuth> {
    const trimmed = callsign.trim();
    if (!trimmed) throw new Error("Name required");

    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase not configured");

    const { data, error } = await supabase.rpc("fn_join_quest", {
      p_quest_id: quest.id,
      p_callsign: trimmed,
      p_timezone: timezone,
    });
    if (error) throw error;
    if (!data) throw new Error("No participant returned from fn_join_quest");

    // PostgREST / client versions occasionally return a one-row RPC as an array.
    let raw: unknown = data;
    if (Array.isArray(data)) {
      raw = data[0] ?? null;
    }
    if (!raw || typeof raw !== "object") {
      throw new Error("No participant returned from fn_join_quest");
    }
    const row = coerceRpcParticipantWithAuth(raw);
    if (!row) {
      throw new Error("Join response missing id or auth_token");
    }

    if (!state.participants.some((p) => p.id === row.id)) {
      // Strip auth_token before it enters client state / React tree.
      const publicRow: Participant = {
        id: row.id,
        quest_id: row.quest_id,
        callsign: row.callsign,
        timezone: row.timezone,
        joined_at: row.joined_at,
      };
      withParticipants((list) => [...list, publicRow]);
    }
    return row;
  }

  async function toggleSlot(
    participantId: string,
    participantAuth: string,
    slotIso: string,
  ): Promise<void> {
    const existingSet = state.availability.get(participantId);
    const currentlyOn = existingSet?.has(slotIso) ?? false;

    // Optimistic update
    withAvailability((next) => {
      let set = next.get(participantId);
      if (!set) {
        set = new Set();
        next.set(participantId, set);
      }
      if (currentlyOn) set.delete(slotIso);
      else set.add(slotIso);
    });

    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { error } = await supabase.rpc("fn_toggle_availability", {
        p_participant_id: participantId,
        p_participant_auth: participantAuth,
        p_slot_utc: slotIso,
        p_add: !currentlyOn,
      });
      if (error) throw error;
    } catch (err) {
      console.warn("[syncquest] toggleSlot failed; reverting", err);
      // Revert
      withAvailability((next) => {
        let set = next.get(participantId);
        if (!set) {
          set = new Set();
          next.set(participantId, set);
        }
        if (currentlyOn) set.add(slotIso);
        else set.delete(slotIso);
      });
    }
  }

  async function commitParticipantAvailability(
    participantId: string,
    participantAuth: string,
    desired: ReadonlySet<string>,
  ): Promise<void> {
    const current = new Set(state.availability.get(participantId) ?? []);
    const desiredSet = new Set(desired);
    const toAdd = [...desiredSet].filter((iso) => !current.has(iso));
    const toRemove = [...current].filter((iso) => !desiredSet.has(iso));
    if (toAdd.length === 0 && toRemove.length === 0) return;

    withAvailability((next) => {
      next.set(participantId, new Set(desiredSet));
    });

    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      for (const slotIso of toAdd) {
        const { error } = await supabase.rpc("fn_toggle_availability", {
          p_participant_id: participantId,
          p_participant_auth: participantAuth,
          p_slot_utc: slotIso,
          p_add: true,
        });
        if (error) throw error;
      }
      for (const slotIso of toRemove) {
        const { error } = await supabase.rpc("fn_toggle_availability", {
          p_participant_id: participantId,
          p_participant_auth: participantAuth,
          p_slot_utc: slotIso,
          p_add: false,
        });
        if (error) throw error;
      }
    } catch (err) {
      console.warn(
        "[syncquest] commitParticipantAvailability failed; reverting",
        err,
      );
      withAvailability((next) => {
        next.set(participantId, new Set(current));
      });
      throw err;
    }
  }

  async function confirmMeeting(
    startUtc: string,
    endUtc: string,
  ): Promise<void> {
    const hostToken = readHostToken(quest.slug) ?? readHostToken(quest.id);
    if (!hostToken) {
      throw new Error(
        "You're not signed in as the host for this meetup on this device.",
      );
    }

    const prev = {
      status: state.status,
      confirmedStartUtc: state.confirmedStartUtc,
      confirmedEndUtc: state.confirmedEndUtc,
    };
    setState({
      ...state,
      status: "confirmed",
      confirmedStartUtc: startUtc,
      confirmedEndUtc: endUtc,
    });

    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { error } = await supabase.rpc("fn_confirm_meeting", {
        p_quest_id: quest.id,
        p_host_token: hostToken,
        p_start_utc: startUtc,
        p_end_utc: endUtc,
      });
      if (error) throw error;
    } catch (err) {
      console.warn("[syncquest] confirmMeeting failed; reverting", err);
      setState({ ...state, ...prev });
      throw err;
    }
  }

  return {
    subscribe,
    getSnapshot: () => state,
    getServerSnapshot: () => emptySnapshot,
    joinAsParticipant,
    toggleSlot,
    commitParticipantAvailability,
    confirmMeeting,
  };
}
