-- Practice attempt history — append-only log of completed Reading / Listening /
-- Writing / Mock rounds. Powers the progress charts on the Stats page.
-- Apply after 001_full_production.sql. set_id is free text (official sets are not
-- rows in practice_sets), with a title snapshot so history survives set deletion.

create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  kind text not null,
  set_id text not null,
  set_title text not null default '',
  total integer not null default 0,
  correct integer not null default 0,
  percent integer not null default 0,
  seconds integer not null default 0,
  taken_at timestamptz not null default now()
);

create index if not exists practice_attempts_user_idx
  on public.practice_attempts(user_id, taken_at desc);

alter table public.practice_attempts enable row level security;

create policy practice_attempts_self_read on public.practice_attempts
  for select using (user_id = auth.uid());
create policy practice_attempts_self_insert on public.practice_attempts
  for insert with check (user_id = auth.uid());
create policy practice_attempts_self_delete on public.practice_attempts
  for delete using (user_id = auth.uid());
