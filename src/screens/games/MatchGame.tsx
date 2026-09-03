import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { masteredWords, awardGameXp } from "../../actions/games";
import { PageHeader, Card, Button, EmptyState, cx, IconArrowLeft } from "../../ui";

interface Tile {
  id: number;
  pair: number;
  text: string;
}

type Phase = "ready" | "playing" | "done";

function shuffledTiles(deckId: string): Tile[] {
  const pairs = masteredWords(deckId).slice(0, 6);
  return pairs
    .flatMap((w, i) => [
      { pair: i, text: w.w },
      { pair: i, text: w.m },
    ])
    .map((t, id) => ({ ...t, id }))
    .sort(() => Math.random() - 0.5);
}

export function MatchGame() {
  const { deckId = "" } = useParams();
  const navigate = useNavigate();
  const deck = useStore((s) => s.decks.find((d) => d.id === deckId));

  const [round, setRound] = useState(0);
  const tiles = useMemo(
    () => shuffledTiles(deckId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deckId, round],
  );
  const pairCount = tiles.length / 2;

  const [phase, setPhase] = useState<Phase>("ready");
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [ms, setMs] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (phase !== "playing") return;
    startRef.current = Date.now() - ms;
    const id = setInterval(() => setMs(Date.now() - startRef.current), 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase === "playing" && pairCount > 0 && matched.size === pairCount * 2) {
      setPhase("done");
      void awardGameXp("match");
    }
  }, [matched, pairCount, phase]);

  const restart = () => {
    setPhase("ready");
    setSelected(null);
    setMatched(new Set());
    setWrong(null);
    setMoves(0);
    setMs(0);
    setRound((r) => r + 1);
  };

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

  const seconds = (ms / 1000).toFixed(1);

  const click = (t: Tile) => {
    if (phase !== "playing" || matched.has(t.id)) return;
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
      setSelected(null);
      setTimeout(() => setWrong(null), 350);
    }
  };

  return (
    <>
      <Button variant="ghost" className="mb-3" onClick={() => navigate("/match")}>
        <IconArrowLeft size={15} className="mr-1.5 inline align-[-2px]" />
        ออกจากเกม
      </Button>
      <PageHeader
        eyebrow="VOCABULARY GAME"
        title={`Match · ${deck.name}`}
        description="จับคู่คำศัพท์กับความหมายให้ครบเร็วที่สุด"
      />

      <div className="mb-4 flex gap-6 text-sm">
        <span>
          เวลา <strong className="tabular-nums">{seconds}s</strong>
        </span>
        <span>
          ครั้ง <strong>{moves}</strong>
        </span>
        <span>
          คู่{" "}
          <strong>
            {matched.size / 2}/{pairCount}
          </strong>
        </span>
      </div>

      <div className="relative">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tiles.map((t) => {
            const isMatched = matched.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => click(t)}
                className={cx(
                  "grid min-h-[92px] place-items-center rounded-xl border p-3 text-sm font-semibold transition-all duration-200",
                  isMatched
                    ? "scale-90 border-transparent opacity-0"
                    : wrong === t.id
                      ? "border-danger bg-danger-soft"
                      : selected === t.id
                        ? "border-primary-border bg-primary-soft text-primary"
                        : "border-line bg-surface hover:bg-surface-2",
                )}
              >
                <span data-noi18n>{t.text}</span>
              </button>
            );
          })}
        </div>

        {phase === "ready" && (
          <div className="absolute inset-0 grid place-items-center rounded-xl bg-black/30 backdrop-blur-sm">
            <Card className="max-w-xs text-center">
              <h3 className="text-lg font-semibold">พร้อมเล่นไหม?</h3>
              <p className="mt-1 text-sm text-muted">
                จับคู่คำกับความหมายให้ครบ {pairCount} คู่ นับเวลาเมื่อกดเริ่ม
              </p>
              <Button variant="primary" className="mt-3" onClick={() => setPhase("playing")}>
                เริ่มเกม
              </Button>
            </Card>
          </div>
        )}

        {phase === "done" && (
          <div className="absolute inset-0 grid place-items-center rounded-xl bg-black/30 backdrop-blur-sm">
            <Card className="max-w-xs text-center">
              <h3 className="text-lg font-semibold">จบเกม!</h3>
              <p className="mt-2 text-sm text-muted">
                เวลา <b>{seconds} วินาที</b> · ใช้ <b>{moves}</b> ครั้ง
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <Button variant="primary" onClick={restart}>
                  เล่นอีกครั้ง
                </Button>
                <Button onClick={() => navigate("/match")}>กลับ</Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
