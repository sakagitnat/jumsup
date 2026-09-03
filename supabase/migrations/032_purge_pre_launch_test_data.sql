-- One-time pre-launch cleanup: wipe the flashcard / practice / review data that
-- only ever held the developer's own test rows (there are no real users yet).
--
-- Safe because:
--   * The "@Jumsup Official" starter decks are seeded client-side from
--     src/data/vocabulary/coreWords.js, NOT from these tables — wiping
--     vocab_sets does not touch them.
--   * vocab_words and learning_progress are removed automatically by their
--     ON DELETE CASCADE on vocab_sets.
--   * Stripe rows tagged `stripe_th` are from an old test Stripe account and
--     never granted Pro (entitlement checks for `stripe_live_th`). The real
--     LIVE event row (`stripe_live_th`) is left untouched.
--
-- Idempotent: re-running it simply deletes nothing.

begin;

delete from public.vocab_sets;
delete from public.practice_sets;
delete from public.content_reviews;

delete from public.payment_events where payment_account = 'stripe_th';
delete from public.subscriptions  where payment_account = 'stripe_th';

commit;
