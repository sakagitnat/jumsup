import { useRef, useState } from "react";
import { frequentExamWords } from "../../data/vocabulary/coreWords.js";

type DemoWord = { w: string; p: string; m: string; e: string };

// A short taste of the real "TCAS English · ออกบ่อย" deck.
const DECK: DemoWord[] = frequentExamWords.slice(0, 10);

const SWIPE_PX = 64;

/** Interactive flashcard preview on the landing page: tap to reveal, swipe or
 *  tap a button to advance. No account, no persistence — just the feel. */
export function DemoCard() {
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [dx, setDx] = useState(0);
  const dragging = useRef<number | null>(null);

  const card = DECK[i];

  const advance = () => {
    setRevealed(false);
    setDx(0);
    setI((n) => (n + 1) % DECK.length);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current === null) return;
    setDx(e.clientX - dragging.current);
  };
  const onPointerUp = () => {
    if (dragging.current === null) return;
    const moved = dx;
    dragging.current = null;
    if (Math.abs(moved) > SWIPE_PX) advance();
    else setDx(0);
  };

  return (
    <div className="rounded-3xl border border-line bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-subtle">
        <span>Flashcard · ตัวอย่างจริง</span>
        <span>
          {i + 1} / {DECK.length}
        </span>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => setRevealed(true)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            setRevealed((r) => !r);
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="mt-1 min-h-[188px] cursor-pointer touch-pan-y select-none rounded-2xl px-2 py-8 text-center"
        style={{
          transform: `translateX(${dx}px) rotate(${dx * 0.03}deg)`,
          transition: dragging.current === null ? "transform .2s ease" : "none",
        }}
      >
        <small className="text-xs text-subtle">
          {revealed ? "ปัดเพื่อไปคำถัดไป" : "แตะเพื่อดูคำแปล"}
        </small>
        <p className="mt-2 text-3xl font-semibold">{card.w}</p>
        <p className="text-sm text-subtle">{card.p}</p>
        <div
          className={"mt-4 transition-opacity " + (revealed ? "opacity-100" : "opacity-0")}
        >
          <b className="text-lg">{card.m}</b>
          <p className="mt-1 text-sm text-muted">{card.e}</p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={advance}
          className="rounded-xl border border-line py-2 text-sm font-semibold text-muted hover:bg-surface-2"
        >
          ยังไม่จำ
        </button>
        <button
          onClick={advance}
          className="rounded-xl border border-primary-border bg-primary-soft py-2 text-sm font-semibold text-primary hover:bg-primary-soft/70"
        >
          จำได้
        </button>
      </div>
    </div>
  );
}
