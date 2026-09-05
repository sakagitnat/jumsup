-- Marketing wants signups to land on the real Free tier instead of an
-- automatic 7-day Pro trial; Pro trials will be handed out later via
-- promo/gift codes instead. Referral bonuses (claim_referral) and gift
-- code redemption are untouched -- only the automatic grant on signup
-- from 030_free_tier_and_trial.sql is removed.
-- Apply after 032_purge_pre_launch_test_data.sql.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base_name text;
begin
  base_name := regexp_replace(
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'user'),
    '[^a-zA-Z0-9_]+', '_', 'g');
  insert into public.profiles(user_id, username, avatar_url, referral_code)
  values(
    new.id,
    lower(base_name) || '_' || substr(new.id::text, 1, 5),
    new.raw_user_meta_data->>'avatar_url',
    public.make_referral_code()
  )
  on conflict(user_id) do nothing;
  return new;
end $$;
