-- Usernames become unique, user-editable handles again (007 had made them a
-- free-form display name). Case-insensitive via the citext column type.
-- Apply after 007_flexible_display_names.sql.

-- 1. Break existing case-insensitive collisions: keep the oldest row's name,
--    suffix the rest with part of their id.
with dupes as (
  select user_id,
         row_number() over (partition by lower(btrim(username::text))
                            order by created_at, user_id) as rn
  from public.profiles
  where username is not null
)
update public.profiles p
set username = btrim(p.username::text) || '_' || substr(p.user_id::text, 1, 4)
from dupes d
where p.user_id = d.user_id and d.rn > 1;

-- 2. Normalise stray whitespace, then enforce uniqueness.
update public.profiles set username = btrim(username::text) where username <> btrim(username::text);
create unique index if not exists profiles_username_ci_key
  on public.profiles (username);

-- 3. Availability check + guarded rename for the app.
create or replace function public.username_available(p_name text)
returns boolean language sql security definer set search_path = public stable as $$
  select btrim(p_name) ~ '^[A-Za-z0-9_.]{3,20}$'
     and not exists (
       select 1 from public.profiles where username = btrim(p_name)::citext
     );
$$;
grant execute on function public.username_available(text) to authenticated;

create or replace function public.set_username(p_name text)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); clean text;
begin
  if uid is null then raise exception 'UNAUTHORIZED'; end if;
  clean := btrim(p_name);
  if clean !~ '^[A-Za-z0-9_.]{3,20}$' then raise exception 'USERNAME_INVALID'; end if;
  if exists (select 1 from public.profiles where username = clean::citext and user_id <> uid) then
    raise exception 'USERNAME_TAKEN';
  end if;
  update public.profiles set username = clean, updated_at = now() where user_id = uid;
  return clean;
exception when unique_violation then
  raise exception 'USERNAME_TAKEN';
end $$;
grant execute on function public.set_username(text) to authenticated;

-- 4. Signup trigger: fall back to a longer id suffix if the generated handle
--    ever collides, so a rare clash can't fail account creation.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_name text := regexp_replace(
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'user'),
    '[^a-zA-Z0-9_]+', '_', 'g');
  cand text := lower(base_name) || '_' || substr(new.id::text, 1, 5);
begin
  begin
    insert into public.profiles(user_id, username, avatar_url, referral_code)
    values (new.id, cand, new.raw_user_meta_data->>'avatar_url', public.make_referral_code())
    on conflict (user_id) do nothing;
  exception when unique_violation then
    insert into public.profiles(user_id, username, avatar_url, referral_code)
    values (new.id, lower(base_name) || '_' || replace(new.id::text, '-', ''),
            new.raw_user_meta_data->>'avatar_url', public.make_referral_code())
    on conflict (user_id) do nothing;
  end;
  return new;
end $$;
