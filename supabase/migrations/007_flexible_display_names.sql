-- Treat profiles.username as a flexible public display name.
-- Authentication continues to use auth.users.id/email; this field is presentation only.

alter table public.profiles
  drop constraint if exists profiles_username_key;

drop index if exists public.profiles_username_key;

create index if not exists profiles_username_search_idx
  on public.profiles (lower(username::text));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_display_name_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_display_name_length
      check (
        char_length(btrim(username::text)) between 1 and 40
        and username::text !~ '[[:cntrl:]]'
      ) not valid;
  end if;
end $$;

alter table public.profiles
  validate constraint profiles_display_name_length;

comment on column public.profiles.username is
  'Public display name. It may contain spaces, Unicode, emoji, and duplicates; it is not an authentication identifier.';
