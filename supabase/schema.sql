-- SyncQuest schema (hardened).
-- Idempotent: safe to re-run on an existing project to upgrade in place.
--
-- Security model:
--   * Anon/authenticated clients can SELECT public columns from all three
--     tables (needed for realtime subscriptions + initial fetch).
--   * They CANNOT read the secret columns: quests.host_token and
--     participants.auth_token (revoked at column-grant level + excluded from
--     the realtime publication column lists).
--   * All writes are blocked at the table level. Clients must call the
--     SECURITY DEFINER RPC functions below, which validate tokens server-side
--     before mutating data. These functions bypass RLS, so no INSERT/UPDATE
--     /DELETE policies are needed.
--
-- Ownership note: the RPC functions run as the role that creates them
-- (typically `postgres` in Supabase). Don't rewrite ownership without
-- re-granting EXECUTE to anon/authenticated.

create extension if not exists "pgcrypto";

-- =========================
-- Tables
-- =========================
create table if not exists public.quests (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  title                text not null,
  host_callsign        text not null,
  host_token           text not null,
  host_timezone        text not null,
  start_date           timestamptz not null,
  end_date             timestamptz not null,
  day_start_minutes    int  not null check (day_start_minutes between 0 and 1440),
  day_end_minutes      int  not null check (day_end_minutes between 0 and 1440),
  slot_minutes         int  not null check (slot_minutes in (15, 30, 60)),
  status               text not null default 'open' check (status in ('open','confirmed','cancelled')),
  confirmed_start_utc  timestamptz,
  confirmed_end_utc    timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists quests_slug_idx on public.quests (slug);

create table if not exists public.participants (
  id          uuid primary key default gen_random_uuid(),
  quest_id    uuid not null references public.quests(id) on delete cascade,
  callsign    text not null,
  timezone    text not null,
  auth_token  text not null default encode(gen_random_bytes(24), 'hex'),
  joined_at   timestamptz not null default now(),
  unique (quest_id, callsign)
);

-- Backfill for pre-hardening rows that might not have auth_token yet.
alter table public.participants
  add column if not exists auth_token text not null
  default encode(gen_random_bytes(24), 'hex');

create index if not exists participants_quest_idx on public.participants (quest_id);

create table if not exists public.availability (
  id               uuid primary key default gen_random_uuid(),
  quest_id        uuid not null references public.quests(id) on delete cascade,
  participant_id   uuid not null references public.participants(id) on delete cascade,
  slot_utc         timestamptz not null,
  unique (participant_id, slot_utc)
);

create index if not exists availability_quest_slot_idx
  on public.availability (quest_id, slot_utc);

-- =========================
-- Column-level privileges
-- Revoke everything, then grant SELECT only on non-secret columns.
-- Writes are handled exclusively by SECURITY DEFINER functions below.
-- =========================
revoke all on public.quests       from anon, authenticated;
revoke all on public.participants from anon, authenticated;
revoke all on public.availability from anon, authenticated;

grant select (
  id, slug, title, host_callsign, host_timezone,
  start_date, end_date,
  day_start_minutes, day_end_minutes, slot_minutes,
  status, confirmed_start_utc, confirmed_end_utc,
  created_at
) on public.quests to anon, authenticated;

grant select (
  id, quest_id, callsign, timezone, joined_at
) on public.participants to anon, authenticated;

grant select on public.availability to anon, authenticated;

-- =========================
-- Row-level security
-- Read-only policies. Writes must go through RPC functions below.
-- =========================
alter table public.quests        enable row level security;
alter table public.participants  enable row level security;
alter table public.availability  enable row level security;

-- Blow away legacy wide-open policies from the old schema.
drop policy if exists "quests read"        on public.quests;
drop policy if exists "quests insert"      on public.quests;
drop policy if exists "quests update host" on public.quests;
drop policy if exists "participants rw"    on public.participants;
drop policy if exists "participants read"  on public.participants;
drop policy if exists "availability rw"    on public.availability;
drop policy if exists "availability read"  on public.availability;

create policy "quests read"        on public.quests       for select using (true);
create policy "participants read"  on public.participants for select using (true);
create policy "availability read"  on public.availability for select using (true);

-- =========================
-- RPC: create quest
-- Only RPC that doesn't require an existing token — a fresh host mints one
-- here and stashes it in localStorage. Returns the full row including
-- host_token so the creator can authenticate subsequent actions.
-- =========================
create or replace function public.fn_create_quest(
  p_slug              text,
  p_host_token        text,
  p_title             text,
  p_host_callsign     text,
  p_host_timezone     text,
  p_start_date        timestamptz,
  p_end_date          timestamptz,
  p_day_start_minutes int,
  p_day_end_minutes   int,
  p_slot_minutes      int
)
returns public.quests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.quests;
begin
  if length(coalesce(btrim(p_title), '')) = 0 then
    raise exception 'Title is required.';
  end if;
  if char_length(p_title) > 200 then
    raise exception 'Title too long (max 200 characters).';
  end if;
  if length(coalesce(btrim(p_host_callsign), '')) < 2 then
    raise exception 'Name must be at least 2 characters.';
  end if;
  if char_length(p_host_callsign) > 40 then
    raise exception 'Name too long (max 40 characters).';
  end if;
  if p_slug !~ '^[A-HJ-NP-Z2-9]{6,16}$' then
    raise exception 'Invalid slug format.';
  end if;
  if char_length(p_host_token) < 16 then
    raise exception 'Host token too short.';
  end if;
  if p_day_end_minutes <= p_day_start_minutes then
    raise exception 'Day end must be after day start.';
  end if;
  if p_end_date < p_start_date then
    raise exception 'End date must be on or after start date.';
  end if;

  -- IANA timezone sanity check. Throws if unknown.
  perform now() at time zone p_host_timezone;

  insert into public.quests (
    slug, title, host_callsign, host_token, host_timezone,
    start_date, end_date,
    day_start_minutes, day_end_minutes, slot_minutes
  )
  values (
    p_slug,
    btrim(p_title),
    btrim(p_host_callsign),
    p_host_token,
    p_host_timezone,
    p_start_date,
    p_end_date,
    p_day_start_minutes,
    p_day_end_minutes,
    p_slot_minutes
  )
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'Slug collision — try again.';
end;
$$;

grant execute on function public.fn_create_quest(
  text, text, text, text, text, timestamptz, timestamptz, int, int, int
) to anon, authenticated;

-- =========================
-- RPC: join a quest
-- Creates a participant row and returns the full row (including the freshly
-- minted auth_token). The caller stashes { id, auth_token } in localStorage
-- and sends them on every subsequent fn_toggle_availability call.
-- =========================
create or replace function public.fn_join_quest(
  p_quest_id  uuid,
  p_callsign  text,
  p_timezone  text
)
returns public.participants
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quest public.quests;
  v_row   public.participants;
begin
  if length(coalesce(btrim(p_callsign), '')) < 2 then
    raise exception 'Name must be at least 2 characters.';
  end if;
  if char_length(p_callsign) > 40 then
    raise exception 'Name too long (max 40 characters).';
  end if;

  select * into v_quest from public.quests where id = p_quest_id;
  if not found then
    raise exception 'Meetup not found.';
  end if;
  if v_quest.status <> 'open' then
    raise exception 'This meetup is closed.';
  end if;

  perform now() at time zone p_timezone;

  insert into public.participants (quest_id, callsign, timezone)
  values (p_quest_id, btrim(p_callsign), p_timezone)
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'That name is already taken for this meetup — pick another.';
end;
$$;

grant execute on function public.fn_join_quest(uuid, text, text)
  to anon, authenticated;

-- =========================
-- RPC: toggle one availability slot for a participant
-- Authorization: the caller must prove identity with the participant's
-- auth_token (returned only to them from fn_join_quest).
-- =========================
create or replace function public.fn_toggle_availability(
  p_participant_id   uuid,
  p_participant_auth text,
  p_slot_utc         timestamptz,
  p_add              boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_participant public.participants;
  v_quest       public.quests;
begin
  select * into v_participant
  from public.participants
  where id = p_participant_id and auth_token = p_participant_auth;

  if not found then
    raise exception 'Not authorized for this participant.';
  end if;

  select * into v_quest from public.quests where id = v_participant.quest_id;
  if v_quest.status <> 'open' then
    raise exception 'This meetup is closed.';
  end if;

  if p_add then
    insert into public.availability (quest_id, participant_id, slot_utc)
    values (v_participant.quest_id, p_participant_id, p_slot_utc)
    on conflict (participant_id, slot_utc) do nothing;
  else
    delete from public.availability
    where participant_id = p_participant_id and slot_utc = p_slot_utc;
  end if;
end;
$$;

grant execute on function public.fn_toggle_availability(uuid, text, timestamptz, boolean)
  to anon, authenticated;

-- =========================
-- RPC: host confirms the meeting time
-- Authorization: the caller must present the quest's host_token.
-- Idempotent for the same host_token + quest, refuses cancelled meetups.
-- =========================
create or replace function public.fn_confirm_meeting(
  p_quest_id   uuid,
  p_host_token text,
  p_start_utc  timestamptz,
  p_end_utc    timestamptz
)
returns public.quests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.quests;
begin
  if p_end_utc <= p_start_utc then
    raise exception 'End must be after start.';
  end if;

  update public.quests
  set status              = 'confirmed',
      confirmed_start_utc = p_start_utc,
      confirmed_end_utc   = p_end_utc
  where id = p_quest_id
    and host_token = p_host_token
    and status <> 'cancelled'
  returning * into v_row;

  if not found then
    raise exception 'Not authorized for this meetup, or meetup was cancelled.';
  end if;

  return v_row;
end;
$$;

grant execute on function public.fn_confirm_meeting(uuid, text, timestamptz, timestamptz)
  to anon, authenticated;

-- =========================
-- Realtime publication
-- Column lists keep host_token + auth_token out of WAL-derived change events
-- so they can never leak via realtime subscriptions. Requires Postgres 15+.
-- =========================
do $$ begin
  begin
    alter publication supabase_realtime drop table public.quests;
  exception when undefined_object then null; end;
  begin
    alter publication supabase_realtime drop table public.participants;
  exception when undefined_object then null; end;
  begin
    alter publication supabase_realtime drop table public.availability;
  exception when undefined_object then null; end;
end $$;

alter publication supabase_realtime add table public.quests
  (id, slug, title, host_callsign, host_timezone,
   start_date, end_date,
   day_start_minutes, day_end_minutes, slot_minutes,
   status, confirmed_start_utc, confirmed_end_utc, created_at);

alter publication supabase_realtime add table public.participants
  (id, quest_id, callsign, timezone, joined_at);

alter publication supabase_realtime add table public.availability;
