
create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username citext unique not null,
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin')),
  xp integer not null default 0 check (xp >= 0),
  streak integer not null default 0 check (streak >= 0),
  last_checkin date,
  referral_code text unique not null,
  pro_bonus_until timestamptz,
  pro_lifetime boolean not null default false,
  ui_language text not null default 'th',
  ui_theme text not null default 'light',
  sound_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.make_referral_code()
returns text language sql volatile as $$
  select upper(substr(encode(gen_random_bytes(8),'hex'),1,10))
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare base_name text;
begin
  base_name := regexp_replace(coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1), 'user'), '[^a-zA-Z0-9_]+', '_', 'g');
  insert into public.profiles(user_id,username,avatar_url,referral_code)
  values(new.id, lower(base_name)||'_'||substr(new.id::text,1,5), new.raw_user_meta_data->>'avatar_url', public.make_referral_code())
  on conflict(user_id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table if not exists public.vocab_sets (
  id text primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  name text not null,
  visibility text not null default 'private' check (visibility in ('private','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.vocab_words (
  id uuid primary key default gen_random_uuid(),
  set_id text not null references public.vocab_sets(id) on delete cascade,
  word text not null,
  stress text,
  meaning text,
  example text,
  sort_order integer not null default 0
);
create index if not exists vocab_words_set_idx on public.vocab_words(set_id,sort_order);

create table if not exists public.practice_sets (
  id text primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  kind text not null check (kind in ('reading','listening','writing','mock')),
  title text not null,
  visibility text not null default 'private' check (visibility in ('private','public')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists practice_public_idx on public.practice_sets(kind,visibility);

create table if not exists public.learning_progress (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  set_id text not null references public.vocab_sets(id) on delete cascade,
  mastered_indices integer[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key(user_id,set_id)
);

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  plan text,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_checkins (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  checkin_date date not null default current_date,
  xp_awarded integer not null default 20,
  created_at timestamptz not null default now(),
  primary key(user_id,checkin_date)
);

create table if not exists public.gift_codes (
  id uuid primary key default gen_random_uuid(),
  code citext unique not null,
  pro_days integer not null check (pro_days > 0),
  max_uses integer not null default 1 check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.gift_redemptions (
  id uuid primary key default gen_random_uuid(),
  gift_code_id uuid not null references public.gift_codes(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique(gift_code_id,user_id)
);

create table if not exists public.referral_claims (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references public.profiles(user_id) on delete cascade,
  invitee_user_id uuid not null unique references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  check(inviter_user_id <> invitee_user_id)
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references public.profiles(user_id) on delete set null,
  content_type text not null,
  content_id text not null,
  reason text not null,
  status text not null default 'pending' check(status in ('pending','resolved','dismissed')),
  created_at timestamptz not null default now()
);
create table if not exists public.content_delete_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references public.profiles(user_id) on delete cascade,
  content_type text not null,
  content_id text not null,
  reason text,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.translation_usage (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  usage_date date not null default current_date,
  usage_count integer not null default 0,
  primary key(user_id,usage_date)
);

create or replace function public.user_is_pro(p_user uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select coalesce((select pro_lifetime or (pro_bonus_until is not null and pro_bonus_until > now()) from profiles where user_id=p_user),false)
 or exists(select 1 from subscriptions where user_id=p_user and status in ('active','trialing') and (current_period_end is null or current_period_end > now()))
$$;

create or replace function public.do_daily_checkin()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p profiles%rowtype; new_streak int;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 select * into p from profiles where user_id=uid for update;
 if p.last_checkin=current_date then
   return jsonb_build_object('checked',true,'streak',p.streak,'xp',p.xp);
 end if;
 new_streak := case when p.last_checkin=current_date-1 then p.streak+1 else 1 end;
 insert into daily_checkins(user_id,checkin_date,xp_awarded) values(uid,current_date,20) on conflict do nothing;
 update profiles set last_checkin=current_date,streak=new_streak,xp=xp+20,updated_at=now() where user_id=uid;
 return jsonb_build_object('checked',true,'streak',new_streak,'xp',p.xp+20);
end $$;

create or replace function public.redeem_gift_code(p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); g gift_codes%rowtype; until_at timestamptz;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 select * into g from gift_codes where upper(code::text)=upper(trim(p_code)) for update;
 if not found or not g.active then raise exception 'Invalid gift code'; end if;
 if g.expires_at is not null and g.expires_at<=now() then raise exception 'Gift code expired'; end if;
 if g.used_count>=g.max_uses then raise exception 'Gift code usage limit reached'; end if;
 if exists(select 1 from gift_redemptions where gift_code_id=g.id and user_id=uid) then raise exception 'Gift code already redeemed'; end if;
 select greatest(coalesce(pro_bonus_until,now()),now()) + make_interval(days=>g.pro_days) into until_at from profiles where user_id=uid;
 insert into gift_redemptions(gift_code_id,user_id) values(g.id,uid);
 update gift_codes set used_count=used_count+1 where id=g.id;
 update profiles set pro_bonus_until=until_at,updated_at=now() where user_id=uid;
 return jsonb_build_object('ok',true,'pro_until',until_at);
end $$;

create or replace function public.claim_referral(p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); inviter uuid; invitee_until timestamptz; inviter_until timestamptz;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 select user_id into inviter from profiles where upper(referral_code)=upper(trim(p_code));
 if inviter is null then raise exception 'Referral code not found'; end if;
 if inviter=uid then raise exception 'Cannot use your own referral code'; end if;
 if exists(select 1 from referral_claims where invitee_user_id=uid) then raise exception 'Referral already claimed'; end if;
 insert into referral_claims(inviter_user_id,invitee_user_id) values(inviter,uid);
 update profiles set pro_bonus_until=greatest(coalesce(pro_bonus_until,now()),now())+interval '14 days',updated_at=now() where user_id=inviter returning pro_bonus_until into inviter_until;
 update profiles set pro_bonus_until=greatest(coalesce(pro_bonus_until,now()),now())+interval '7 days',updated_at=now() where user_id=uid returning pro_bonus_until into invitee_until;
 return jsonb_build_object('ok',true,'invitee_pro_until',invitee_until,'inviter_pro_until',inviter_until);
end $$;

create or replace function public.consume_translation_quota()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); c int;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if public.user_is_pro(uid) then return jsonb_build_object('allowed',true,'pro',true,'remaining',null); end if;
 insert into translation_usage(user_id,usage_date,usage_count) values(uid,current_date,0) on conflict do nothing;
 select usage_count into c from translation_usage where user_id=uid and usage_date=current_date for update;
 if c>=10 then return jsonb_build_object('allowed',false,'pro',false,'remaining',0); end if;
 update translation_usage set usage_count=usage_count+1 where user_id=uid and usage_date=current_date;
 return jsonb_build_object('allowed',true,'pro',false,'remaining',9-c);
end $$;

-- RLS
alter table public.profiles enable row level security;
alter table public.vocab_sets enable row level security;
alter table public.vocab_words enable row level security;
alter table public.practice_sets enable row level security;
alter table public.learning_progress enable row level security;
alter table public.subscriptions enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.gift_codes enable row level security;
alter table public.gift_redemptions enable row level security;
alter table public.referral_claims enable row level security;
alter table public.content_reports enable row level security;
alter table public.content_delete_requests enable row level security;
alter table public.translation_usage enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (auth.uid()=user_id or exists(select 1 from vocab_sets v where v.user_id=profiles.user_id and v.visibility='public') or exists(select 1 from practice_sets p where p.user_id=profiles.user_id and p.visibility='public'));
create policy profiles_self_update on public.profiles for update using (auth.uid()=user_id) with check (auth.uid()=user_id);

create policy vocab_read on public.vocab_sets for select using (user_id=auth.uid() or visibility='public');
create policy vocab_insert on public.vocab_sets for insert with check (user_id=auth.uid());
create policy vocab_update on public.vocab_sets for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy vocab_delete on public.vocab_sets for delete using (user_id=auth.uid());

create policy words_read on public.vocab_words for select using (exists(select 1 from vocab_sets s where s.id=set_id and (s.user_id=auth.uid() or s.visibility='public')));
create policy words_insert on public.vocab_words for insert with check (exists(select 1 from vocab_sets s where s.id=set_id and s.user_id=auth.uid()));
create policy words_update on public.vocab_words for update using (exists(select 1 from vocab_sets s where s.id=set_id and s.user_id=auth.uid()));
create policy words_delete on public.vocab_words for delete using (exists(select 1 from vocab_sets s where s.id=set_id and s.user_id=auth.uid()));

create policy practice_read on public.practice_sets for select using (user_id=auth.uid() or visibility='public');
create policy practice_insert on public.practice_sets for insert with check (user_id=auth.uid());
create policy practice_update on public.practice_sets for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy practice_delete on public.practice_sets for delete using (user_id=auth.uid());

create policy progress_self on public.learning_progress for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy subscription_self_read on public.subscriptions for select using(user_id=auth.uid());
create policy checkins_self_read on public.daily_checkins for select using(user_id=auth.uid());
create policy gift_redemptions_self_read on public.gift_redemptions for select using(user_id=auth.uid());
create policy referrals_related_read on public.referral_claims for select using(inviter_user_id=auth.uid() or invitee_user_id=auth.uid());
create policy reports_insert on public.content_reports for insert with check(reporter_user_id=auth.uid());
create policy reports_self_read on public.content_reports for select using(reporter_user_id=auth.uid());
create policy delete_requests_self on public.content_delete_requests for all using(requester_user_id=auth.uid()) with check(requester_user_id=auth.uid());
create policy translation_self_read on public.translation_usage for select using(user_id=auth.uid());

-- avatars
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=true;
drop policy if exists avatar_public_read on storage.objects;
create policy avatar_public_read on storage.objects for select using(bucket_id='avatars');
drop policy if exists avatar_self_insert on storage.objects;
create policy avatar_self_insert on storage.objects for insert with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists avatar_self_update on storage.objects;
create policy avatar_self_update on storage.objects for update using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists avatar_self_delete on storage.objects;
create policy avatar_self_delete on storage.objects for delete using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

grant execute on function public.do_daily_checkin() to authenticated;
grant execute on function public.redeem_gift_code(text) to authenticated;
grant execute on function public.claim_referral(text) to authenticated;
grant execute on function public.consume_translation_quota() to authenticated;
