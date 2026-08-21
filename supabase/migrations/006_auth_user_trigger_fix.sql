-- Fix Google OAuth signup failures caused by pgcrypto living in Supabase's
-- extensions schema while handle_new_user restricts its search path.
create or replace function public.make_referral_code()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 10))
$$;
