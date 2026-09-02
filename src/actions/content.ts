import { api } from "../lib/api.js";
import { backendEnabled } from "../lib/supabase.js";
import { canPrivateLocally } from "../lib/policy.js";
import { isPro } from "../lib/entitlements.js";
import { FREE_LIMITS, PRO_LIMITS } from "../lib/plans.js";
import { store } from "../store/store";
import { getCurrentUser } from "../app/cloudSync";
import { scheduleSync } from "../app/cloudSync";
import type { Word, PracticeSection } from "../store/types";

type Visibility = "private" | "public";
type PracticeKind = "reading" | "listening" | "writing" | "mock";

export const deckWordLimit = () =>
  isPro(store.get()) ? PRO_LIMITS.wordsPerDeck : FREE_LIMITS.wordsPerDeck;

export function canAddPrivateDeck(editingId: string | null): boolean {
  const s = store.get();
  if (isPro(s)) return true;
  if (editingId) return true;
  const own = (s.decks || []).filter((d) => (d.sourceType || "own") === "own").length;
  return own < FREE_LIMITS.privateVocab;
}

export function needsPublicUpgrade(kind: string, editingId: string | null): boolean {
  return !canPrivateLocally(store.get(), kind, editingId);
}

interface DeckInput {
  id: string | null;
  name: string;
  visibility: Visibility;
  exam: string;
  skill: string;
  level: string;
  words: Word[];
}

function localSaveDeck(input: DeckInput, newId: string, visibility: Visibility) {
  const creator = store.get().profile?.username || "guest";
  const tags = { exam: input.exam, skill: input.skill, level: input.level };
  store.update((s) => ({
    ...s,
    decks: input.id
      ? s.decks.map((d) =>
          d.id === input.id
            ? { ...d, name: input.name, visibility, words: input.words, ...tags }
            : d,
        )
      : [
          ...s.decks,
          {
            id: newId,
            name: input.name,
            visibility,
            sourceType: "own",
            creator,
            words: input.words,
            ...tags,
          },
        ],
  }));
  scheduleSync();
}

/** Persist a vocab deck. `asPublic` forces the public path after the user
 *  confirmed the quota-upgrade dialog. */
export async function persistDeck(input: DeckInput, asPublic = false) {
  const newId = input.id || `deck-${crypto.randomUUID()}`;
  const visibility: Visibility = asPublic ? "public" : input.visibility;
  const user = getCurrentUser();

  if (asPublic) {
    if (user && backendEnabled) {
      await api("/api/content/publish-confirmed", {
        method: "POST",
        body: JSON.stringify({
          kind: "vocab",
          id: newId,
          title: input.name,
          confirm_public: true,
        }),
      });
    }
    localSaveDeck(input, newId, "public");
    return;
  }

  if (user && backendEnabled) {
    await api("/api/content/save", {
      method: "POST",
      body: JSON.stringify({
        kind: "vocab",
        id: newId,
        title: input.name,
        visibility,
        exam: input.exam || null,
        skill: input.skill || null,
        level: input.level || null,
        payload: { words: input.words },
      }),
    });
  }
  localSaveDeck(input, newId, visibility);
}

interface PracticeInput {
  id: string | null;
  kind: PracticeKind;
  title: string;
  visibility: Visibility;
  minutes: number;
  exam: string;
  skill: string;
  level: string;
  sections: PracticeSection[];
}

function localSavePractice(input: PracticeInput, newId: string, visibility: Visibility) {
  const key = input.kind === "mock" ? "mocks" : input.kind;
  const creator = store.get().profile?.username || "guest";
  const itemCount = input.sections.reduce((n, s) => n + (s.questions?.length ?? 0), 0);
  const payload: Record<string, unknown> = {
    minutes: input.minutes,
    sections: input.sections,
    itemCount,
    questions: input.kind === "mock" ? itemCount : input.sections.flatMap((s) => s.questions ?? []),
  };
  if (input.kind === "reading") payload.text = input.sections[0]?.text || "";
  if (input.kind === "listening") payload.script = input.sections[0]?.script || "";
  if (input.kind === "writing") payload.passage = input.sections[0]?.passage || "";

  const tags = { exam: input.exam, skill: input.skill, level: input.level };
  store.update((s) => ({
    ...s,
    [key]: input.id
      ? s[key].map((x) =>
          x.id === input.id ? { ...x, title: input.title, visibility, ...payload, ...tags } : x,
        )
      : [...s[key], { id: newId, title: input.title, visibility, creator, ...payload, ...tags }],
  }));
  scheduleSync();
}

export async function persistPractice(input: PracticeInput, asPublic = false) {
  const newId = input.id || `${input.kind}-${crypto.randomUUID()}`;
  const visibility: Visibility = asPublic ? "public" : input.visibility;
  const user = getCurrentUser();
  const payload = {
    minutes: input.minutes,
    sections: input.sections,
    itemCount: input.sections.reduce((n, s) => n + (s.questions?.length ?? 0), 0),
  };

  if (asPublic) {
    if (user && backendEnabled) {
      await api("/api/content/publish-confirmed", {
        method: "POST",
        body: JSON.stringify({
          kind: input.kind,
          id: newId,
          title: input.title,
          payload,
          confirm_public: true,
        }),
      });
    }
    localSavePractice(input, newId, "public");
    return;
  }

  if (user && backendEnabled) {
    await api("/api/content/save", {
      method: "POST",
      body: JSON.stringify({
        kind: input.kind,
        id: newId,
        title: input.title,
        visibility,
        exam: input.exam || null,
        skill: input.skill || null,
        level: input.level || null,
        payload,
      }),
    });
  }
  localSavePractice(input, newId, visibility);
}

export function deleteContent(type: "deck" | PracticeKind, id: string) {
  const key = type === "deck" ? "decks" : type === "mock" ? "mocks" : type;
  store.update((s) => ({ ...s, [key]: s[key].filter((x: { id: string }) => x.id !== id) }));
  scheduleSync();
}
