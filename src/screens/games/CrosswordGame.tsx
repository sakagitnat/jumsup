import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { masteredWords, awardGameXp } from "../../actions/games";
import { buildCrossword, type Entry } from "../../lib/crossword";
import { PageHeader, Card, Button, Progress, Switch, EmptyState, cx, toast, IconArrowLeft } from "../../ui";

const MAX_HINTS = 3;
const DIFFICULTIES = [
  { label: "ง่าย", maxWords: 6 },
  { label: "ปกติ", maxWords: 10 },
] as const;
const DIFFICULTY_KEY = "jumsup:crossword:maxWords";
const LIVE_CHECK_KEY = "jumsup:crossword:liveCheck";

export function CrosswordGame() {
  const { deckId = "" } = useParams();
  const navigate = useNavigate();
  const deck = useStore((s) => s.decks.find((d) => d.id === deckId));
  const contentLoaded = useStore((s) => s.contentLoaded);

  const [maxWords, setMaxWords] = useState<number>(() => {
    const saved = Number(localStorage.getItem(DIFFICULTY_KEY));
    return DIFFICULTIES.some((d) => d.maxWords === saved) ? saved : 10;
  });
  const [liveCheck, setLiveCheck] = useState(() => localStorage.getItem(LIVE_CHECK_KEY) === "1");

  const puzzle = useMemo(
    () => buildCrossword(masteredWords(deckId), maxWords),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deckId, maxWords],
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [seconds, setSeconds] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [activeDir, setActiveDir] = useState<"across" | "down">("across");
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const doneRef = useRef(false);
  const clickWasFocused = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // With live-check on, a puzzle can complete just by typing the last letter
  // -- no separate "ตรวจคำตอบ" press to notice. Watch for that here instead.
  useEffect(() => {
    if (!liveCheck || doneRef.current || !puzzle) return;
    let allRight = true;
    outer: for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        const cell = puzzle.grid.get(`${r},${c}`);
        if (!cell) continue;
        if ((values[`${r},${c}`] || "").toUpperCase() !== cell.letter) {
          allRight = false;
          break outer;
        }
      }
    }
    if (allRight) {
      doneRef.current = true;
      toast(`ถูกทั้งหมด · ใช้เวลา ${seconds} วินาที`);
      void awardGameXp("crossword");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, liveCheck, puzzle]);

  const changeDifficulty = (n: number) => {
    localStorage.setItem(DIFFICULTY_KEY, String(n));
    setMaxWords(n);
    setValues({});
    setChecked({});
    setHintsUsed(0);
    setSeconds(0);
    doneRef.current = false;
  };

  const toggleLiveCheck = (next: boolean) => {
    setLiveCheck(next);
    localStorage.setItem(LIVE_CHECK_KEY, next ? "1" : "0");
    if (!next) setChecked({});
  };

  if (!deck && !contentLoaded) {
    return (
      <>
        <PageHeader eyebrow="VOCABULARY GAME" title="กำลังโหลด…" />
        <div className="mx-auto mt-6 h-48 max-w-md animate-pulse rounded-3xl bg-surface-2" />
      </>
    );
  }

  if (!deck || !puzzle) {
    return (
      <>
        <PageHeader eyebrow="VOCABULARY GAME" title="ยังเล่น Crossword ไม่ได้" />
        <EmptyState>
          คำที่จำแล้วต้องมีตัวอักษรร่วมกันอย่างน้อย 3 คำ — จำคำเพิ่มแล้วลองอีกครั้ง
          <div className="mt-3">
            <Button variant="primary" onClick={() => navigate(`/flash/deck/${deckId}`)}>
              กลับหน้าเลือกชุด
            </Button>
          </div>
        </EmptyState>
      </>
    );
  }

  const numberAt = new Map(puzzle.entries.map((e) => [`${e.row},${e.col}`, e.number]));
  const cellKeys: string[] = [];
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      if (puzzle.grid.get(`${r},${c}`)) cellKeys.push(`${r},${c}`);
    }
  }
  const filledCount = cellKeys.filter((k) => values[k]).length;

  // Every entry (word) covering each cell -- most cells belong to one, cells
  // where an across and a down word cross belong to two.
  const cellEntries = new Map<string, Entry[]>();
  for (const e of puzzle.entries) {
    const dr = e.direction === "down" ? 1 : 0;
    const dc = e.direction === "across" ? 1 : 0;
    for (let i = 0; i < e.item.w.length; i++) {
      const k = `${e.row + dr * i},${e.col + dc * i}`;
      cellEntries.set(k, [...(cellEntries.get(k) || []), e]);
    }
  }

  const entryAt = (k: string, dir: "across" | "down") =>
    cellEntries.get(k)?.find((e) => e.direction === dir);

  const entryCells = (e: Entry): string[] => {
    const dr = e.direction === "down" ? 1 : 0;
    const dc = e.direction === "across" ? 1 : 0;
    return Array.from({ length: e.item.w.length }, (_, i) => `${e.row + dr * i},${e.col + dc * i}`);
  };

  // The whole word the focused cell currently belongs to, so it can be
  // highlighted -- makes it clear which word is being filled, not just
  // which single cell has focus.
  const activeEntry = focusedKey ? entryAt(focusedKey, activeDir) : null;
  const activeCells = activeEntry ? new Set(entryCells(activeEntry)) : null;

  // The next/previous cell along a given word, in typing direction -- not the
  // same as "the next cell in the grid", which is what made typing a down
  // word jump sideways into an unrelated cell after every letter.
  const stepInEntry = (k: string, dir: "across" | "down", delta: 1 | -1) => {
    const e = entryAt(k, dir);
    if (!e) return null;
    const [r, c] = k.split(",").map(Number);
    const nr = dir === "down" ? r + delta : r;
    const nc = dir === "across" ? c + delta : c;
    const withinWord =
      dir === "down"
        ? nr >= e.row && nr < e.row + e.item.w.length
        : nc >= e.col && nc < e.col + e.item.w.length;
    return withinWord ? `${nr},${nc}` : null;
  };

  const focusCell = (k: string | null | undefined, dir?: "across" | "down") => {
    if (!k) return;
    if (dir) setActiveDir(dir);
    inputs.current[k]?.focus();
  };

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const check = () => {
    const next: Record<string, boolean> = {};
    let allRight = true;
    for (const k of cellKeys) {
      const want = puzzle.grid.get(k)!.letter;
      const got = (values[k] || "").toUpperCase();
      next[k] = got === want;
      if (!next[k]) allRight = false;
    }
    setChecked(next);
    if (allRight && !doneRef.current) {
      doneRef.current = true;
      toast(`ถูกทั้งหมด · ใช้เวลา ${seconds} วินาที`);
      void awardGameXp("crossword");
    }
  };

  const useHint = () => {
    if (hintsUsed >= MAX_HINTS) return;
    const wrong = cellKeys.find((k) => {
      const want = puzzle.grid.get(k)!.letter;
      return (values[k] || "").toUpperCase() !== want;
    });
    if (!wrong) return;
    const letter = puzzle.grid.get(wrong)!.letter;
    setValues((prev) => ({ ...prev, [wrong]: letter }));
    setChecked((prev) => ({ ...prev, [wrong]: true }));
    setHintsUsed((n) => n + 1);
    focusCell(wrong);
  };

  const clues = (direction: "across" | "down") => {
    const list = puzzle.entries.filter((e) => e.direction === direction);
    if (!list.length) return <p className="text-sm text-muted">ไม่มีคำในแนวนี้</p>;
    return (
      <ul className="space-y-1 text-sm">
        {list.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => focusCell(`${e.row},${e.col}`, e.direction)}
              className={cx(
                "text-left hover:underline",
                activeEntry?.id === e.id && "font-semibold text-primary",
              )}
            >
              <b>{e.number}.</b> <span data-noi18n>{e.item.m}</span>{" "}
              <small className="text-subtle">{`(${e.item.w.length} ตัวอักษร)`}</small>
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <Button variant="ghost" className="mb-3" onClick={() => navigate(`/flash/deck/${deckId}`)}>
        <IconArrowLeft size={15} className="mr-1.5 inline align-[-2px]" />
        ออกจากเกม
      </Button>
      <PageHeader
        eyebrow="VOCABULARY GAME"
        title={`Crossword · ${deck.name}`}
        description="เติมคำแนวนอนและแนวตั้งที่ตัดกันจากคำใบ้ · แตะคำใบ้เพื่อไปที่ช่องนั้น"
        actions={<span className="tabular-nums text-sm text-muted">{clock}</span>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">ระดับ:</span>
          {DIFFICULTIES.map((d) => (
            <button
              key={d.label}
              type="button"
              onClick={() => changeDifficulty(d.maxWords)}
              className={cx(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                maxWords === d.maxWords
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-line text-muted hover:bg-surface-2",
              )}
            >
              {d.label} ({d.maxWords} คำ)
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2">
          <span className="text-sm text-muted">ตรวจทันทีที่พิมพ์</span>
          <Switch checked={liveCheck} label="ตรวจทันทีที่พิมพ์" onChange={toggleLiveCheck} />
        </label>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <Card>
          {/* Floating clue bar -- shows the clue for whatever word is being
              filled right now, so the player doesn't have to look away from
              the grid to the sidebar list to remember what they're solving. */}
          <div className="mb-3 min-h-[2.75rem] rounded-xl border border-primary-border bg-primary-soft px-3 py-2 text-sm">
            {activeEntry ? (
              <>
                <b>
                  {activeEntry.number}
                  {activeEntry.direction === "across" ? " แนวนอน" : " แนวตั้ง"}:
                </b>{" "}
                <span data-noi18n>{activeEntry.item.m}</span>{" "}
                <small className="text-subtle">{`(${activeEntry.item.w.length} ตัวอักษร)`}</small>
              </>
            ) : (
              <span className="text-subtle">แตะช่องหรือคำใบ้เพื่อเริ่ม</span>
            )}
          </div>
          <div className="mb-3 flex items-center gap-2 text-xs text-muted">
            <span className="tabular-nums">
              {filledCount}/{cellKeys.length}
            </span>
            <Progress value={(filledCount / cellKeys.length) * 100} className="flex-1" />
          </div>
          <div
            className="mx-auto grid w-max gap-1"
            style={{ gridTemplateColumns: `repeat(${puzzle.cols}, 2rem)` }}
          >
            {Array.from({ length: puzzle.rows }).flatMap((_, r) =>
              Array.from({ length: puzzle.cols }).map((__, c) => {
                const k = `${r},${c}`;
                const has = puzzle.grid.get(k);
                if (!has) return <span key={k} className="h-8 w-8" aria-hidden />;
                const n = numberAt.get(k);
                return (
                  <label key={k} className="relative">
                    {n != null && (
                      <small className="absolute left-0.5 top-0 text-[8px] text-subtle">{n}</small>
                    )}
                    <input
                      ref={(el) => {
                        inputs.current[k] = el;
                      }}
                      maxLength={1}
                      value={values[k] || ""}
                      onMouseDown={() => {
                        clickWasFocused.current = document.activeElement === inputs.current[k];
                      }}
                      onClick={() => {
                        // Tapping an already-focused intersection cell again
                        // switches which of its two words you're filling --
                        // otherwise there'd be no way to reach the "other"
                        // word through that cell without hunting for its clue.
                        if (clickWasFocused.current && entryAt(k, "across") && entryAt(k, "down")) {
                          setActiveDir((d) => (d === "across" ? "down" : "across"));
                        }
                      }}
                      onFocus={() => {
                        setFocusedKey(k);
                        // Keep the current typing direction if this cell is
                        // part of a word going that way; otherwise switch to
                        // whichever direction it does support (e.g. clicking
                        // a down-only cell while "across" was active).
                        if (!entryAt(k, activeDir)) {
                          const other = activeDir === "across" ? "down" : "across";
                          if (entryAt(k, other)) setActiveDir(other);
                        }
                      }}
                      onBlur={() => setFocusedKey((cur) => (cur === k ? null : cur))}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^a-z]/gi, "").toUpperCase();
                        setValues((prev) => ({ ...prev, [k]: v }));
                        if (liveCheck) {
                          setChecked((prev) => ({ ...prev, [k]: v === has.letter }));
                        }
                        if (v) focusCell(stepInEntry(k, activeDir, 1));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !values[k]) {
                          focusCell(stepInEntry(k, activeDir, -1));
                        }
                      }}
                      className={cx(
                        "h-8 w-8 rounded border text-center text-sm font-bold uppercase",
                        checked[k] === false
                          ? "border-danger bg-danger-soft"
                          : activeCells?.has(k)
                            ? "border-primary-border bg-primary-soft"
                            : "border-line bg-surface",
                      )}
                    />
                  </label>
                );
              }),
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={check}>
              ตรวจคำตอบ
            </Button>
            <Button
              onClick={() => {
                setValues({});
                setChecked({});
              }}
            >
              ล้างคำตอบ
            </Button>
            <Button onClick={useHint} disabled={hintsUsed >= MAX_HINTS}>
              💡 ขอคำใบ้ ({MAX_HINTS - hintsUsed} เหลือ)
            </Button>
          </div>
        </Card>
        <aside className="space-y-4">
          <Card>
            <h3 className="mb-2 text-sm font-semibold">แนวนอน</h3>
            {clues("across")}
          </Card>
          <Card>
            <h3 className="mb-2 text-sm font-semibold">แนวตั้ง</h3>
            {clues("down")}
          </Card>
        </aside>
      </div>
    </>
  );
}
