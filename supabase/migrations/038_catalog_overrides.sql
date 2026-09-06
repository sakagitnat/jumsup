-- Lets an admin hide or rename any Community listing -- including the
-- bundled official catalog (vocab decks / practice sets shipped in the JS
-- bundle, e.g. "แกนหลักต้องจำ 1"), which has no row in vocab_sets/practice_sets
-- for the existing functions/api/admin/content.js moderation endpoint to act
-- on. The client applies these overrides when building the Community list
-- (src/actions/community.ts), so a hide/rename takes effect immediately for
-- every viewer without a redeploy.

create table if not exists public.catalog_overrides (
  content_id text primary key,
  kind text not null check (kind in ('vocab','skill')),
  hidden boolean not null default false,
  title_override text,
  updated_by uuid references public.profiles(user_id),
  updated_at timestamptz not null default now()
);

alter table public.catalog_overrides enable row level security;

-- Every signed-in viewer needs to read this to render Community correctly;
-- writes only ever happen through functions/api/admin/catalog-overrides.js
-- using the service-role key (which bypasses RLS), so there's no
-- insert/update/delete policy for anon/authenticated.
drop policy if exists catalog_overrides_read on public.catalog_overrides;
create policy catalog_overrides_read on public.catalog_overrides
  for select using (true);
