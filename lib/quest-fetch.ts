import type { Quest } from "@/lib/types";

/**
 * Server-safe quest fetcher. Uses the REST API directly so we don't pull the
 * full `@supabase/supabase-js` client into the server bundle.
 *
 * Anon key is allowed to SELECT only the non-secret columns on quests, so we
 * name them explicitly — `select=*` would fail the column-level grant check
 * because `host_token` is revoked.
 */
const QUEST_COLUMNS = [
  "id",
  "slug",
  "title",
  "host_callsign",
  "host_timezone",
  "start_date",
  "end_date",
  "meeting_day_keys",
  "day_start_minutes",
  "day_end_minutes",
  "slot_minutes",
  "status",
  "confirmed_start_utc",
  "confirmed_end_utc",
  "created_at",
].join(",");

export async function getQuestBySlug(slug: string): Promise<Quest | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const safeSlug = encodeURIComponent(slug);
  const endpoint =
    `${url}/rest/v1/quests` +
    `?slug=eq.${safeSlug}&select=${QUEST_COLUMNS}&limit=1`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Quest[];
    const row = rows[0];
    if (!row) return null;
    return {
      ...row,
      meeting_day_keys: row.meeting_day_keys ?? null,
    };
  } catch {
    return null;
  }
}
