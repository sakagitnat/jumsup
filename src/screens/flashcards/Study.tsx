import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { speak } from "../../lib/utils.js";
import { useStore, store } from "../../store/useStore";
import { markWordMastered } from "../../actions/flashcards";
import { PageHeader, Card, Tag, Button, Progress, Modal, Switch, EmptyState, toast } from "../../ui";

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

  const pool = Math.min(poolSize, deck?.words.length ?? 0);
  const activeIndices = useMemo(() => Array.from({ length: pool }, (_, i) => i), [pool]);
  const remaining = activeIndices.filter((i) => !mastered.includes(i));
  const idx = remaining.length ? remaining[cursor % remaining.length] : -1;
  const word = idx >= 0 ? deck?.words[idx] : undefined;

  useEffect(() => {
    if (word && flashSettings.autoSpeak) speak(word.w);
  }, [word, flashSettings.autoSpeak]);

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
      if (e.key === "ArrowRight") {
        e.preventDefault();
        void know();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        miss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [know, miss]);

  // swipe
  const cardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; dx: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { x: e.clientX, dx: 0 };
    cardRef.current?.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current.dx = e.clientX - drag.current.x;
    if (cardRef.current)
      cardRef.current.style.transform = `translateX(${drag.current.dx}px) rotate(${drag.current.dx / 25}deg)`;
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (cardRef.current) cardRef.current.style.transform = "";
    if (!d) return;
    if (Math.abs(d.dx) > 90) (d.dx > 0 ? know() : miss());
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
            description="ปัดซ้าย = ยังไม่จำ · ปัดขวา = จำได้ (หรือใช้ปุ่มลูกศร)"
            actions={
              <Button size="sm" onClick={() => setSettingsOpen(true)}>
                ⚙ ตั้งค่า
              </Button>
            }
          />

          <div className="mx-auto max-w-xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Tag tone="info">Loop {pool}</Tag>
              <Tag tone="success">จำแล้ว {pool - remaining.length}/{pool}</Tag>
              <Tag tone="warning">เหลือ {remaining.length}</Tag>
            </div>
            <Progress value={((pool - remaining.length) / pool) * 100} className="mb-4" />

            <div
              ref={cardRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="flex min-h-[300px] touch-pan-y flex-col items-center justify-center rounded-3xl border border-line bg-surface p-8 text-center shadow-card"
            >
              <div className="mb-3 flex gap-2 self-end">
                <button
                  type="button"
                  aria-label="ฟังเสียง"
                  onClick={() => word && speak(word.w)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:bg-surface-2"
                >
                  🔊
                </button>
              </div>
              <Tag tone="danger">คำที่ {idx + 1}</Tag>
              <h2 className="mt-3 text-4xl font-semibold">{word?.w}</h2>
              {(word?.stress || word?.p) && (
                <div className="mt-2 text-sm text-subtle">{word?.stress || word?.p}</div>
              )}
              {flashSettings.showMeaning && word?.m && (
                <div className="mt-4 text-lg">{word.m}</div>
              )}
              {word?.e && (
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{word.e}</p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="danger" onClick={miss}>
                ← ยังไม่จำ
              </Button>
              <Button variant="success" onClick={know}>
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
