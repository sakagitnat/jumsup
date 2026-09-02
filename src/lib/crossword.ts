// Intersecting-crossword generator. Ported verbatim from the old
// src/app/createApp.js buildCrossword — logic unchanged, types added.
import type { Word } from "../store/types";

type Dir = "across" | "down";
interface Cell {
  letter: string;
  entryIds: number[];
}
export interface Entry {
  id: number;
  item: Word;
  row: number;
  col: number;
  direction: Dir;
  number?: number;
}
export interface Puzzle {
  entries: Entry[];
  grid: Map<string, Cell>;
  rows: number;
  cols: number;
}

export function buildCrossword(words: Word[], maxWords = 10): Puzzle | null {
  const candidates = words
    .filter((x) => /^[a-z]+$/i.test(x.w))
    .slice(0, maxWords)
    .sort((a, b) => b.w.length - a.w.length);
  const grid = new Map<string, Cell>();
  const entries: Entry[] = [];
  const key = (r: number, c: number) => `${r},${c}`;
  const cell = (r: number, c: number) => grid.get(key(r, c));

  const canPlace = (word: string, row: number, col: number, direction: Dir, requireCross = true) => {
    const dr = direction === "down" ? 1 : 0;
    const dc = direction === "across" ? 1 : 0;
    if (cell(row - dr, col - dc) || cell(row + dr * word.length, col + dc * word.length))
      return false;
    let crosses = 0;
    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const existing = cell(r, c);
      if (existing && existing.letter !== word[i]) return false;
      if (existing) crosses++;
      else if (direction === "across" && (cell(r - 1, c) || cell(r + 1, c))) return false;
      else if (direction === "down" && (cell(r, c - 1) || cell(r, c + 1))) return false;
    }
    return !requireCross || crosses > 0;
  };

  const place = (item: Word, row: number, col: number, direction: Dir) => {
    const id = entries.length;
    const word = item.w.toUpperCase();
    const dr = direction === "down" ? 1 : 0;
    const dc = direction === "across" ? 1 : 0;
    entries.push({ id, item, row, col, direction });
    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const k = key(r, c);
      const current = grid.get(k);
      grid.set(k, { letter: word[i], entryIds: [...(current?.entryIds || []), id] });
    }
  };

  if (!candidates.length) return null;
  place(candidates[0], 0, 0, "across");

  for (const item of candidates.slice(1)) {
    const word = item.w.toUpperCase();
    let placed = false;
    for (let i = 0; i < word.length && !placed; i++) {
      for (const [position, current] of grid) {
        if (placed || current.letter !== word[i]) continue;
        const [r, c] = position.split(",").map(Number);
        const directions = [
          ...new Set<Dir>(
            current.entryIds.map((id) =>
              entries[id].direction === "across" ? "down" : "across",
            ),
          ),
        ];
        for (const direction of directions) {
          const row = r - (direction === "down" ? i : 0);
          const col = c - (direction === "across" ? i : 0);
          if (canPlace(word, row, col, direction)) {
            place(item, row, col, direction);
            placed = true;
            break;
          }
        }
      }
    }
  }

  if (entries.length < 3) return null;

  const rowNums = [...grid.keys()].map((x) => Number(x.split(",")[0]));
  const colNums = [...grid.keys()].map((x) => Number(x.split(",")[1]));
  const minRow = Math.min(...rowNums);
  const minCol = Math.min(...colNums);
  const maxRow = Math.max(...rowNums);
  const maxCol = Math.max(...colNums);

  entries.forEach((entry, index) => {
    entry.number = index + 1;
    entry.row -= minRow;
    entry.col -= minCol;
  });
  const normalized = new Map(
    [...grid].map(([position, value]) => {
      const [r, c] = position.split(",").map(Number);
      return [key(r - minRow, c - minCol), value] as const;
    }),
  );
  return {
    entries,
    grid: normalized,
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1,
  };
}
