-- Display marker for a banned account. The hard block is a GoTrue ban applied
-- via the admin API; this column just lets the admin console show ban state.
-- Apply after 001_full_production.sql.

alter table public.profiles
  add column if not exists banned_at timestamptz;
