import { useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "../../store/useStore";
import { translateWord, addWordToDeck } from "../../actions/translate";
import { cx, IconClose } from "../../ui";

function tokens(text: string): string[] {
  return text.split(/(\s+|[,.!?;:()"“”]+)/);
}

interface Popover {
  word: string;
  x: number;
  y: number;
  loading: boolean;
  meaning: string;
  saved: boolean;
}

export function WordText({ text }: { text: string }) {
  const decks = useStore((s) => s.decks);
  const user = useStore((s) => s.user);
  const [pop, setPop] = useState<Popover | null>(null);
  const [deckId, setDeckId] = useState(decks[0]?.id ?? "");

  const open = async (e: React.MouseEvent<HTMLSpanElement>, raw: string) => {
    const word = raw.toLowerCase().replace(/[^a-z-]/g, "");
    if (!word) return;
    const r = e.currentTarget.getBoundingClientRect();
    setPop({
      word,
      x: Math.min(r.left, window.innerWidth - 300),
      y: r.bottom + 8,
      loading: true,
      meaning: "",
      saved: false,
    });
    if (!user) {
      setPop((p) => (p ? { ...p, loading: false, meaning: "เข้าสู่ระบบเพื่อแปลและบันทึกคำศัพท์" } : p));
      return;
    }
    try {
      const meaning = await translateWord(word);
      setPop((p) =>
        p ? { ...p, loading: false, meaning: meaning || "ยังไม่พบคำแปล — เพิ่มคำไว้แล้วเติมความหมายภายหลังได้" } : p,
      );
    } catch (err) {
      setPop((p) => (p ? { ...p, loading: false, meaning: (err as Error).message || "แปลไม่สำเร็จ" } : p));
    }
  };

  return (
    <>
      <p className="text-[15px] leading-8">
        {tokens(text).map((tok, i) => {
          const key = tok.toLowerCase().replace(/[^a-z-]/g, "");
          if (!key) return <span key={i}>{tok}</span>;
          return (
            <span
              key={i}
              onClick={(e) => open(e, tok)}
              className="cursor-pointer rounded-sm hover:bg-warning-soft"
            >
              {tok}
            </span>
          );
        })}
      </p>

      {pop &&
        createPortal(
          <div
            className="fixed inset-0 z-50"
            onClick={() => setPop(null)}
          >
            <aside
              role="dialog"
              aria-label={`คำแปล ${pop.word}`}
              onClick={(e) => e.stopPropagation()}
              style={{ left: pop.x, top: Math.min(pop.y, window.innerHeight - 220) }}
              className="absolute w-[280px] rounded-2xl border border-line bg-surface p-4 shadow-pop"
            >
              <div className="flex items-start justify-between">
                <strong className="text-lg">{pop.word}</strong>
                <button
                  type="button"
                  aria-label="ปิด"
                  onClick={() => setPop(null)}
                  className="text-muted hover:text-text"
                >
                  <IconClose size={15} />
                </button>
              </div>
              <p className="mt-1 min-h-[2.5rem] text-sm text-muted">
                {pop.loading ? "กำลังค้นหาคำแปล…" : pop.meaning}
              </p>
              {user && (
                <>
                  <label className="mt-2 block text-xs text-muted">
                    บันทึกลงชุด
                    <select
                      value={deckId}
                      onChange={(e) => setDeckId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
                    >
                      {decks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={pop.loading || pop.saved}
                    onClick={() => {
                      if (addWordToDeck(deckId, pop.word, pop.meaning)) {
                        setPop((p) => (p ? { ...p, saved: true } : p));
                        setTimeout(() => setPop(null), 600);
                      }
                    }}
                    className={cx(
                      "mt-2 w-full rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary disabled:opacity-50",
                    )}
                  >
                    {pop.saved ? "เพิ่มแล้ว" : "+ เพิ่มเข้า Flashcard"}
                  </button>
                </>
              )}
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
