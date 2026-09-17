import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { masteredWords } from "../../actions/games";
import { PageHeader, Card, Button, Progress, EmptyState, cx, IconArrowLeft } from "../../ui";
import type { Word } from "../../store/types";

// Same "already-mastered words only" self-assessment as VocabTest, but the
// learner types the Thai meaning instead of picking it from choices -- a
// heavier recall check than a multiple-choice tap, since guessing doesn't
// work. Answer checking tolerates a single-character typo (edit distance 1)
// so a stray keystroke doesn't fail an otherwise-correct answer.
const MIN_DRILL_WORDS = 5;
const DRILL_SIZE = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildWords(deckId: string): Word[] {
  return shuffle(masteredWords(deckId)).slice(0, DRILL_SIZE);
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, "");
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...new Array(b.length).fill(0),
  ]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function isCloseEnough(typed: string, target: string): boolean {
  const a = normalize(typed);
  const b = normalize(target);
  if (!a) return false;
  if (a === b) return true;
  return levenshtein(a, b) <= 1;
}

interface Outcome {
  word: Word;
  typed: string;
  correct: boolean;
}

export function TypingDrill() {
  const { deckId = "" } = useParams();
  const navigate = useNavigate();
  const deck = useStore((s) => s.decks.find((d) => d.id === deckId));
  const contentLoaded = useStore((s) => s.contentLoaded);

  const [round, setRound] = useState(0);
  const words = useMemo(
    () => (deck ? buildWords(deckId) : []),
    // Intentionally NOT reactive to every store change -- masteredWords()
    // reads a fresh snapshot internally, and only deckId/round should
    // trigger a rebuild (matches VocabTest's/MatchGame's pattern).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deckId, round],
  );
  const [qIndex, setQIndex] = useState(0);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState<Outcome | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  if (!deck) {
    if (!contentLoaded) {
      return (
        <>
          <PageHeader eyebrow="TYPING DRILL" title="กำลังโหลด…" />
          <div className="mx-auto mt-6 h-64 max-w-md animate-pulse rounded-3xl bg-surface-2" />
        </>
      );
    }
    return (
      <>
        <PageHeader eyebrow="TYPING DRILL" title="ไม่พบชุดคำศัพท์" />
        <EmptyState>
          <Button variant="primary" onClick={() => navigate("/flash")}>
            กลับหน้าเลือกชุด
          </Button>
        </EmptyState>
      </>
    );
  }

  const restart = () => {
    setQIndex(0);
    setInput("");
    setRevealed(null);
    setOutcomes([]);
    setRound((r) => r + 1);
  };

  if (words.length < MIN_DRILL_WORDS) {
    return (
      <>
        <Button variant="ghost" className="mb-3" onClick={() => navigate(`/flash/deck/${deckId}`)}>
          <IconArrowLeft size={15} className="mr-1.5 inline align-[-2px]" />
          กลับไปที่ชุดคำศัพท์
        </Button>
        <PageHeader eyebrow="TYPING DRILL" title={`พิมพ์คำตอบ · ${deck.name}`} />
        <EmptyState>
          จำคำศัพท์ในชุดนี้ให้ครบ {MIN_DRILL_WORDS} คำก่อนถึงจะทำแบบฝึกนี้ได้
          <div className="mt-3">
            <Button variant="primary" onClick={() => navigate(`/flash/study/${deckId}`)}>
              ไปทวนคำศัพท์
            </Button>
          </div>
        </EmptyState>
      </>
    );
  }

  const submit = () => {
    if (revealed) return;
    if (!normalize(input)) return;
    const word = words[qIndex];
    const outcome: Outcome = { word, typed: input, correct: isCloseEnough(input, word.m) };
    setRevealed(outcome);
    window.setTimeout(() => {
      setOutcomes((prev) => [...prev, outcome]);
      setRevealed(null);
      setInput("");
      setQIndex((i) => i + 1);
    }, 1100);
  };

  const done = qIndex >= words.length;

  if (done) {
    const correctCount = outcomes.filter((o) => o.correct).length;
    const percent = Math.round((correctCount / words.length) * 100);
    const tone = percent >= 80 ? "success" : percent >= 50 ? "warning" : "danger";
    const verdict = percent >= 80 ? "จำแม่นมาก" : percent >= 50 ? "ยังพอไหว" : "ควรทวนซ้ำอีกรอบ";
    const wrong = outcomes.filter((o) => !o.correct);

    return (
      <>
        <Button variant="ghost" className="mb-3" onClick={() => navigate(`/flash/deck/${deckId}`)}>
          <IconArrowLeft size={15} className="mr-1.5 inline align-[-2px]" />
          กลับไปที่ชุดคำศัพท์
        </Button>
        <PageHeader eyebrow="TYPING DRILL" title={`ผลแบบฝึก · ${deck.name}`} />

        <Card soft className="mb-4 text-center">
          <p
            className={cx(
              "text-4xl font-bold",
              tone === "success" && "text-success",
              tone === "warning" && "text-warning",
              tone === "danger" && "text-danger",
            )}
          >
            {correctCount}/{words.length}
          </p>
          <p className="mt-1 text-sm text-muted">
            {percent}% ถูก · {verdict}
          </p>
        </Card>

        {wrong.length > 0 && (
          <>
            <h3 className="mb-2 text-sm font-semibold text-muted">คำที่ตอบผิด ({wrong.length})</h3>
            <div className="mb-4 flex flex-col gap-2">
              {wrong.map((o, i) => (
                <Card key={i} className="text-sm">
                  <p className="font-semibold" data-noi18n>
                    {o.word.w}
                  </p>
                  <p className="mt-1 text-danger">
                    คุณตอบ: <span data-noi18n>{o.typed || "—"}</span>
                  </p>
                  <p className="text-success">
                    ที่ถูกคือ: <span data-noi18n>{o.word.m}</span>
                  </p>
                </Card>
              ))}
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={restart}>
            ทำอีกครั้ง
          </Button>
          <Button onClick={() => navigate(`/flash/deck/${deckId}`)}>กลับไปที่ชุดคำศัพท์</Button>
        </div>
      </>
    );
  }

  const word = words[qIndex];

  return (
    <>
      <Button variant="ghost" className="mb-3" onClick={() => navigate(`/flash/deck/${deckId}`)}>
        <IconArrowLeft size={15} className="mr-1.5 inline align-[-2px]" />
        ออกจากแบบฝึก
      </Button>

      <PageHeader
        eyebrow="TYPING DRILL"
        title={`พิมพ์คำตอบ · ${deck.name}`}
        description="พิมพ์คำแปลภาษาไทยของคำศัพท์นี้ให้ถูกต้อง"
      />

      <div className="mx-auto max-w-xl">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold tabular-nums">
            ข้อ {qIndex + 1}/{words.length}
          </span>
          <span className="text-muted">ตอบถูกแล้ว {outcomes.filter((o) => o.correct).length} ข้อ</span>
        </div>
        <Progress value={(qIndex / words.length) * 100} className="mb-4" />

        <div
          key={qIndex}
          className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-3xl border border-line bg-surface p-8 text-center shadow-card"
        >
          <h2 className="text-4xl font-semibold" data-noi18n>
            {word.w}
          </h2>
          {word.p && <div className="mt-2 text-sm text-subtle">{word.p}</div>}
          <p className="mt-4 text-sm text-muted">คำนี้แปลว่าอะไร?</p>

          <form
            className="mt-4 flex w-full max-w-sm flex-col items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              autoFocus
              type="text"
              value={revealed ? revealed.typed : input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!!revealed}
              placeholder="พิมพ์คำแปลภาษาไทย…"
              data-noi18n
              className={cx(
                "w-full rounded-xl border bg-surface-2 px-4 py-3 text-center text-lg font-medium outline-none",
                !revealed && "border-line focus:border-primary",
                revealed && revealed.correct && "border-success",
                revealed && !revealed.correct && "border-danger",
              )}
            />
            {revealed && !revealed.correct && (
              <p className="text-sm text-danger" data-noi18n>
                คำตอบที่ถูกคือ {word.m}
              </p>
            )}
            {revealed && revealed.correct && <p className="text-sm text-success">ถูกต้อง!</p>}
            {!revealed && <p className="text-xs text-subtle">ระบบยอมรับตัวสะกดที่ใกล้เคียงคำตอบที่ถูกต้อง</p>}
            <Button type="submit" variant="primary" block disabled={!!revealed || !normalize(input)}>
              ตรวจคำตอบ
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
