import { supabase, backendEnabled } from "../lib/supabase.js";
import { store } from "../store/store";
import { getCurrentUser } from "../app/cloudSync";

/**
 * Mark word `index` of `deckId` as mastered. Server-authoritative when signed in
 * (RPC returns the canonical mastered list + xp); local XP bump otherwise.
 * Returns the updated mastered index list.
 */
export async function markWordMastered(deckId: string, index: number): Promise<number[]> {
  const current = store.get().progress[deckId]?.mastered ?? [];

  if (getCurrentUser() && backendEnabled) {
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
