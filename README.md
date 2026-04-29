# SyncQuest

> Round up the squad for the next great expedition.

A whimsical, no-sign-up group scheduler with a "baby ducks on an expedition"
aesthetic. Hosts paint a date range, share a pond link, and watch the
**Squad Formation Meter** fill up in realtime as squadmates drop their waddle
windows. When the sun-yellow glow blooms across the heatmap, the host locks in
the time and everyone gets a one-click calendar invite.

- **Stack** — Next.js 16 (App Router, Turbopack), React 19, Tailwind v4,
  Shadcn-style UI primitives, Framer Motion, Supabase Realtime.
- **Timezones** — UTC in the database, zoned on the client via `date-fns-tz`.
  Every viewer sees their own local clock, with a soft orange *Midnight Line*
  whenever their day rolls into the next.
- **Auth** — none, intentionally. Hosts get a localStorage host token; each
  squadmate gets a per-quest auth token returned by an RPC. Both are checked
  server-side on every mutation.

## Status

This repo is feature-complete for an internal alpha. Before sharing publicly
you still need to ship Sprint 1 (Vercel deploy + domain) and ideally Sprint 2
(rate limiting + content moderation) — see [Roadmap](#roadmap) below.

## Getting started

```bash
npm install
cp .env.example .env.local
# fill in the Supabase URL + anon key, then:
npm run dev
```

Open http://localhost:3000. The landing page renders without Supabase
configured (helpful for previewing the UI), but creating or joining a quest
needs a real Supabase project with `supabase/schema.sql` applied.

### Environment variables

| Variable                          | Required | Purpose                                             |
| --------------------------------- | -------- | --------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | yes      | Supabase project URL.                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | yes      | Supabase anon key (RPC + realtime gateway).         |
| `NEXT_PUBLIC_SITE_URL`            | prod     | Absolute origin used to build OG / Twitter previews (e.g. `https://syncquest.app`). Falls back to `http://localhost:3000` in dev. |

### Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run [`supabase/schema.sql`](./supabase/schema.sql).
   The file is idempotent — safe to re-run to upgrade an existing project.
   It provisions:
   - tables `quests`, `participants`, `availability`,
   - column-level grants that hide `host_token` and `auth_token` from clients,
   - four `SECURITY DEFINER` RPCs — `fn_create_quest`, `fn_join_quest`,
     `fn_toggle_availability`, `fn_confirm_meeting` — that gate every write on
     a server-checked token,
   - a `supabase_realtime` publication with explicit column lists so secret
     tokens are never broadcast over websocket.
3. Copy the project URL and anon key into `.env.local`.

## Project shape

```
app/
  layout.tsx                Root shell, Nunito font, OG / Twitter metadata.
  page.tsx                  Marketing landing page (hero duck, live meter preview).
  new/page.tsx              Quest creation form (host fills date range + active hours).
  meetup/[id]/page.tsx      Server-rendered quest room (loads quest by slug).
  not-found.tsx             Themed 404.
  error.tsx                 Themed segment-level error boundary.
  global-error.tsx          Themed root-level error boundary (covers layout crashes).
  opengraph-image.png       1200x630 OG card (auto-wired by Next file conventions).
  twitter-image.png         1200x630 Twitter card.
  icon.png · apple-icon.png · favicon.ico   Duck favicon set.

components/
  brand/logo.tsx            DuckMark + SyncQuest wordmark.
  quest/
    quest-creation-form.tsx Host: name, date range, active hours, slot size.
    quest-room.tsx          Top-level meetup room (orchestrates the rest).
    callsign-gate.tsx       Squadmate name entry (no auth).
    availability-grid.tsx   Paintable heatmap with Midnight Line.
    synergy-meter.tsx       Squad Formation Meter (lining-up ducks visual).
    host-controls.tsx       Host-only "set sail" bar with top candidate slots.
    victory-state.tsx       Locked-in celebration with daisy-petal confetti.
    calendar-loot.tsx       Google / Outlook / Apple .ics export buttons.
  ui/                       Shadcn-style primitives, theme-tuned for ducks.

lib/
  timezone.ts               UTC ↔ zoned conversions, slot grid, Midnight Line.
  quest-api.ts              Client-side RPC wrappers (create / join / toggle / confirm).
  quest-fetch.ts            Server-safe quest loader (REST, no SDK init).
  quest-store.ts            Realtime store driving the client room.
  quest-slug.ts             Shareable, no-lookalike URL codes.
  calendar-export.ts        Google / Outlook / Apple .ics export builders.
  host-token.ts             localStorage-backed host identity.
  participant-token.ts      localStorage-backed squadmate identity + auth_token.
  supabase.ts               Lazy, env-guarded Supabase client (server-safe import).
  use-client-value.ts       useSyncExternalStore helper for client-only values.
  types.ts                  Domain types.

supabase/
  schema.sql                One-shot schema + grants + RPCs + realtime publication.

public/
  duck-icon.png             512x512 rubber duck (used for the in-app brand mark).
  hero-duck.png             983x1002 chibi baby duck (used for the hero illustration).
```

> Internal naming still uses `quest` / `callsign` for table and column names.
> Only user-facing copy adopts the plainer "expedition / squad / name" vocabulary.

## Architecture notes

### Time
The app **never** stores local-time strings. Everything round-trips through
`zonedDayMinuteToUtc` and `formatZoned` in `lib/timezone.ts`. The grid
quantises to a fixed slot size (15 / 30 / 60 minutes) and renders one
column per local day for the viewer.

### Identity & write authority
There are no user accounts. Mutations are gated by **server-checked tokens**,
not by who you say you are:

- **Host token** — minted client-side at quest creation and stored in
  `localStorage`. It's stamped onto the quest row by `fn_create_quest`. Only
  `fn_confirm_meeting` consumes it, and rejects any call whose token doesn't
  match the row.
- **Participant auth token** — returned by `fn_join_quest` exactly once and
  stashed in `localStorage`. Replayed on every `fn_toggle_availability` call.
  Never readable via `SELECT` (column-level grant revoke + excluded from the
  realtime publication).

Hiding the host UI behind `isHost` is purely a UX choice — the security
boundary is the database. Anyone can read the public columns; nobody can
mutate without a token they shouldn't have.

### Realtime
The Supabase Realtime publication enumerates columns explicitly so secret
tokens are never shipped to the wire. The client store
(`lib/quest-store.ts`) is a vanilla external store wrapped with
`useSyncExternalStore`, with optimistic updates for paint actions.

## Theme

Tokens live in `app/globals.css` as HSL custom properties:

| Token            | Use                                       |
| ---------------- | ----------------------------------------- |
| `--background`   | Warm cream surface (`#FFFBEB`-ish).       |
| `--foreground`   | Deep pond ink for body text.              |
| `--primary`      | Sunny duck-yellow (CTAs, highlights).     |
| `--secondary`    | Soft orange beak / accent.                |
| `--accent`       | Grass-green (available / locked-in).      |
| `--heat-0`       | Light pond blue (empty heatmap cell).     |
| `--heat-max`     | Sunshine gold (full-availability glow).   |

If you need a darker pass for accessibility tweaks, change these tokens —
component code reads them via Tailwind utility classes (`bg-primary`,
`text-secondary`, etc.) and never hardcodes hex values.

## Roadmap

Most internal sprints are done — what's left is the long tail of "make this
shareable on the open internet". See
`.cursor/projects/.../canvases/public-sharing-readiness.canvas.tsx` for the
full audit.

| Sprint | Theme                                | Status        |
| ------ | ------------------------------------ | ------------- |
| 1      | Ship it — deploy, favicons, OG, 404  | in progress   |
| 2      | Don't get abused — rate limit + mod  | not started   |
| 3      | Host care — recovery + cancel + nudge| not started   |
| 4      | Polish — analytics, security headers | not started   |
| 5      | Stretch — presence, expiry, monthly  | not started   |

### Already shipped
- Duck-themed UI overhaul (Nunito, rounded surfaces, sunny / orange / green palette).
- Timezone-aware availability grid with the Midnight Line.
- Realtime Squad Formation Meter with sunny gold lock-in glow.
- Host-only confirm bar that ranks top candidate slots.
- Calendar export for Google, Outlook, and Apple (`.ics`).
- Hardened Supabase model (`SECURITY DEFINER` RPCs + column-level grants +
  realtime publication that excludes secret tokens).
- Themed `not-found`, `error`, and `global-error` boundaries.
- Duck favicon set + 1200×630 OG / Twitter preview cards.

Smoke test: Vercel deploy hook 2026-04-29T23:31:30Z
