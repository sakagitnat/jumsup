import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { masteredWords, awardGameXp } from "../../actions/games";
import { PageHeader, Card, Button, EmptyState, cx, toast, IconArrowLeft } from "../../ui";
import type { Word } from "../../store/types";

const MAX_ATTEMPTS = 6;
const MIN_LEN = 4;
const MAX_LEN = 8;
const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

type LetterStatus = "correct" | "present" | "absent";

function evaluate(guess: string, target: string): LetterStatus[] {
  const result: LetterStatus[] = new Array(guess.length).fill("absent");
  const used = new Array(target.length).fill(false);
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === target[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "correct") continue;
    const idx = target.split("").findIndex((c, j) => c === guess[i] && !used[j]);
    if (idx !== -1) {
      result[i] = "present";
      used[idx] = true;
    }
  }
  return result;
}

const tileClass: Record<LetterStatus | "empty" | "typing", string> = {
  correct: "border-transparent bg-success text-white",
  present: "border-transparent bg-warning text-white",
  absent: "border-transparent bg-surface-2 text-subtle",
  typing: "border-line-strong bg-surface text-text",
  empty: "border-line bg-surface text-text",
};

const keyClass: Record<LetterStatus | "unknown", string> = {
  correct: "bg-success text-white",
  present: "bg-warning text-white",
  absent: "bg-surface-2 text-subtle",
  unknown: "bg-surface border border-line text-text hover:bg-surface-2",
};

export function WordleGame() {
  const { deckId = "" } = useParams();
  const navigate = useNavigate();
  const deck = useStore((s) => s.decks.find((d) => d.id === deckId));
  const contentLoaded = useStore((s) => s.contentLoaded);

  const [round, setRound] = useState(0);
  const target = useMemo<Word | undefined>(
    () => masteredWords(deckId).find((w) => /^[a-z]+$/i.test(w.w) && w.w.length >= MIN_LEN && w.w.length <= MAX_LEN),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deckId, round],
  );

  const [submitted, setSubmitted] = useState<{ letters: string[]; statuses: LetterStatus[] }[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");

  useEffect(() => {
    setSubmitted([]);
    setCurrent("");
    setStatus("playing");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, round]);

  const wordLen = target?.w.length ?? 0;
  const answer = target?.w.toUpperCase() ?? "";

  const pressLetter = (ch: string) => {
    if (status !== "playing") return;
    setCurrent((c) => (c.length < wordLen ? c + ch : c));
  };
  const pressBackspace = () => {
    if (status !== "playing") return;
    setCurrent((c) => c.slice(0, -1));
  };
  const pressEnter = () => {
    if (status !== "playing") return;
    if (current.length < wordLen) {
      toast("พิมพ์คำให้ครบก่อน");
      return;
    }
    const statuses = evaluate(current, answer);
    const next = [...submitted, { letters: current.split(""), statuses }];
    setSubmitted(next);
    setCurrent("");
    if (current === answer) {
      setStatus("won");
      toast(`ถูกต้อง! ทาย ${next.length} ครั้ง`);
      void awardGameXp("wordle");
    } else if (next.length >= MAX_ATTEMPTS) {
      setStatus("lost");
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === "Enter") {
        e.preventDefault();
        pressEnter();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        pressBackspace();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        pressLetter(e.key.toUpperCase());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!deck && !contentLoaded) {
    return (
      <>
        <PageHeader eyebrow="VOCABULARY GAME" title="กำลังโหลด…" />
        <div className="mx-auto mt-6 h-48 max-w-md animate-pulse rounded-3xl bg-surface-2" />
      </>
    );
  }

  if (!deck || !target) {
    return (
      <>
        <PageHeader eyebrow="VOCABULARY GAME" title="ยังเล่น Wordle ไม่ได้" />
        <EmptyState>
          ต้องมีคำที่จำแล้วอย่างน้อย 1 คำ ความยาว {MIN_LEN}-{MAX_LEN} ตัวอักษร (ภาษาอังกฤษล้วน) —
          จำคำเพิ่มแล้วลองอีกครั้ง
          <div className="mt-3">
            <Button variant="primary" onClick={() => navigate(`/flash/deck/${deckId}`)}>
              กลับหน้าเลือกชุด
            </Button>
          </div>
        </EmptyState>
      </>
    );
  }

  // Best-known status per letter across all guesses, for coloring the
  // on-screen keyboard (correct beats present beats absent).
  const keyStatus: Record<string, LetterStatus> = {};
  const rank: Record<LetterStatus, number> = { absent: 0, present: 1, correct: 2 };
  for (const g of submitted) {
    g.letters.forEach((ch, i) => {
      const s = g.statuses[i];
      if (!keyStatus[ch] || rank[s] > rank[keyStatus[ch]]) keyStatus[ch] = s;
    });
  }

  const rows = Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
    if (i < submitted.length) return submitted[i];
    if (i === submitted.length && status === "playing") {
      return { letters: current.split(""), statuses: [] as LetterStatus[] };
    }
    return null;
  });

  return (
    <>
      <Button variant="ghost" className="mb-3" onClick={() => navigate(`/flash/deck/${deckId}`)}>
        <IconArrowLeft size={15} className="mr-1.5 inline align-[-2px]" />
        ออกจากเกม
      </Button>
      <PageHeader
        eyebrow="VOCABULARY GAME"
        title={`Wordle · ${deck.name}`}
        description={`ทายคำศัพท์ ${wordLen} ตัวอักษรจากคำที่จำแล้ว ภายใน ${MAX_ATTEMPTS} ครั้ง`}
      />
      <Card className="mx-auto max-w-sm">
        <div className="mx-auto flex flex-col gap-1.5">
          {rows.map((row, i) => (
            <div key={i} className="flex justify-center gap-1.5">
              {Array.from({ length: wordLen }, (_, c) => {
                const ch = row?.letters[c];
                const st = row?.statuses[c];
                return (
                  <div
                    key={c}
                    className={cx(
                      "grid h-11 w-11 place-items-center rounded-lg border text-lg font-bold uppercase",
                      st ? tileClass[st] : ch ? tileClass.typing : tileClass.empty,
                    )}
                  >
                    {ch}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {status !== "playing" && (
          <div className="mt-4 rounded-xl bg-surface-2 p-3 text-center text-sm">
            {status === "won" ? (
              <p className="font-semibold text-success">ถูกต้อง! 🎉</p>
            ) : (
              <p className="font-semibold text-danger">หมดโอกาสแล้ว คำตอบคือ {answer}</p>
            )}
            <p className="mt-1 text-muted" data-noi18n>
              {target.w} = {target.m}
            </p>
            <Button
              variant="primary"
              className="mt-3"
              onClick={() => setRound((r) => r + 1)}
            >
              เล่นคำใหม่
            </Button>
          </div>
        )}

        <div className="mt-5 space-y-1.5">
          {KEY_ROWS.map((row, i) => (
            <div key={i} className="flex justify-center gap-1">
              {i === 2 && (
                <button
                  type="button"
                  onClick={pressEnter}
                  className="rounded-lg bg-surface-2 px-2 text-xs font-semibold hover:bg-line"
                >
                  ENTER
                </button>
              )}
              {row.split("").map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => pressLetter(ch)}
                  className={cx(
                    "h-10 w-7 rounded-lg text-sm font-bold sm:w-8",
                    keyClass[keyStatus[ch] || "unknown"],
                  )}
                >
                  {ch}
                </button>
              ))}
              {i === 2 && (
                <button
                  type="button"
                  onClick={pressBackspace}
                  className="rounded-lg bg-surface-2 px-2 text-xs font-semibold hover:bg-line"
                >
                  ⌫
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
