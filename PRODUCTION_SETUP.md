# Jumsup Production Setup

## 1. Supabase
1. Create a Supabase project.
2. SQL Editor → run `supabase/migrations/001_full_production.sql`.
3. Authentication → Providers → Google → enable Google.
4. In Google Cloud OAuth, use the Supabase callback URL shown in the Google provider page.
5. Set your Site URL to the Cloudflare production URL and add localhost redirect URLs for development.
6. Copy Project URL and anon/publishable key into `.env`.

## 2. Stripe
1. Create a Product named Jumsup Pro.
2. Create monthly and yearly recurring Prices.
3. Enable Customer Portal in Stripe.
4. Create a webhook endpoint:
   `https://YOUR_DOMAIN/api/stripe/webhook`
5. Subscribe at minimum to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. Copy the webhook signing secret.

## 3. Cloudflare Pages
Connect the GitHub repository.

Build:
- Command: `npm run build`
- Output: `dist`

Pages Functions are in `/functions` and deploy automatically with the project.

Set browser build variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`

Set server environment variables/secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_YEARLY`
- `APP_URL`

Optional:
- `GOOGLE_TRANSLATE_API_KEY`

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` as `VITE_*`.

## 4. Admin
After the admin account logs in once, run in Supabase SQL Editor:

```sql
update public.profiles
set role='admin'
where user_id=(select id from auth.users where email='YOUR_ADMIN_EMAIL');
```

## 5. Test Stripe first
Use Stripe test mode before switching to live mode.
Test:
- checkout
- webhook
- portal
- cancel subscription
- subscription expiration
- gift code
- referral
- Google sign-in
- public/private community content
- sync across two browsers/devices


## Hardening V4
Run migrations in order:
1. `001_full_production.sql`
2. `002_production_hardening.sql`

Before live payments configure Cloudflare WAF/rate limits for `/api/*` and store all secret values as Cloudflare Secrets.

Refund/dispute events are logged. Automatic clawback of already granted referral bonus is intentionally not enabled until you define the refund policy.

The account-deletion API records a deletion request with a 7-day grace period. For fully automatic deletion, add a scheduled server job after you finalize your data-retention policy.


## Refund Workflow V5
Run `003_refund_workflow.sql` after migrations 001 and 002.

Add these Stripe webhook events:
- `refund.created`
- `refund.updated`
- `refund.failed`
- keep the existing subscription, invoice and dispute events

Customer flow:
Profile → Payments & Refunds → Request refund → Admin review.

Admin approval creates the Refund through Stripe. For full refunds, the system can also cancel the associated subscription immediately.

Test the complete flow in Stripe Test mode before enabling live payments.

## V6 migration
Run `004_audit_fixes.sql` after 001 → 002 → 003. Do not skip it; it fixes profile privileges, Pro daily sessions, webhook retry state, timezone handling, and server-authoritative Flashcard XP/progress.
