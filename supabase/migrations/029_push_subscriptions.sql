-- Web Push subscriptions for re-engagement (streak reminders, weekly recap,
-- exam countdown). One row per browser endpoint. The worker's scheduled()
-- handler reads these with the service role and pushes via VAPID.
-- Apply after 028_seasons_integrity_deletions.sql.

create table if not exists public.push_subscriptions (
  endpoint      text primary key,
  user_id       uuid not null references public.profiles(user_id) on delete cascade,
  p256dh        text not null,
  auth          text not null,
  ua            text,
  failure_count integer not null default 0,
  last_sent_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists push_sub_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- A user manages only their own device rows. Inserts/updates come through the
-- /api/push/subscribe endpoint (service role), but self-policies let the client
-- read/delete its own if ever needed.
drop policy if exists push_sub_self on public.push_subscriptions;
create policy push_sub_self on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
drop policy if exists push_sub_self_del on public.push_subscriptions;
create policy push_sub_self_del on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

revoke insert, update on public.push_subscriptions from authenticated, anon;
