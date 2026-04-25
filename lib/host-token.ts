/**
 * Host identity for participant-less auth.
 *
 * Each browser that creates a quest gets a random token stored in localStorage
 * and sent with the quest's `host_token`. Any later visit to that quest from
 * the same browser can unlock host-only UI by matching the stored token.
 */

const STORAGE_PREFIX = "syncquest:host-token:";

function randomToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tkn_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function mintHostToken(): string {
  return randomToken();
}

export function rememberHostToken(questId: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + questId, token);
  } catch {
    // Quota / privacy mode — silently degrade to guest view.
  }
}

export function readHostToken(questId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + questId);
  } catch {
    return null;
  }
}

export function forgetHostToken(questId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + questId);
  } catch {
    // no-op
  }
}
