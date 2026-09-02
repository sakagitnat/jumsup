import { useSyncExternalStore } from "react";
import type { PracticeSet, Question } from "../../store/types";

export type PracticeKind = "reading" | "listening" | "writing" | "mock";

export interface AttemptQuestion extends Question {
  _attemptKey: string;
}

export interface Attempt {
  kind: PracticeKind;
  set: PracticeSet;
  questions: AttemptQuestion[];
  answers: Record<string, number>;
  startedAt: number;
  endsAt: number;
}

let attempt: Attempt | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export const attemptStore = {
  get: () => attempt,
  start(next: Attempt) {
    attempt = next;
    emit();
  },
  answer(key: string, choice: number) {
    if (!attempt) return;
    attempt = { ...attempt, answers: { ...attempt.answers, [key]: choice } };
    emit();
  },
  clear() {
    attempt = null;
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

export function useAttempt(): Attempt | null {
  return useSyncExternalStore(attemptStore.subscribe, attemptStore.get, attemptStore.get);
}

/** Flatten a practice set into attempt questions with stable answer keys. */
export function buildAttemptQuestions(set: PracticeSet, kind: PracticeKind): AttemptQuestion[] {
  const raw: Question[] = set.sections?.length
    ? set.sections.flatMap((s) => s.questions ?? [])
    : Array.isArray(set.questions)
      ? set.questions
      : [];
  return raw.map((q, i) => ({
    ...q,
    _attemptKey: q.id || (kind === "mock" ? `mock-${q.number ?? i + 1}` : `${kind}-${i + 1}`),
  }));
}
