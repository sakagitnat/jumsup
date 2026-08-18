# Jumsup Production Full-stack V3

This project keeps the approved Jumsup UI and adds the production backend layer.

## Connected systems
- Supabase Google Auth (optional guest mode remains)
- Profile + avatar storage
- Cross-device cloud sync
- Public/private vocabulary and practice sets
- Community search with creator username
- Community import creates a new private copy
- XP / streak / server-side daily check-in
- Stripe Pro monthly/yearly Checkout
- Stripe Customer Portal
- Stripe webhook subscription sync
- Referral: inviter +14 days, invitee +7 days
- Gift Code Pro entitlement
- Admin gift-code creation
- Translation quota: 10/day for Free, unlimited for Pro
- Optional Google Translate provider
- Safe delete UI
- Light/Dark and multilingual settings

## Important
The app still works in Guest/local mode if Supabase is not configured.
When Supabase keys are configured and the user signs in, guest data is migrated to the account if the cloud account is empty.

Read `PRODUCTION_SETUP.md` before deployment.


## Production Hardening V4
- DB/server enforced Free private quotas
- Explicit confirmation before overflow content can become Public
- Server-side daily Listening/Writing/Mock sessions
- Stripe webhook signature + event deduplication
- One-time referral reward after first successful payment (+14/+7)
- Payment/refund/dispute audit trail
- Security headers/CSP
- Hardened API input validation
- Account export and deletion request
- Security checklist

## Refund Workflow V5
- Customer refund request UI
- Admin refund queue
- Admin approve/reject
- Stripe Refund API integration
- Full/partial refund support
- Optional immediate subscription cancellation on full refund
- Refund webhook lifecycle
- Referral bonus revocation when the first qualifying payment is fully refunded

## V6 Production Audit
See `AUDIT_REPORT.md`. V6 closes profile privilege escalation, Pro daily-session constraint, webhook retry/idempotency failure handling, XP/progress authority, timezone daily limits and stored-XSS hotspots.
