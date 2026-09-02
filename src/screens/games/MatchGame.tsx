import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { masteredWords } from "../../actions/games";
import { PageHeader, Button, EmptyState, cx, toast } from "../../ui";

interface Tile {
  id: number;
  pair: number;
  text: string;
}

export function MatchGame() {
  const { deckId = "" } = useParams();
  const navigate = useNavigate();
  const deck = useStore((s) => s.decks.find((d) => d.id === deckId));

  const tiles = useMemo<Tile[]>(() => {
    const pairs = masteredWords(deckId).slice(0, 6);
    return pairs
      .flatMap((w, i) => [
        { pair: i, text: w.w },
        { pair: i, text: w.m },
      ])
      .map((t, id) => ({ ...t, id }))
      .sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);
  const pairCount = tiles.length / 2;

  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!doneRef.current && pairCount > 0 && matched.size === pairCount * 2) {
      doneRef.current = true;
      setTimeout(() => toast(`จบ Match ใน ${seconds} วินาที · ${moves} ครั้ง`), 250);
    }
  }, [matched, pairCount, seconds, moves]);

  if (!deck) {
    return (
      <>
        <PageHeader eyebrow="VOCABULARY GAME" title="ไม่พบชุดคำศัพท์" />
        <EmptyState>
          <Button variant="primary" onClick={() => navigate("/match")}>
            กลับหน้าเลือกชุด
          </Button>
        </EmptyState>
      </>
    );
  }

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const click = (t: Tile) => {
    if (matched.has(t.id)) return;
    if (selected === null) {
      setSelected(t.id);
      return;
    }
    if (selected === t.id) return;
    setMoves((m) => m + 1);
    const first = tiles.find((x) => x.id === selected)!;
    if (first.pair === t.pair) {
      setMatched((prev) => new Set(prev).add(first.id).add(t.id));
      setSelected(null);
    } else {
      setWrong(t.id);
      const keep = selected;
      setSelected(null);
      setTimeout(() => {
        setWrong(null);
        void keep;
      }, 350);
    }
  };

  return (
    <>
      <Button variant="ghost" className="mb-3" onClick={() => navigate("/match")}>
        ← ออกจากเกม
      </Button>
      <PageHeader
        eyebrow="VOCABULARY GAME"
        title={`Match · ${deck.name}`}
        description="จับคู่คำศัพท์กับความหมายให้ครบโดยใช้จำนวนครั้งให้น้อยที่สุด"
      />
      <div className="mb-4 flex gap-6 text-sm">
        <span>เวลา <strong className="tabular-nums">{clock}</strong></span>
        <span>ครั้ง <strong>{moves}</strong></span>
        <span>คู่ <strong>{matched.size / 2}/{pairCount}</strong></span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => {
          const isMatched = matched.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => click(t)}
              disabled={isMatched}
              className={cx(
                "min-h-[86px] rounded-xl border p-3 text-sm font-semibold transition-colors",
                isMatched
                  ? "pointer-events-none border-line opacity-30"
                  : wrong === t.id
                    ? "border-danger bg-danger-soft"
                    : selected === t.id
                      ? "border-primary-border bg-primary-soft text-primary"
                      : "border-line bg-surface hover:bg-surface-2",
              )}
            >
              {t.text}
            </button>
          );
        })}
      </div>
    </>
  );
}
