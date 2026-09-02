/* Lightweight spaced-repetition scheduler (SM-2 family, two-button grading).
   State lives per word in the store under `srs[deckId][wordIndex]`. Kept small
   and framework-free so it can be unit-reasoned about in isolation. */

export interface SrsCard {
  ease: number; // easiness factor, 1.3 – 2.7
  interval: number; // days until next review
  reps: number; // consecutive successful reviews
  lapses: number; // times forgotten
  due: number; // epoch ms when the card is next due
}

export type Grade = "again" | "good";

const DAY = 86_400_000;
const AGAIN_DELAY = 10 * 60_000; // resurface within the same session

export function freshCard(now: number = Date.now()): SrsCard {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now };
}

export function schedule(
  card: SrsCard | undefined,
  grade: Grade,
  now: number = Date.now(),
): SrsCard {
  const c = card ?? freshCard(now);

  if (grade === "again") {
    return {
      ease: Math.max(1.3, c.ease - 0.2),
      interval: 0,
      reps: 0,
      lapses: c.lapses + 1,
      due: now + AGAIN_DELAY,
    };
  }

  let interval: number;
  if (c.reps === 0) interval = 1;
  else if (c.reps === 1) interval = 3;
  else interval = Math.round(c.interval * c.ease);
  interval = Math.min(Math.max(interval, 1), 365);

  return {
    ease: Math.min(2.7, c.ease + 0.05),
    interval,
    reps: c.reps + 1,
    lapses: c.lapses,
    due: now + interval * DAY,
  };
}

export function isDue(card: SrsCard | undefined, now: number = Date.now()): boolean {
  return !card || card.due <= now;
}

/** A card the learner has answered "good" at least twice with a real interval. */
export function isLearned(card: SrsCard | undefined): boolean {
  return !!card && card.reps >= 2 && card.interval >= 3;
}

/** Count of cards in `deckSrs` that are due now, out of `total` words.
   Words with no card yet are NOT counted as due here — they are "new", not
   "review". */
export function dueCount(
  deckSrs: Record<number, SrsCard> | undefined,
  now: number = Date.now(),
): number {
  if (!deckSrs) return 0;
  let n = 0;
  for (const key of Object.keys(deckSrs)) {
    if (deckSrs[Number(key)].due <= now) n++;
  }
  return n;
}

/** Human "next review" hint in Thai, e.g. "พรุ่งนี้", "ใน 4 วัน". */
export function nextReviewHint(cards: SrsCard[], now: number = Date.now()): string {
  if (!cards.length) return "";
  const soonest = Math.min(...cards.map((c) => c.due));
  const ms = soonest - now;
  if (ms <= 0) return "พร้อมทบทวนแล้ว";
  const days = Math.round(ms / DAY);
  if (days <= 0) return "ในไม่กี่นาที";
  if (days === 1) return "พรุ่งนี้";
  return `ใน ${days} วัน`;
}
