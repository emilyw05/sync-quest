/**
 * Domain types for SyncQuest.
 *
 * Storage convention: every timestamp in the database is UTC ISO-8601.
 * Display conversion happens on the client using `lib/timezone`.
 *
 * Security convention: secret columns (`quests.host_token`,
 * `participants.auth_token`) are NOT exposed via SELECT. They are only
 * returned from the server-authenticated RPC functions to the caller that
 * created the row. Client-visible types therefore omit them.
 */

export type Quest = {
  id: string;
  slug: string;
  title: string;
  host_callsign: string;
  host_timezone: string;
  start_date: string;
  end_date: string;
  day_start_minutes: number;
  day_end_minutes: number;
  slot_minutes: number;
  status: "open" | "confirmed" | "cancelled";
  confirmed_start_utc: string | null;
  confirmed_end_utc: string | null;
  created_at: string;
};

/**
 * Quest shape returned from `fn_create_quest` to the creator. Includes the
 * host_token that the creator stashes in localStorage and later replays to
 * `fn_confirm_meeting`. Never fetched via SELECT.
 */
export type HostQuest = Quest & {
  host_token: string;
};

export type Participant = {
  id: string;
  quest_id: string;
  callsign: string;
  timezone: string;
  joined_at: string;
};

/**
 * Participant row returned from `fn_join_quest` to the joiner. Includes the
 * auth_token that proves ownership of the participant row on subsequent
 * availability toggles. Never fetched via SELECT.
 */
export type ParticipantWithAuth = Participant & {
  auth_token: string;
};

export type AvailabilitySlot = {
  id: string;
  quest_id: string;
  participant_id: string;
  slot_utc: string;
};

export type CreateQuestInput = {
  title: string;
  hostCallsign: string;
  hostTimezone: string;
  startDate: Date;
  endDate: Date;
  dayStartMinutes: number;
  dayEndMinutes: number;
  slotMinutes: number;
};
