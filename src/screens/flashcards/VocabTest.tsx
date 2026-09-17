import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { masteredWords } from "../../actions/games";
import { PageHeader, Card, Button, Progress, EmptyState, cx, IconArrowLeft } from "../../ui";
import type { Word } from "../../store/types";

// A formal multiple-choice test over words already marked "จำได้" -- unlike
// Match/Crossword/Wordle this isn't a game (no timer, no daily play limit):
// it's a self-assessment, closer in spirit to the Flashcard quiz-check than
// to the minigames.
const MIN_TEST_WORDS = 5;
const TEST_SIZE = 10;

interface Question {
  word: Word;
  choices: string[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(deckWords: Word[], deckId: string): Question[] {
  const pool = shuffle(masteredWords(deckId)).slice(0, TEST_SIZE);
  return pool.map((word) => {
    const seen = new Set([word.m]);
    const distractors = shuffle(
      deckWords.filter((w) => {
        if (seen.has(w.m)) return false;
        seen.add(w.m);
        return true;
      }),
    ).slice(0, 3);
    return { word, choices: shuffle([...distractors.map((w) => w.m), word.m]) };
  });
}

interface Outcome {
  question: Question;
  picked: string;
  correct: boolean;
}

export function VocabTest() {
  const { deckId = "" } = useParams();
  const navigate = useNavigate();
  const deck = useStore((s) => s.decks.find((d) => d.id === deckId));
  const contentLoaded = useStore((s) => s.contentLoaded);

  const [round, setRound] = useState(0);
  const questions = useMemo(
    () => (deck ? buildQuestions(deck.words, deckId) : []),
    // Intentionally NOT reactive to every store change -- masteredWords()
    // reads a fresh snapshot internally, and only deckId/round should
    // trigger a rebuild (matches MatchGame's shuffledTiles pattern).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deckId, round],
  );
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  if (!deck) {
    if (!contentLoaded) {
      return (
        <>
          <PageHeader eyebrow="VOCABULARY TEST" title="กำลังโหลด…" />
          <div className="mx-auto mt-6 h-64 max-w-md animate-pulse rounded-3xl bg-surface-2" />
        </>
      );
    }
    return (
      <>
        <PageHeader eyebrow="VOCABULARY TEST" title="ไม่พบชุดคำศัพท์" />
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
    setPicked(null);
    setOutcomes([]);
    setRound((r) => r + 1);
  };

  if (questions.length < MIN_TEST_WORDS) {
    return (
      <>
        <Button variant="ghost" className="mb-3" onClick={() => navigate(`/flash/deck/${deckId}`)}>
          <IconArrowLeft size={15} className="mr-1.5 inline align-[-2px]" />
          กลับไปที่ชุดคำศัพท์
        </Button>
        <PageHeader eyebrow="VOCABULARY TEST" title={`ทดสอบคำศัพท์ · ${deck.name}`} />
        <EmptyState>
          จำคำศัพท์ในชุดนี้ให้ครบ {MIN_TEST_WORDS} คำก่อนถึงจะทำแบบทดสอบได้
          <div className="mt-3">
            <Button variant="primary" onClick={() => navigate(`/flash/study/${deckId}`)}>
              ไปทวนคำศัพท์
            </Button>
          </div>
        </EmptyState>
      </>
    );
  }

  const pick = (choice: string) => {
    if (picked) return;
    setPicked(choice);
    const q = questions[qIndex];
    window.setTimeout(() => {
      setOutcomes((prev) => [...prev, { question: q, picked: choice, correct: choice === q.word.m }]);
      setPicked(null);
      setQIndex((i) => i + 1);
    }, 700);
  };

  const done = qIndex >= questions.length;

  if (done) {
    const correctCount = outcomes.filter((o) => o.correct).length;
    const percent = Math.round((correctCount / questions.length) * 100);
    const tone = percent >= 80 ? "success" : percent >= 50 ? "warning" : "danger";
    const verdict = percent >= 80 ? "จำแม่นมาก" : percent >= 50 ? "ยังพอไหว" : "ควรทวนซ้ำอีกรอบ";
    const wrong = outcomes.filter((o) => !o.correct);

    return (
      <>
        <Button variant="ghost" className="mb-3" onClick={() => navigate(`/flash/deck/${deckId}`)}>
          <IconArrowLeft size={15} className="mr-1.5 inline align-[-2px]" />
          กลับไปที่ชุดคำศัพท์
        </Button>
        <PageHeader eyebrow="VOCABULARY TEST" title={`ผลทดสอบ · ${deck.name}`} />

        <Card soft className="mb-4 text-center">
          <p
            className={cx(
              "text-4xl font-bold",
              tone === "success" && "text-success",
              tone === "warning" && "text-warning",
              tone === "danger" && "text-danger",
            )}
          >
            {correctCount}/{questions.length}
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
                    {o.question.word.w}
                  </p>
                  <p className="mt-1 text-danger">
                    คุณตอบ: <span data-noi18n>{o.picked}</span>
                  </p>
                  <p className="text-success">
                    ที่ถูกคือ: <span data-noi18n>{o.question.word.m}</span>
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

  const q = questions[qIndex];

  return (
    <>
      <Button variant="ghost" className="mb-3" onClick={() => navigate(`/flash/deck/${deckId}`)}>
        <IconArrowLeft size={15} className="mr-1.5 inline align-[-2px]" />
        ออกจากแบบทดสอบ
      </Button>

      <PageHeader
        eyebrow="VOCABULARY TEST"
        title={`ทดสอบคำศัพท์ · ${deck.name}`}
        description="เลือกความหมายที่ถูกต้องของคำศัพท์"
      />

      <div className="mx-auto max-w-xl">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold tabular-nums">
            ข้อ {qIndex + 1}/{questions.length}
          </span>
          <span className="text-muted">ตอบถูกแล้ว {outcomes.filter((o) => o.correct).length} ข้อ</span>
        </div>
        <Progress value={(qIndex / questions.length) * 100} className="mb-4" />

        <div
          key={qIndex}
          className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-3xl border border-line bg-surface p-8 text-center shadow-card"
        >
          <h2 className="text-4xl font-semibold" data-noi18n>
            {q.word.w}
          </h2>
          {q.word.p && <div className="mt-2 text-sm text-subtle">{q.word.p}</div>}
          <p className="mt-4 text-sm text-muted">คำนี้แปลว่าอะไร?</p>
          <div className="mt-4 grid w-full max-w-sm gap-2">
            {q.choices.map((c) => {
              const isCorrect = c === q.word.m;
              const revealed = picked !== null;
              return (
                <button
                  key={c}
                  type="button"
                  data-noi18n
                  disabled={revealed}
                  onClick={() => pick(c)}
                  className={cx(
                    "rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
                    !revealed && "border-line hover:bg-surface-2",
                    revealed && isCorrect && "border-success bg-success-soft text-success",
                    revealed && !isCorrect && c === picked && "border-danger bg-danger-soft text-danger",
                    revealed && !isCorrect && c !== picked && "border-line opacity-50",
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
