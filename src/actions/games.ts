import { supabase, backendEnabled } from "../lib/supabase.js";
import { startDailyFeature } from "../lib/policy.js";
import { store } from "../store/store";
import { getCurrentUser } from "../app/cloudSync";
import { toast } from "../ui/toast";
import { openUpgradeModal } from "../ui/upgradeModal";
import { FREE_LIMITS } from "../lib/plans.js";
import type { Word } from "../store/types";

export type Game = "match" | "crossword";

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

export function masteredWords(deckId: string): Word[] {
  const s = store.get();
  const deck = s.decks.find((d) => d.id === deckId);
  if (!deck) return [];
  const mastered = s.progress[deckId]?.mastered ?? [];
  return mastered.map((i) => deck.words[i]).filter(Boolean);
}

const minWords: Record<Game, number> = { match: 4, crossword: 3 };

/** Returns true if the game may start. Shows a popup/toast otherwise. */
export async function startGameSession(game: Game, deckId: string): Promise<boolean> {
  const words = masteredWords(deckId);
  if (words.length < minWords[game]) {
    toast(`ต้องจำศัพท์อย่างน้อย ${minWords[game]} คำก่อนเล่น${game === "match" ? " Match" : " Crossword"}`);
    return false;
  }
  if (getCurrentUser() && backendEnabled) {
    try {
      await startDailyFeature(game, `${game}:${crypto.randomUUID()}`, { content_id: deckId });
    } catch (err) {
      if (String((err as Error).message).includes("DAILY_LIMIT_REACHED")) {
        openUpgradeModal(
          `${game === "match" ? "Match" : "Crossword"} ครบโควต้าแล้ว`,
          game === "match"
            ? `Free เล่น Match ได้ ${FREE_LIMITS.matchPerDay} รอบต่อวัน อัปเกรดเป็น Pro เพื่อเล่นได้ไม่จำกัด`
            : `Free เล่น Crossword ได้ ${FREE_LIMITS.crosswordPerDay} รอบต่อวัน อัปเกรดเป็น Pro เพื่อเล่นได้ไม่จำกัด`,
        );
        return false;
      }
      toast((err as Error).message || "เริ่มเกมไม่สำเร็จ");
      return false;
    }
  }
  return true;
}
