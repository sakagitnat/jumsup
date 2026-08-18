# Jumsup Security Policy

- RLS remains enabled for user data.
- Browser never receives Supabase service-role, Stripe secret, or webhook secret.
- Stripe webhook signature is verified before processing.
- Stripe event IDs are deduplicated before business logic.
- Referral reward is granted once, only after a successful paid event.
- Free private quotas are enforced in Postgres and server APIs.
- Private content is never auto-published. Overflow requires explicit Public confirmation.
- Free Listening/Writing/Mock limits use server-side daily sessions; reconnect resumes the same session.
- Security-sensitive API input is validated.
- Users can export data and request deletion.
- Refund/dispute events are recorded in audit/payment logs.
- Cloudflare WAF/rate limits must be configured for public launch.
