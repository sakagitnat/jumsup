import { useRef, useState } from "react";

type DemoWord = { w: string; p: string; m: string; e: string };

// A short taste of the "TCAS English · ออกบ่อย" deck. Inlined so the landing
// page does not pull the full vocabulary module into the initial bundle.
const DECK: DemoWord[] = [
  ["according", "uh-KOR-ding", "ตามที่ (ใช้ according to = ตามที่…ระบุ)", "According to the survey, most students study best in the morning."],
  ["accurate", "AK-yuh-rit", "ถูกต้องแม่นยำ", "The old map was not accurate, so the hikers took the wrong path."],
  ["achieve", "uh-CHEEV", "บรรลุ, ทำสำเร็จ", "She worked hard all year to achieve a top score on the exam."],
  ["analyze", "AN-uh-lyze", "วิเคราะห์", "Scientists analyze the data carefully before drawing any conclusion."],
  ["apparent", "uh-PA-rent", "เห็นได้ชัด, ที่ปรากฏ", "It soon became apparent that the original plan would not work."],
  ["benefit", "BEN-uh-fit", "ประโยชน์; ได้ประโยชน์", "Regular exercise has a lasting benefit for mental health."],
  ["crucial", "KROO-shul", "สำคัญอย่างยิ่ง", "The first few minutes after an accident are crucial."],
  ["evidence", "EV-i-dens", "หลักฐาน", "There is strong evidence that the climate is warming."],
  ["significant", "sig-NIF-i-kunt", "สำคัญ, มีนัยสำคัญ", "There was a significant rise in temperature over the decade."],
  ["however", "how-EV-er", "อย่างไรก็ตาม", "The plan is cheap. However, it may not be safe."],
].map(([w, p, m, e]) => ({ w, p, m, e }));

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

  const swiped = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = e.clientX;
    swiped.current = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current === null) return;
    const d = e.clientX - dragging.current;
    // Commit as soon as the threshold is crossed — don't wait for pointerup,
    // which some environments drop after fast drags.
    if (Math.abs(d) > SWIPE_PX) {
      dragging.current = null;
      swiped.current = true;
      advance();
      return;
    }
    setDx(d);
  };
  const onPointerUp = () => {
    if (dragging.current === null) return;
    dragging.current = null;
    setDx(0);
  };
  const onClick = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    setRevealed(true);
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
        onClick={onClick}
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
