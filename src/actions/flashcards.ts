import { supabase, backendEnabled } from "../lib/supabase.js";
import { store } from "../store/store";
import { getCurrentUser } from "../app/cloudSync";

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
