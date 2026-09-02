-- Multiple exam targets per user, each with its own optional date. Replaces the
-- single profiles.exam_goal / profiles.exam_date pair for the Home countdown.
-- Apply after 010_learning_onboarding.sql.

create table if not exists public.exam_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  name text not null,
  exam_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists exam_targets_user_idx
  on public.exam_targets(user_id, sort_order);

alter table public.exam_targets enable row level security;

create policy exam_targets_self on public.exam_targets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Carry each existing user's single goal/date into one target row.
insert into public.exam_targets (user_id, name, exam_date)
select p.user_id,
       case p.exam_goal
         when 'alevel' then 'A-Level (TCAS)'
         when 'tgat' then 'TGAT1'
         when 'general' then 'ทั่วไป / CEFR'
         else coalesce(nullif(p.exam_goal, ''), 'การสอบของฉัน')
       end,
       p.exam_date
from public.profiles p
where p.onboarding_completed_at is not null
  and (nullif(p.exam_goal, '') is not null or p.exam_date is not null)
  and not exists (select 1 from public.exam_targets t where t.user_id = p.user_id);
