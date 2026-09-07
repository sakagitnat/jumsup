import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { speak, englishVoices } from "../../lib/utils.js";
import { useStore, store } from "../../store/useStore";
import { gradeWord, resetDeckMastery } from "../../actions/flashcards";
import { isDue, nextReviewHint } from "../../lib/srs";
import {
  PageHeader,
  Card,
  Button,
  Progress,
  Modal,
  Switch,
  EmptyState,
  toast,
  cx,
  IconArrowLeft,
  IconArrowRight,
  IconSettings,
} from "../../ui";

function SpeakButton({ onSpeak, tone = "line" }: { onSpeak: () => void; tone?: "line" | "primary" }) {
  return (
    <button
      type="button"
      data-nodrag
      aria-label="ฟังเสียง"
      onClick={(e) => {
        e.stopPropagation();
        onSpeak();
      }}
      className={cx(
        "absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg border",
        tone === "primary"
          ? "border-primary-border text-primary hover:bg-primary/10"
          : "border-line text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M11 5 6 9H2v6h4l5 4V5Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
    </button>
  );
}

export function Study() {
  const { deckId = "" } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const dueMode = params.get("due") === "1";
  const chain = (params.get("chain") || "").split(",").filter(Boolean);

  const deck = useStore((s) => s.decks.find((d) => d.id === deckId));
  const contentLoaded = useStore((s) => s.contentLoaded);
  const flashSettings = useStore((s) => s.flashSettings);
  const storedMastered = useStore((s) => s.progress[deckId]?.mastered ?? []);
  const deckSrs = useStore((s) => s.srs[deckId]);

  const [poolSize, setPoolSize] = useState(() =>
    Math.min(flashSettings.loopSize, deck?.words.length ?? flashSettings.loopSize),
  );
  // Separate from `poolSize` so the field can be cleared/backspaced while
  // typing a new number — a controlled input bound straight to poolSize
  // forced empty input back to 1 on every keystroke, making it impossible
  // to clear the field and type a different number.
  const [poolSizeInput, setPoolSizeInput] = useState(() => String(poolSize));
  const [mastered, setMastered] = useState<number[]>(() => [...storedMastered]);
  const [cursor, setCursor] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [pop, setPop] = useState(false);

  // --- due-review session (only when dueMode) ---
  const [dueQueue, setDueQueue] = useState<number[]>([]);
  const [duePos, setDuePos] = useState(0);
  const [dueTotal, setDueTotal] = useState(0);
  const [dueCleared, setDueCleared] = useState(0);
  const dueInitFor = useRef<string>("");
  useEffect(() => {
    // (re)build the due queue whenever the deck changes — the component stays
    // mounted when chaining from one deck's review straight into the next.
    if (!dueMode || !deck || dueInitFor.current === deckId) return;
    dueInitFor.current = deckId;
    const q = deck.words
      .map((_, i) => i)
      .filter((i) => deckSrs?.[i] && isDue(deckSrs[i]));
    setDueQueue(q);
    setDueTotal(q.length);
    setDuePos(0);
    setDueCleared(0);
  }, [dueMode, deck, deckSrs, deckId]);

  const toggleFlip = useCallback(() => {
    setFlipped((f) => !f);
    setPop(true);
    window.setTimeout(() => setPop(false), 450);
  }, []);

  const pool = Math.min(poolSize, deck?.words.length ?? 0);
  const activeIndices = useMemo(() => {
    const arr = Array.from({ length: pool }, (_, i) => i);
    if (flashSettings.shuffle) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, deckId, flashSettings.shuffle]);
  const remaining = activeIndices.filter((i) => !mastered.includes(i));

  const idx = dueMode
    ? (dueQueue[duePos] ?? -1)
    : remaining.length
      ? remaining[cursor % remaining.length]
      : -1;
  const word = idx >= 0 ? deck?.words[idx] : undefined;

  const [voices, setVoices] = useState(() => englishVoices());
  useEffect(() => {
    const refresh = () => setVoices(englishVoices());
    refresh();
    window.speechSynthesis?.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", refresh);
  }, []);
  const say = (text: string) =>
    speak(text, "en-US", flashSettings.rate ?? 0.9, flashSettings.voiceURI || undefined);

  useEffect(() => {
    if (word && flashSettings.autoSpeak) say(word.w);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, flashSettings.autoSpeak]);

  // a new card always starts on the term side
  useEffect(() => {
    setFlipped(false);
  }, [idx, duePos]);

  // Re-sync the loop-size text field to the real value whenever the settings
  // modal opens (covers poolSize changing elsewhere, e.g. the "+10" button).
  useEffect(() => {
    if (settingsOpen) setPoolSizeInput(String(poolSize));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen]);

  const know = useCallback(async () => {
    if (idx < 0) return;
    if (dueMode) {
      void gradeWord(deckId, idx, "good");
      setDueCleared((n) => n + 1);
      setDuePos((p) => p + 1);
      return;
    }
    try {
      const next = await gradeWord(deckId, idx, "good");
      setMastered(next);
      setCursor(0);
    } catch (e) {
      toast((e as Error).message || "บันทึกความก้าวหน้าไม่สำเร็จ");
    }
  }, [deckId, idx, dueMode]);

  const miss = useCallback(() => {
    if (idx < 0) return;
    if (dueMode) {
      void gradeWord(deckId, idx, "again");
      setDueQueue((q) => [...q, idx]); // resurface later this session
      setDuePos((p) => p + 1);
      return;
    }
    void gradeWord(deckId, idx, "again");
    setCursor((c) => c + 1);
  }, [deckId, idx, dueMode]);

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
        toggleFlip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [know, miss, toggleFlip]);

  // swipe / tap. Pointer capture is taken *only* once a real drag starts, so a
  // plain tap still delivers a click (that capture-on-pointerdown was swallowing
  // the flip and the speaker button). Transform writes are rAF-batched.
  const cardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; dx: number; raf: number; captured: boolean } | null>(
    null,
  );

  const speakWord = () => {
    if (word) say(word.w);
  };

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
    if ((e.target as HTMLElement).closest("[data-nodrag]")) return;
    const el = cardRef.current;
    if (!el) return;
    drag.current = { x: e.clientX, y: e.clientY, dx: 0, raf: 0, captured: false };
    el.style.transition = "none";
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    d.dx = e.clientX - d.x;
    if (!d.captured && Math.abs(d.dx) > 8) {
      d.captured = true;
      const el = cardRef.current;
      el?.setPointerCapture?.(e.pointerId);
      if (el) el.style.willChange = "transform";
    }
    if (d.captured && !d.raf)
      d.raf = requestAnimationFrame(() => {
        d.raf = 0;
        paint(d.dx);
      });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.raf) cancelAnimationFrame(d.raf);
    const el = cardRef.current;
    const moved = Math.max(Math.abs(d.dx), Math.abs(e.clientY - d.y));

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
      return;
    }

    if (moved < 10) {
      toggleFlip();
    }
    relax();
  };

  if (!deck) {
    // The official decks are code-split and land a beat after boot; a deep link
    // to a deck can arrive first. Show a loader, not "not found", until content
    // has been applied.
    if (!contentLoaded) {
      return (
        <>
          <PageHeader eyebrow="FLASHCARDS" title="กำลังโหลดชุดคำศัพท์…" />
          <div className="mx-auto mt-6 h-64 max-w-md animate-pulse rounded-3xl bg-surface-2" />
        </>
      );
    }
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

  const done = dueMode ? duePos >= dueQueue.length : remaining.length === 0;
  const maxWords = Math.max(1, deck.words.length);

  const progressDone = dueMode ? dueCleared : pool - remaining.length;
  const progressTotal = dueMode ? Math.max(1, dueTotal) : pool;
  const progressLeft = dueMode ? Math.max(0, dueQueue.length - duePos) : remaining.length;

  const doneHint = dueMode
    ? nextReviewHint(
        deck.words.map((_, i) => deckSrs?.[i]).filter((c): c is NonNullable<typeof c> => !!c),
      )
    : "";

  const resetMastery = async () => {
    if (!confirm(`รีเซ็ตความจำทั้งหมดของ "${deck.name}"? คำที่จำแล้วทั้งหมดในชุดนี้จะกลับไปเป็นยังไม่ได้จำ`))
      return;
    try {
      await resetDeckMastery(deckId);
    } catch (e) {
      toast((e as Error).message || "รีเซ็ตความจำไม่สำเร็จ");
      return;
    }
    setMastered([]);
    setCursor(0);
    setSettingsOpen(false);
    toast("รีเซ็ตความจำแล้ว");
  };

  return (
    <>
      <Button variant="ghost" className="mb-3" onClick={() => navigate(`/flash/deck/${deckId}`)}>
        <IconArrowLeft size={15} className="mr-1.5 inline align-[-2px]" />
        ย้อนกลับ
      </Button>

      {done ? (
        <>
          <PageHeader
            eyebrow="FLASHCARDS"
            title={deck.name}
            description={dueMode ? "ทบทวนครบรอบนี้แล้ว" : "จำครบ Loop นี้แล้ว"}
          />
          <Card soft className="text-center">
            <h2 className="text-xl font-semibold">
              {dueMode
                ? dueTotal === 0
                  ? "ยังไม่มีคำที่ครบกำหนดทบทวน"
                  : `ทบทวนครบ ${dueTotal} คำแล้ว`
                : `จำครบ ${pool} คำแล้ว`}
            </h2>
            {dueMode && doneHint && (
              <p className="mt-1 text-sm text-muted">ครบกำหนดรอบถัดไป {doneHint}</p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {!dueMode && (
                <Button
                  variant="primary"
                  disabled={deck.words.length - pool <= 0}
                  onClick={() => setPoolSize((p) => Math.min(deck.words.length, p + 10))}
                >
                  เพิ่มอีก 10 คำ
                </Button>
              )}
              {dueMode && chain.length > 0 && (
                <Button
                  variant="primary"
                  onClick={() => {
                    const [next, ...rest] = chain;
                    navigate(
                      `/flash/study/${next}?due=1${rest.length ? `&chain=${rest.join(",")}` : ""}`,
                    );
                  }}
                >
                  ทบทวนชุดถัดไป · เหลือ {chain.length} ชุด
                </Button>
              )}
              <Button onClick={() => navigate(`/flash/deck/${deckId}`)}>กลับหน้าเลือกชุด</Button>
            </div>
          </Card>
        </>
      ) : (
        <>
          <PageHeader
            eyebrow="FLASHCARDS"
            title={deck.name}
            description={
              dueMode
                ? "ทบทวนคำที่ครบกำหนด · จำได้ = เลื่อนออกไป · ยังไม่จำ = เจอใหม่รอบนี้"
                : "แตะการ์ดเพื่อพลิกดูคำแปล · ปัดขวา = จำได้ · ปัดซ้าย = ยังไม่จำ"
            }
            actions={
              <Button size="sm" onClick={() => setSettingsOpen(true)}>
                <IconSettings size={14} className="mr-1.5 inline align-[-2px]" />
                ตั้งค่า
              </Button>
            }
          />

          <div className="mx-auto max-w-xl">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-semibold tabular-nums">
                {progressDone} / {progressTotal}
              </span>
              <span className="text-muted">
                {dueMode ? "เหลือทบทวน" : "เหลืออีก"} {progressLeft} คำ
              </span>
            </div>
            <Progress value={(progressDone / progressTotal) * 100} className="mb-4" />

            <div
              ref={cardRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={cx(
                "touch-pan-y select-none [perspective:1600px] [transform:translate3d(0,0,0)]",
                pop && "animate-[card-flip-pop_0.45s_ease]",
              )}
            >
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    toggleFlip();
                  }
                }}
                aria-label="พลิกการ์ด"
                className="relative block min-h-[320px] w-full cursor-pointer rounded-3xl will-change-transform [transform-style:preserve-3d] transition-transform duration-500 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)]"
                style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
              >
                {/* front — term */}
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-line bg-surface p-8 text-center shadow-card [backface-visibility:hidden]">
                  <span className="absolute left-5 top-5 text-xs font-semibold uppercase tracking-wide text-subtle">
                    คำศัพท์
                  </span>
                  <SpeakButton onSpeak={speakWord} />
                  <h2 className="text-4xl font-semibold">{word?.w}</h2>
                  {(word?.p || word?.stress) && (
                    <div className="mt-2 text-sm text-subtle">{word?.p || word?.stress}</div>
                  )}
                  <span className="absolute bottom-5 text-xs text-subtle">แตะเพื่อพลิก</span>
                </div>
                {/* back — definition */}
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-primary-border bg-primary-soft p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <span className="absolute left-5 top-5 text-xs font-semibold uppercase tracking-wide text-primary">
                    ความหมาย
                  </span>
                  {word?.e && (
                    <SpeakButton onSpeak={() => word?.e && say(word.e)} tone="primary" />
                  )}
                  <p className="text-2xl font-semibold" data-noi18n>
                    {word?.m || "—"}
                  </p>
                  {word?.e && (
                    <p
                      className="mt-4 max-w-md text-sm leading-relaxed text-muted"
                      data-noi18n
                    >
                      {word.e}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="danger" size="lg" onClick={miss}>
                <IconArrowLeft size={16} className="mr-1.5 inline align-[-2px]" />
                ยังไม่จำ
              </Button>
              <Button variant="success" size="lg" onClick={know}>
                จำได้
                <IconArrowRight size={16} className="ml-1.5 inline align-[-2px]" />
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
              value={poolSizeInput}
              onChange={(e) => {
                const raw = e.target.value;
                setPoolSizeInput(raw);
                if (raw === "") return;
                const parsed = Number(raw);
                if (!Number.isFinite(parsed)) return;
                const n = Math.max(1, Math.min(maxWords, Math.trunc(parsed)));
                setPoolSize(n);
                setMastered((m) => m.filter((i) => i < n));
                setCursor(0);
                store.set({ flashSettings: { ...flashSettings, loopSize: n } });
              }}
              onBlur={() => {
                if (poolSizeInput !== String(poolSize)) setPoolSizeInput(String(poolSize));
              }}
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">เสียงอ่าน</span>
            <select
              value={flashSettings.voiceURI || ""}
              onChange={(e) =>
                store.set({ flashSettings: { ...flashSettings, voiceURI: e.target.value } })
              }
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
            >
              <option value="">ค่าเริ่มต้นของอุปกรณ์</option>
              {voices.map((v) => (
                <option key={v.uri} value={v.uri}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            {voices.length === 0 && (
              <span className="mt-1 block text-xs text-subtle">
                อุปกรณ์นี้ไม่มีเสียงภาษาอังกฤษให้เลือกเพิ่ม
              </span>
            )}
          </label>

          <label className="block">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">ความเร็วเสียง</span>
              <button
                type="button"
                onClick={() => word && say(word.w)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                ทดลองฟัง
              </button>
            </div>
            <select
              value={String(flashSettings.rate ?? 0.9)}
              onChange={(e) =>
                store.set({
                  flashSettings: { ...flashSettings, rate: Number(e.target.value) },
                })
              }
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
            >
              <option value="0.7">ช้ามาก (0.7×)</option>
              <option value="0.8">ช้า (0.8×)</option>
              <option value="0.9">ปกติ (0.9×)</option>
              <option value="1">เร็วขึ้น (1.0×)</option>
              <option value="1.15">เร็ว (1.15×)</option>
            </select>
          </label>

          {(
            [
              ["autoSpeak", "อ่านเสียงอัตโนมัติ"],
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

          <div className="border-t border-line pt-4">
            <Button variant="danger" block onClick={() => void resetMastery()}>
              รีเซ็ตความจำ Flashcard ชุดนี้
            </Button>
            <p className="mt-1.5 text-xs text-subtle">
              คำที่จำแล้วทั้งหมดในชุดนี้จะกลับไปเป็นยังไม่ได้จำ ย้อนกลับไม่ได้
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
