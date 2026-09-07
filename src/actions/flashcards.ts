import { supabase, backendEnabled } from "../lib/supabase.js";
import { store } from "../store/store";
import { getCurrentUser } from "../app/cloudSync";
import { schedule, type Grade } from "../lib/srs";

/**
 * Mark word `index` of `deckId` as mastered and return the updated mastered
 * index list.
 *
 * Official / starter decks are client-only seed data with no row in the user's
 * `vocab_sets`, so the server RPC `mark_word_mastered` rejects them with
 * `FORBIDDEN`. For those decks we always track progress + XP locally (same as a
 * signed-out user). Only user-owned decks go through the server RPC, which is
 * authoritative for their mastered list and XP.
 */
export async function markWordMastered(deckId: string, index: number): Promise<number[]> {
  const state = store.get();
  const deck = state.decks.find((d) => d.id === deckId);
  const current = state.progress[deckId]?.mastered ?? [];
  const serverBacked =
    Boolean(getCurrentUser()) && backendEnabled && !deck?.official;

  if (serverBacked) {
    const { data, error } = await supabase.rpc("mark_word_mastered", {
      p_set_id: deckId,
      p_index: index,
    });
    if (error) throw error;
    const mastered: number[] = [...(data.mastered ?? [])];
    store.set({
      xp: data.xp,
      progress: { ...store.get().progress, [deckId]: { mastered } },
    });
    return mastered;
  }

  const fresh = !current.includes(index);
  const mastered = fresh ? [...current, index] : current;

  // Official/starter deck: the mastered list is device-local, but a logged-in
  // user should still earn (server-authoritative, leaderboard-counting) XP the
  // first time they master each word.
  if (fresh && getCurrentUser() && backendEnabled) {
    store.update((s) => ({
      ...s,
      progress: { ...s.progress, [deckId]: { mastered } },
    }));
    try {
      const { data } = await supabase.rpc("award_flashcard_xp", {
        p_deck_id: deckId,
        p_word_index: index,
      });
      if (data?.awarded) store.set({ xp: data.xp });
    } catch (e) {
      console.error(e);
    }
    return mastered;
  }

  store.update((s) => ({
    ...s,
    progress: { ...s.progress, [deckId]: { mastered } },
    xp: s.xp + (fresh ? 10 : 0),
  }));
  return mastered;
}

/** Reset all mastered-word progress (and the SRS review schedule) for one
 *  deck, so studying starts over from scratch. Only ever runs when the user
 *  explicitly asks for it in flashcard settings -- mastery otherwise only
 *  grows over time. Official/starter decks are local-only (see
 *  markWordMastered above); user-owned decks also need the server's copy
 *  cleared, or the next sign-in/reload would bring the old mastered list
 *  right back via hydrateFromCloud's sync. */
export async function resetDeckMastery(deckId: string): Promise<void> {
  const state = store.get();
  const deck = state.decks.find((d) => d.id === deckId);
  const serverBacked = Boolean(getCurrentUser()) && backendEnabled && !deck?.official;

  if (serverBacked) {
    const { error } = await supabase.rpc("reset_word_mastery", { p_set_id: deckId });
    if (error) throw error;
  }

  store.update((s) => ({
    ...s,
    progress: { ...s.progress, [deckId]: { mastered: [] } },
    srs: { ...s.srs, [deckId]: {} },
  }));
}

/** Record a spaced-repetition grade for word `index` of `deckId`.
 *  Stored device-locally under `srs[deckId][index]`; a "good" grade also runs
 *  the existing mastery/XP path so Stats and games are unaffected. */
export async function gradeWord(
  deckId: string,
  index: number,
  grade: Grade,
): Promise<number[]> {
  const prev = store.get().srs[deckId]?.[index];
  const nextCard = schedule(prev, grade);
  store.update((s) => ({
    ...s,
    srs: {
      ...s.srs,
      [deckId]: { ...(s.srs[deckId] ?? {}), [index]: nextCard },
    },
  }));

  if (grade === "good") return markWordMastered(deckId, index);
  return store.get().progress[deckId]?.mastered ?? [];
}
