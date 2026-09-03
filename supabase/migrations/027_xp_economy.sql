-- Broaden how XP is earned so effort ranks higher than just checking in:
-- practice attempts (scaled by correct answers), flashcard mastery on ANY deck
-- (official decks now count), game completions, and a streak bonus on check-in.
-- Every grant is logged to xp_events. The existing profiles.xp trigger feeds
-- weekly_xp, so the leaderboard picks all of this up automatically.
-- Apply after 018_weekly_leaderboard.sql.

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  source text not null,
  amount integer not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists xp_events_user_day_idx on public.xp_events(user_id, created_at);
create index if not exists xp_events_source_idx on public.xp_events(source, created_at);
alter table public.xp_events enable row level security;
create policy xp_events_self on public.xp_events for select using (user_id = auth.uid());

create table if not exists public.flashcard_xp (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  deck_id text not null,
  word_index integer not null,
  awarded_at timestamptz not null default now(),
  primary key (user_id, deck_id, word_index)
);
alter table public.flashcard_xp enable row level security;
create policy flashcard_xp_self on public.flashcard_xp for select using (user_id = auth.uid());

create or replace function public._grant_xp(p_uid uuid, p_source text, p_amount integer, p_meta jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_amount, 0) <= 0 then return; end if;
  update public.profiles set xp = xp + p_amount, updated_at = now() where user_id = p_uid;
  insert into public.xp_events(user_id, source, amount, meta) values (p_uid, p_source, p_amount, p_meta);
end $$;

-- Practice: 5 + 2·correct, capped 150. Repeating the same set the same day
-- pays 50% (2nd) then 25% (3rd+), so it can't be farmed.
create or replace function public.award_practice_xp(p_kind text, p_set_id text, p_total integer, p_correct integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  d date;
  attempts_today integer;
  factor numeric;
  amount integer;
begin
  if uid is null then raise exception 'UNAUTHORIZED'; end if;
  if p_kind not in ('reading','listening','writing','mock') then raise exception 'INVALID_KIND'; end if;
  p_total := greatest(0, least(coalesce(p_total, 0), 200));
  p_correct := greatest(0, least(coalesce(p_correct, 0), p_total));
  d := public.user_local_date(uid);

  select count(*) into attempts_today
  from public.xp_events
  where user_id = uid and source = 'practice' and meta->>'set_id' = p_set_id
    and (created_at at time zone 'Asia/Bangkok')::date = d;

  factor := case when attempts_today = 0 then 1.0 when attempts_today = 1 then 0.5 else 0.25 end;
  amount := floor(least(150, 5 + p_correct * 2) * factor)::int;

  perform public._grant_xp(uid, 'practice', amount, jsonb_build_object(
    'kind', p_kind, 'set_id', p_set_id, 'total', p_total, 'correct', p_correct,
    'attempt', attempts_today + 1));
  return jsonb_build_object('awarded', amount, 'xp', (select xp from public.profiles where user_id = uid));
end $$;
grant execute on function public.award_practice_xp(text, text, integer, integer) to authenticated;

-- Flashcard mastery: +10 once per (user, deck, word) — works for official decks
-- that have no vocab_sets row.
create or replace function public.award_flashcard_xp(p_deck_id text, p_word_index integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inserted integer;
begin
  if uid is null then raise exception 'UNAUTHORIZED'; end if;
  if p_word_index < 0 or p_word_index > 100000 then raise exception 'INVALID_WORD_INDEX'; end if;
  insert into public.flashcard_xp(user_id, deck_id, word_index)
  values (uid, left(coalesce(p_deck_id, ''), 120), p_word_index)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted > 0 then
    perform public._grant_xp(uid, 'flashcard', 10,
      jsonb_build_object('deck_id', p_deck_id, 'word_index', p_word_index));
  end if;
  return jsonb_build_object('awarded', case when inserted > 0 then 10 else 0 end,
    'xp', (select xp from public.profiles where user_id = uid));
end $$;
grant execute on function public.award_flashcard_xp(text, integer) to authenticated;

-- Game completion: +12, once per game per local day.
create or replace function public.award_game_xp(p_game text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date; n integer;
begin
  if uid is null then raise exception 'UNAUTHORIZED'; end if;
  if p_game not in ('match','crossword') then raise exception 'INVALID_GAME'; end if;
  d := public.user_local_date(uid);
  select count(*) into n from public.xp_events
  where user_id = uid and source = 'game' and meta->>'game' = p_game
    and (created_at at time zone 'Asia/Bangkok')::date = d;
  if n > 0 then
    return jsonb_build_object('awarded', 0, 'xp', (select xp from public.profiles where user_id = uid));
  end if;
  perform public._grant_xp(uid, 'game', 12, jsonb_build_object('game', p_game));
  return jsonb_build_object('awarded', 12, 'xp', (select xp from public.profiles where user_id = uid));
end $$;
grant execute on function public.award_game_xp(text) to authenticated;

-- Check-in now also pays a streak bonus (2·min(streak,30)) and logs to xp_events.
create or replace function public.do_daily_checkin()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p profiles%rowtype; d date; new_streak int; bonus int; total int;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 d:=public.user_local_date(uid);
 select * into p from profiles where user_id=uid for update;
 if p.last_checkin=d then return jsonb_build_object('checked',true,'streak',p.streak,'xp',p.xp); end if;
 new_streak:=case when p.last_checkin=d-1 then p.streak+1 else 1 end;
 bonus:=least(new_streak,30)*2;
 total:=20+bonus;
 insert into daily_checkins(user_id,checkin_date,xp_awarded) values(uid,d,total) on conflict do nothing;
 update profiles set last_checkin=d,streak=new_streak,xp=xp+total,updated_at=now() where user_id=uid;
 insert into xp_events(user_id,source,amount,meta)
   values(uid,'checkin',total,jsonb_build_object('streak',new_streak,'bonus',bonus));
 return jsonb_build_object('checked',true,'streak',new_streak,'xp',p.xp+total,'local_date',d,'bonus',bonus);
end $$;
