import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { masteredWords, awardGameXp } from "../../actions/games";
import { buildCrossword } from "../../lib/crossword";
import { PageHeader, Card, Button, EmptyState, cx, toast, IconArrowLeft } from "../../ui";

export function CrosswordGame() {
  const { deckId = "" } = useParams();
  const navigate = useNavigate();
  const deck = useStore((s) => s.decks.find((d) => d.id === deckId));
  const contentLoaded = useStore((s) => s.contentLoaded);

  const puzzle = useMemo(
    () => buildCrossword(masteredWords(deckId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deckId],
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [seconds, setSeconds] = useState(0);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const doneRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

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

  const clues = (direction: "across" | "down") => {
    const list = puzzle.entries.filter((e) => e.direction === direction);
    if (!list.length) return <p className="text-sm text-muted">ไม่มีคำในแนวนี้</p>;
    return (
      <ul className="space-y-1 text-sm">
        {list.map((e) => (
          <li key={e.id}>
            <b>{e.number}.</b> <span data-noi18n>{e.item.m}</span>{" "}
            <small className="text-subtle">{`(${e.item.w.length} ตัวอักษร)`}</small>
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
        description="เติมคำแนวนอนและแนวตั้งที่ตัดกันจากคำใบ้"
        actions={<span className="tabular-nums text-sm text-muted">{clock}</span>}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <Card>
          <div
            className="grid w-max gap-1"
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
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^a-z]/gi, "").toUpperCase();
                        setValues((prev) => ({ ...prev, [k]: v }));
                        if (v) {
                          const idx = cellKeys.indexOf(k);
                          inputs.current[cellKeys[idx + 1]]?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !values[k]) {
                          const idx = cellKeys.indexOf(k);
                          inputs.current[cellKeys[idx - 1]]?.focus();
                        }
                      }}
                      className={cx(
                        "h-8 w-8 rounded border text-center text-sm font-bold uppercase",
                        checked[k] === false
                          ? "border-danger bg-danger-soft"
                          : "border-line bg-surface",
                      )}
                    />
                  </label>
                );
              }),
            )}
          </div>
          <div className="mt-4 flex gap-2">
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
