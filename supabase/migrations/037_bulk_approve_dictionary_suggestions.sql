-- The user-facing "add this word's meaning" flow (functions/api/translate.js)
-- silently submits a dictionary_suggestions row every time a word's local
-- flashcard translation gets used, so this table had built up 4,584 pending
-- rows waiting on the one-by-one admin review UI (functions/api/admin/dictionary.js)
-- while dictionary_entries -- the table translate.js actually reads from --
-- only had 6 approved rows before migration 036. The user asked to bulk
-- approve the backlog instead of reviewing it by hand.
--
-- Before writing this, the data was inspected directly (see the db-status.yml
-- workflow): 987 distinct (word, meaning) pairs across 844 words, most
-- corroborated by up to 5 independent submissions with matching Thai
-- meanings (suggesting they trace back to the app's own vetted vocabulary
-- content, not ad hoc typing), and a manual sample of 60 rows across the
-- consensus leaders and both chronological ends of the queue turned up
-- ordinary, accurate vocabulary translations -- no garbage, no
-- wrong-language entries, nothing inappropriate.
--
-- This approves every distinct pending (word, meaning) pair into
-- dictionary_entries (deduping the ~4.6k rows down to ~987 by exact match;
-- rows that duplicate an already-approved entry are silently skipped by the
-- existing unique constraint) and marks the source suggestions reviewed, the
-- same way functions/api/admin/dictionary.js's one-by-one approve does.

insert into public.dictionary_entries
  (source_word, normalized_word, target_language, meaning, source, status)
select distinct on (normalized_word, target_language, suggested_meaning)
  source_word, normalized_word, target_language, suggested_meaning,
  'approved-suggestions-bulk', 'approved'
from public.dictionary_suggestions
where status = 'pending'
order by normalized_word, target_language, suggested_meaning, created_at
on conflict (normalized_word, target_language, meaning) do nothing;

update public.dictionary_suggestions
set status = 'approved', reviewed_at = now()
where status = 'pending';
