import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
 * This module is intentionally *not* marked "use client": it's safe to import
 * from both server and client code.
 *   - `isSupabaseConfigured()` is a pure read of NEXT_PUBLIC_* env vars and
 *     needs to be callable from server components (e.g. the not-found page).
 *   - `getSupabaseClient()` self-guards on `typeof window === "undefined"`,
 *     so on the server it just returns null and never instantiates a client.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

/**
 * Lazy browser Supabase client. Returns `null` when env vars are missing so
 * the UI can still render during local dev before secrets are wired up, and
 * also returns `null` on the server. Realtime subscriptions (heatmap + Squad
 * Formation Meter) are opened from components that call this getter and
 * guard on `null`.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!url || !anonKey) return null;
  if (cached) return cached;
  cached = createClient(url, anonKey, {
    realtime: { params: { eventsPerSecond: 20 } },
    auth: { persistSession: false },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}
