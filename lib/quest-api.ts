"use client";

import { addMinutes } from "date-fns";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { zonedDayMinuteToUtc } from "@/lib/timezone";
import { generateQuestSlug } from "@/lib/quest-slug";
import { mintHostToken, rememberHostToken } from "@/lib/host-token";
import type { CreateQuestInput, HostQuest, Quest } from "@/lib/types";

export type CreateQuestResult = {
  quest: Quest;
  shareUrl: string;
  /** True when the row was actually persisted to Supabase. */
  persisted: boolean;
  /** Set when the RPC call failed; never persisted. */
  error: PostgrestError | null;
};

/**
 * Create a quest.
 *
 * Persists to Supabase via the `fn_create_quest` RPC if the client is
 * configured; otherwise returns a "ghost" quest (not saved) so the host can
 * still preview the app locally. Both paths mint a host token and stash it
 * in localStorage.
 *
 * The RPC is the only write path the anon key can use against the quests
 * table — direct INSERT is blocked at the grant level.
 */
export async function createQuest(input: CreateQuestInput): Promise<CreateQuestResult> {
  const slug = generateQuestSlug();
  const hostToken = mintHostToken();

  const startIso = zonedDayMinuteToUtc(
    input.startDate,
    input.dayStartMinutes,
    input.hostTimezone,
  ).toISOString();
  const endAnchorUtc = zonedDayMinuteToUtc(
    input.endDate,
    input.dayEndMinutes,
    input.hostTimezone,
  );
  const endIso = addMinutes(endAnchorUtc, 0).toISOString();

  const title = input.title.trim() || "Untitled meetup";
  const hostCallsign = input.hostCallsign.trim() || "Host";

  const draft: Quest = {
    id: slug,
    slug,
    title,
    host_callsign: hostCallsign,
    host_timezone: input.hostTimezone,
    start_date: startIso,
    end_date: endIso,
    day_start_minutes: input.dayStartMinutes,
    day_end_minutes: input.dayEndMinutes,
    slot_minutes: input.slotMinutes,
    status: "open",
    confirmed_start_utc: null,
    confirmed_end_utc: null,
    created_at: new Date().toISOString(),
  };

  let persisted = false;
  let error: PostgrestError | null = null;

  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    if (client) {
      const { data, error: rpcError } = await client.rpc("fn_create_quest", {
        p_slug: slug,
        p_host_token: hostToken,
        p_title: title,
        p_host_callsign: hostCallsign,
        p_host_timezone: input.hostTimezone,
        p_start_date: startIso,
        p_end_date: endIso,
        p_day_start_minutes: input.dayStartMinutes,
        p_day_end_minutes: input.dayEndMinutes,
        p_slot_minutes: input.slotMinutes,
      });

      if (rpcError) {
        error = rpcError;
        console.warn(
          "[syncquest] failed to persist quest, using local draft",
          rpcError,
        );
      } else if (data) {
        const row = data as HostQuest;
        draft.id = row.id ?? slug;
        persisted = true;
      }
    }
  }

  rememberHostToken(draft.id, hostToken);
  rememberHostToken(slug, hostToken);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/meetup/${slug}`
      : `/meetup/${slug}`;

  return { quest: draft, shareUrl, persisted, error };
}
