import { supabase, backendEnabled } from "../lib/supabase.js";
import { startDailyFeature } from "../lib/policy.js";
import { store } from "../store/store";
import { getCurrentUser } from "../app/cloudSync";
import { toast } from "../ui/toast";
import { openUpgradeModal } from "../ui/upgradeModal";
import { FREE_LIMITS } from "../lib/plans.js";
import type { Word } from "../store/types";

export type Game = "match" | "crossword" | "wordle";

const GAME_LABEL: Record<Game, string> = { match: "Match", crossword: "Crossword", wordle: "Wordle" };

/** +12 XP for finishing a game, once per game per day (server-enforced). */
export async function awardGameXp(game: Game) {
  if (!getCurrentUser() || !backendEnabled) return;
  try {
    const { data } = await supabase.rpc("award_game_xp", { p_game: game });
    if (data?.awarded) {
      store.set({ xp: data.xp });
      toast(`+${data.awarded} XP`);
    }
  } catch (e) {
    console.error(e);
  }
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** All words mastered in this deck so far (every word the user has ever
 *  marked "จำแล้ว", not just the current Loop-size selection -- that list
 *  only resets via the "รีเซ็ตความจำ" button in flashcard settings). Shuffled
 *  so a replay of Match/Crossword (which only use the first few) draws a
 *  different sample each time instead of freezing on the first words ever
 *  mastered. */
export function masteredWords(deckId: string): Word[] {
  const s = store.get();
  const deck = s.decks.find((d) => d.id === deckId);
  if (!deck) return [];
  const mastered = s.progress[deckId]?.mastered ?? [];
  return shuffled(mastered.map((i) => deck.words[i]).filter(Boolean));
}

const minWords: Record<Game, number> = { match: 4, crossword: 3, wordle: 1 };
const perDayLimit: Record<Game, number> = {
  match: FREE_LIMITS.matchPerDay,
  crossword: FREE_LIMITS.crosswordPerDay,
  wordle: FREE_LIMITS.wordlePerDay,
};

/** Returns true if the game may start. Shows a popup/toast otherwise. */
export async function startGameSession(game: Game, deckId: string): Promise<boolean> {
  const words = masteredWords(deckId);
  if (words.length < minWords[game]) {
    toast(`ต้องจำศัพท์อย่างน้อย ${minWords[game]} คำก่อนเล่น ${GAME_LABEL[game]}`);
    return false;
  }
  if (getCurrentUser() && backendEnabled) {
    try {
      await startDailyFeature(game, `${game}:${crypto.randomUUID()}`, { content_id: deckId });
    } catch (err) {
      if (String((err as Error).message).includes("DAILY_LIMIT_REACHED")) {
        openUpgradeModal(
          `${GAME_LABEL[game]} ครบโควต้าแล้ว`,
          `Free เล่น ${GAME_LABEL[game]} ได้ ${perDayLimit[game]} รอบต่อวัน อัปเกรดเป็น Pro เพื่อเล่นได้ไม่จำกัด`,
        );
        return false;
      }
      toast((err as Error).message || "เริ่มเกมไม่สำเร็จ");
      return false;
    }
  }
  return true;
}
