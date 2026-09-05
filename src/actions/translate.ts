import { api } from "../lib/api.js";
import { backendEnabled } from "../lib/supabase.js";
import { isPro } from "../lib/entitlements.js";
import { FREE_LIMITS, PRO_LIMITS } from "../lib/plans.js";
import { store } from "../store/store";
import { getCurrentUser, scheduleSync } from "../app/cloudSync";
import { openUpgradeModal } from "../ui/upgradeModal";

export function localMeaning(word: string): string | undefined {
  return store
    .get()
    .decks.flatMap((d) => d.words)
    .find((w) => w.w?.toLowerCase() === word.toLowerCase())?.m;
}

export async function translateWord(word: string): Promise<string> {
  const local = localMeaning(word);
  if (!getCurrentUser() || !backendEnabled) {
    return local || "";
  }
  const target = store.get().lang === "en" ? "th" : store.get().lang || "th";
  if (local) {
    api("/api/dictionary/suggest", {
      method: "POST",
      body: JSON.stringify({ word, meaning: local, target: "th" }),
    }).catch(() => {});
  }
  const d = await api<{ translation?: string }>("/api/translate", {
    method: "POST",
    body: JSON.stringify({ text: word, target, local_translation: local || undefined }),
  });
  return d.translation || "";
}

/** Add a word to a deck. Returns false if the deck is full. */
export function addWordToDeck(deckId: string, word: string, meaning: string): boolean {
  const s = store.get();
  const deck = s.decks.find((d) => d.id === deckId) || s.decks[0];
  if (!deck) return false;
  const limit = isPro(s) ? PRO_LIMITS.wordsPerDeck : FREE_LIMITS.wordsPerDeck;
  if ((deck.words?.length || 0) >= limit) {
    openUpgradeModal(
      "คำศัพท์ในชุดเต็มแล้ว",
      `แพ็กเกจปัจจุบันเก็บได้สูงสุด ${limit.toLocaleString()} คำต่อชุด`,
    );
    return false;
  }
  if (deck.words.some((x) => x.w.toLowerCase() === word.toLowerCase())) return true;
  store.update((st) => ({
    ...st,
    decks: st.decks.map((d) =>
      d.id === deck.id ? { ...d, words: [...d.words, { w: word, m: meaning || "", p: "", e: "" }] } : d,
    ),
  }));
  scheduleSync();
  return true;
}
