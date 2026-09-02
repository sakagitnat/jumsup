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
  store.update((s) => ({
    ...s,
    progress: { ...s.progress, [deckId]: { mastered } },
    xp: s.xp + (fresh ? 10 : 0),
  }));
  return mastered;
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
