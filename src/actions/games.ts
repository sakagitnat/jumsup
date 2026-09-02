import { backendEnabled } from "../lib/supabase.js";
import { startDailyFeature } from "../lib/policy.js";
import { store } from "../store/store";
import { getCurrentUser } from "../app/cloudSync";
import { proPopup, toast } from "../ui/toast";
import type { Word } from "../store/types";

export type Game = "match" | "crossword";

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
        proPopup(
          `${game === "match" ? "Match" : "Crossword"} ครบโควต้าแล้ว`,
          game === "match"
            ? "Free เล่น Match ได้ 10 รอบต่อวัน อัปเกรดเป็น Pro เพื่อเล่นได้ไม่จำกัด"
            : "Free เล่น Crossword ได้ 3 รอบต่อวัน อัปเกรดเป็น Pro เพื่อเล่นได้ไม่จำกัด",
        );
        return false;
      }
      toast((err as Error).message || "เริ่มเกมไม่สำเร็จ");
      return false;
    }
  }
  return true;
}
