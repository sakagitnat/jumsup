# Jumsup Production Audit V6

## Fixed in this audit
- Profile column privileges: normal users can no longer update `role`, `xp`, `streak`, `pro_lifetime`, or `pro_bonus_until`.
- Pro daily-use bug: removed the database uniqueness rule that accidentally limited Pro to one Listening/Writing/Mock session per day.
- User timezone support for daily check-in, translation quota, and daily practice limits.
- Stripe webhook retry safety: events now have processing/completed/failed states and failed events can be retried.
- Cumulative full-refund handling through `charge.refunded` for referral reward revocation.
- Server-authoritative Flashcard mastery and XP; progress can no longer be reset directly to repeatedly farm XP.
- Stored-XSS hardening for user/community content rendered in Flashcards, Reading, Listening, Writing, Match, Crossword, Community and Profile.
- Frontend profile sync now updates only user-editable profile fields.

## Verified statically
- All JavaScript files under `src/` and `functions/` pass `node --check`.
- Required project/migration/security files pass `scripts/check.mjs`.

## Must still be tested with real external services before live launch
Static review cannot prove live integration behavior. Test these in staging/Test Mode:
- Supabase migrations against a real project and RLS with two users.
- Google OAuth redirect URLs.
- Stripe Test Mode Checkout, webhook retries, subscription lifecycle, refunds and disputes.
- Cloudflare Pages Functions and production CSP.
- Cloudflare WAF/rate-limit rules.
- Database backup and restore.

## Known product/configuration items
- Automatic execution of account deletion after the 7-day grace period still needs a scheduled server job once the retention policy is finalized.
- Non-Thai/English language choices currently fall back to English for many interface strings; full localization is a content task, not a security issue.
- One-time PromptPay Pro passes are not part of this audited source unless added as a separate payment product.
