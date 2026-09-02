-- Exam type / skill / level tags for discovery and filtering.
-- Apply after 001_full_production.sql. All nullable, free text (validated by the app).

alter table public.vocab_sets
  add column if not exists exam text,
  add column if not exists skill text,
  add column if not exists level text;

alter table public.practice_sets
  add column if not exists exam text,
  add column if not exists skill text,
  add column if not exists level text;

create index if not exists vocab_sets_exam_idx on public.vocab_sets(exam) where exam is not null;
create index if not exists practice_sets_exam_idx on public.practice_sets(exam) where exam is not null;
