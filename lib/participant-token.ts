/**
 * Participant identity for a given meetup.
 *
 * Stored in localStorage so a teammate who refreshes keeps their painted
 * availability instead of having to rejoin as a fresh participant.
 *
 * The session bundles the participant's uuid (public, used as a display key)
 * with their `auth_token` (secret, proves ownership of the row). The token
 * is returned exactly once from `fn_join_quest` and replayed on every
 * `fn_toggle_availability` call to prove the caller is really this
 * participant.
 */

export type ParticipantSession = {
  id: string;
  authToken: string;
};

const STORAGE_PREFIX = "syncquest:participant:";

export function rememberParticipant(
  questKey: string,
  session: ParticipantSession,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + questKey,
      JSON.stringify(session),
    );
  } catch {
    // Quota / privacy mode — silently degrade.
  }
}

export function readParticipant(questKey: string): ParticipantSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + questKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as ParticipantSession).id === "string" &&
      typeof (parsed as ParticipantSession).authToken === "string"
    ) {
      return parsed as ParticipantSession;
    }
    return null;
  } catch {
    // Legacy plain-string entries from before the hardening migration will
    // fail JSON.parse — treat them as invalid and make the user rejoin.
    return null;
  }
}

export function forgetParticipant(questKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + questKey);
  } catch {
    // no-op
  }
}
