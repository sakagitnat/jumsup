import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { speak } from "../../lib/utils.js";
import { useStore, store } from "../../store/useStore";
import { markWordMastered } from "../../actions/flashcards";
import { PageHeader, Card, Button, Progress, Modal, Switch, EmptyState, toast } from "../../ui";

export function Study() {
  const { deckId = "" } = useParams();
  const navigate = useNavigate();

  const deck = useStore((s) => s.decks.find((d) => d.id === deckId));
  const flashSettings = useStore((s) => s.flashSettings);
  const storedMastered = useStore((s) => s.progress[deckId]?.mastered ?? []);

  const [poolSize, setPoolSize] = useState(() =>
    Math.min(flashSettings.loopSize, deck?.words.length ?? flashSettings.loopSize),
  );
  const [mastered, setMastered] = useState<number[]>(() => [...storedMastered]);
  const [cursor, setCursor] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const pool = Math.min(poolSize, deck?.words.length ?? 0);
  const activeIndices = useMemo(() => Array.from({ length: pool }, (_, i) => i), [pool]);
  const remaining = activeIndices.filter((i) => !mastered.includes(i));
  const idx = remaining.length ? remaining[cursor % remaining.length] : -1;
  const word = idx >= 0 ? deck?.words[idx] : undefined;

  useEffect(() => {
    if (word && flashSettings.autoSpeak) speak(word.w);
  }, [word, flashSettings.autoSpeak]);

  // a new card always starts on the term side
  useEffect(() => {
    setFlipped(false);
  }, [idx]);

  const know = useCallback(async () => {
    if (idx < 0) return;
    try {
      const next = await markWordMastered(deckId, idx);
      setMastered(next);
      setCursor(0);
    } catch (e) {
      toast((e as Error).message || "บันทึกความก้าวหน้าไม่สำเร็จ");
    }
  }, [deckId, idx]);

  const miss = useCallback(() => setCursor((c) => c + 1), []);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        void know();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        miss();
      } else if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [know, miss]);

  // swipe — transform writes are rAF-batched and the card is promoted to its own
  // compositor layer while dragging so the drop shadow is rasterized once instead
  // of repainting every frame (that repaint was the source of the stutter).
  const cardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; dx: number; raf: number } | null>(null);

  const paint = (dx: number) => {
    const el = cardRef.current;
    if (el) el.style.transform = `translate3d(${dx}px,0,0) rotate(${dx / 28}deg)`;
  };
  const relax = () => {
    const el = cardRef.current;
    if (!el) return;
    const done = () => {
      el.style.willChange = "";
      el.style.transition = "";
      el.removeEventListener("transitionend", done);
    };
    el.addEventListener("transitionend", done);
    el.style.transition = "transform .18s ease-out";
    el.style.transform = "translate3d(0,0,0)";
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const el = cardRef.current;
    if (!el) return;
    drag.current = { x: e.clientX, dx: 0, raf: 0 };
    el.style.transition = "none";
    el.style.willChange = "transform";
    el.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    d.dx = e.clientX - d.x;
    if (!d.raf)
      d.raf = requestAnimationFrame(() => {
        d.raf = 0;
        paint(d.dx);
      });
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.raf) cancelAnimationFrame(d.raf);
    const el = cardRef.current;
    if (el && Math.abs(d.dx) > 90) {
      const dir = d.dx > 0 ? 1 : -1;
      el.style.transition = "transform .17s ease-in";
      el.style.transform = `translate3d(${dir * window.innerWidth}px,0,0) rotate(${dir * 12}deg)`;
      window.setTimeout(() => {
        el.style.transition = "none";
        el.style.transform = "translate3d(0,0,0)";
        el.style.willChange = "";
        if (dir > 0) void know();
        else miss();
      }, 160);
    } else {
      relax();
    }
  };

  if (!deck) {
    return (
      <>
        <PageHeader eyebrow="FLASHCARDS" title="ไม่พบชุดคำศัพท์" />
        <EmptyState>
          <Button variant="primary" onClick={() => navigate("/flash")}>
            กลับหน้าเลือกชุด
          </Button>
        </EmptyState>
      </>
    );
  }

  const done = remaining.length === 0;
  const maxWords = Math.max(1, deck.words.length);

  return (
    <>
      <Button variant="ghost" className="mb-3" onClick={() => navigate("/flash")}>
        ← ย้อนกลับ
      </Button>

      {done ? (
        <>
          <PageHeader eyebrow="FLASHCARDS" title={deck.name} description="จำครบ Loop นี้แล้ว" />
          <Card soft className="text-center">
            <h2 className="text-xl font-semibold">จำครบ {pool} คำแล้ว</h2>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                variant="primary"
                disabled={deck.words.length - pool <= 0}
                onClick={() =>
                  setPoolSize((p) => Math.min(deck.words.length, p + 10))
                }
              >
                เพิ่มอีก 10 คำ
              </Button>
              <Button onClick={() => navigate("/flash")}>กลับหน้าเลือกชุด</Button>
            </div>
          </Card>
        </>
      ) : (
        <>
          <PageHeader
            eyebrow="FLASHCARDS"
            title={deck.name}
            description="แตะการ์ดเพื่อพลิกดูคำแปล · ปัดขวา = จำได้ · ปัดซ้าย = ยังไม่จำ"
            actions={
              <Button size="sm" onClick={() => setSettingsOpen(true)}>
                ⚙ ตั้งค่า
              </Button>
            }
          />

          <div className="mx-auto max-w-xl">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-semibold tabular-nums">
                {pool - remaining.length} / {pool}
              </span>
              <span className="text-muted">เหลืออีก {remaining.length} คำ</span>
            </div>
            <Progress value={((pool - remaining.length) / pool) * 100} className="mb-4" />

            <div
              ref={cardRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="touch-pan-y select-none [perspective:1600px] [transform:translate3d(0,0,0)]"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setFlipped((f) => !f)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setFlipped((f) => !f);
                  }
                }}
                aria-label="พลิกการ์ด"
                className="relative block min-h-[320px] w-full cursor-pointer rounded-3xl [transform-style:preserve-3d] transition-transform duration-300"
                style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
              >
                {/* front — term */}
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-line bg-surface p-8 text-center shadow-card [backface-visibility:hidden]">
                  <span className="absolute left-5 top-5 text-xs font-semibold uppercase tracking-wide text-subtle">
                    คำศัพท์
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="ฟังเสียง"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (word) speak(word.w);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        e.preventDefault();
                        if (word) speak(word.w);
                      }
                    }}
                    className="absolute right-4 top-4 grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-line text-muted hover:bg-surface-2"
                  >
                    🔊
                  </span>
                  <h2 className="text-4xl font-semibold">{word?.w}</h2>
                  {(word?.stress || word?.p) && (
                    <div className="mt-2 text-sm text-subtle">{word?.stress || word?.p}</div>
                  )}
                  {flashSettings.showMeaning && word?.m && (
                    <div className="mt-4 text-base text-muted">{word.m}</div>
                  )}
                  <span className="absolute bottom-5 text-xs text-subtle">แตะเพื่อพลิก</span>
                </div>
                {/* back — definition */}
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-primary-border bg-primary-soft p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <span className="absolute left-5 top-5 text-xs font-semibold uppercase tracking-wide text-primary">
                    ความหมาย
                  </span>
                  <p className="text-2xl font-semibold">{word?.m || "—"}</p>
                  {word?.e && (
                    <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">{word.e}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="danger" size="lg" onClick={miss}>
                ← ยังไม่จำ
              </Button>
              <Button variant="success" size="lg" onClick={know}>
                จำได้ →
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="ตั้งค่า Flashcard"
        footer={
          <Button variant="primary" onClick={() => setSettingsOpen(false)}>
            เสร็จสิ้น
          </Button>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">จำนวนคำใน Loop</span>
            <input
              type="number"
              min={1}
              max={maxWords}
              value={Math.min(poolSize, maxWords)}
              onChange={(e) => {
                const n = Math.max(1, Math.min(maxWords, Number(e.target.value) || 1));
                setPoolSize(n);
                setMastered((m) => m.filter((i) => i < n));
                setCursor(0);
                store.set({ flashSettings: { ...flashSettings, loopSize: n } });
              }}
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
            />
          </label>
          {(
            [
              ["autoSpeak", "อ่านเสียงอัตโนมัติ"],
              ["showMeaning", "แสดงคำแปลทันที"],
              ["shuffle", "สุ่มลำดับคำ"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <Switch
                checked={flashSettings[key]}
                label={label}
                onChange={(v) =>
                  store.set({ flashSettings: { ...flashSettings, [key]: v } })
                }
              />
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
