-- Prepare Jumsup billing records for multiple checkout currencies and a future
-- move to another Stripe account without changing existing subscriptions.
alter table public.subscriptions add column if not exists payment_provider text not null default 'stripe';
alter table public.subscriptions add column if not exists payment_account text not null default 'stripe_th';
alter table public.subscriptions add column if not exists billing_currency text;

alter table public.payment_events add column if not exists payment_provider text not null default 'stripe';
alter table public.payment_events add column if not exists payment_account text not null default 'stripe_th';
alter table public.payment_events add column if not exists settlement_amount integer;
alter table public.payment_events add column if not exists settlement_currency text;
alter table public.payment_events add column if not exists exchange_rate numeric;

update public.subscriptions
set billing_currency=lower(billing_currency)
where billing_currency is not null;

create index if not exists subscriptions_payment_account_idx
on public.subscriptions(payment_provider,payment_account);

create index if not exists payment_events_currency_idx
on public.payment_events(currency,created_at desc);

comment on column public.subscriptions.billing_currency is
'Customer-facing checkout currency. Settlement currency can differ and is recorded on payment_events.';
