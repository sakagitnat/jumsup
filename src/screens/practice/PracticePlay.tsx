import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAttempt, type PracticeKind } from "./session";
import { useExamTimer } from "./useExamTimer";
import { QuestionBlock } from "./QuestionBlock";
import { WordText } from "./WordText";
import { submitPracticeUsage } from "../../actions/practice";
import { speakScript, pauseSpeech, resumeSpeech, stopSpeech } from "./tts";
import { Button, Card, Tag, cx } from "../../ui";
import type { PracticeSection } from "../../store/types";

const kindMeta: Record<PracticeKind, { eyebrow: string; title: string }> = {
  reading: { eyebrow: "SECTION II", title: "Reading Skill" },
  listening: { eyebrow: "SECTION I", title: "Listening & Speaking" },
  writing: { eyebrow: "SECTION III", title: "Writing Skill" },
  mock: { eyebrow: "FULL SIMULATION", title: "Mock Exam" },
};

function paragraphs(text: string) {
  return text
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function SectionText({ text, tappable }: { text: string; tappable?: boolean }) {
  return (
    <div className="space-y-3 text-[15px] leading-8 text-text">
      {paragraphs(text).map((p, i) =>
        tappable ? <WordText key={i} text={p} /> : <p key={i}>{p}</p>,
      )}
    </div>
  );
}

export function PracticePlay({ kind }: { kind: PracticeKind }) {
  const attempt = useAttempt();
  const navigate = useNavigate();
  const [accent, setAccent] = useState("en-GB");
  const [rate, setRate] = useState("0.9");

  const endsAt = attempt?.endsAt ?? 0;

  useEffect(() => {
    if (!attempt) navigate(`/${kind}`, { replace: true });
    return () => stopSpeech();
  }, [attempt, kind, navigate]);

  const doSubmit = () => {
    stopSpeech();
    submitPracticeUsage();
    navigate("/practice/result");
  };

  const timer = useExamTimer(endsAt, () => {
    if (attempt) doSubmit();
  });

  const sections: PracticeSection[] = useMemo(() => {
    if (!attempt) return [];
    return attempt.set.sections?.length
      ? attempt.set.sections
      : [{ title: attempt.set.title, text: attempt.set.text, questions: [] }];
  }, [attempt]);

  const offsets = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (const s of sections) {
      out.push(acc);
      acc += s.questions?.length ?? 0;
    }
    return out;
  }, [sections]);

  if (!attempt) return null;

  const meta = kindMeta[kind];
  const total = attempt.questions.length;
  const answered = Object.keys(attempt.answers).length;
  const fullScript = sections
    .map((s) => `${s.title || ""}. ${s.script || s.context || ""}`)
    .join(" ");

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate(`/${kind}`)}>
          ← ออกจากแบบฝึก
        </Button>
        <div
          className={cx(
            "rounded-xl border px-3 py-1.5 text-sm font-bold tabular-nums",
            timer.warning
              ? "border-danger bg-danger-soft text-danger"
              : "border-line bg-surface text-muted",
          )}
        >
          เวลาคงเหลือ {timer.label}
        </div>
      </div>

      <div className="mb-5 border-b border-line pb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-subtle">
          {meta.eyebrow}
        </p>
        <h1 className="text-2xl font-semibold">{meta.title}</h1>
        <p className="mt-1 text-sm text-muted">{attempt.set.title}</p>
      </div>

      {kind === "listening" && (
        <Card soft className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => speakScript(fullScript, accent, rate)}>
              ▶ ฟังทั้งหมด
            </Button>
            <Button size="sm" onClick={pauseSpeech}>
              ‖ พัก
            </Button>
            <Button size="sm" onClick={resumeSpeech}>
              ▶ ต่อ
            </Button>
            <Button size="sm" onClick={stopSpeech}>
              ■ หยุด
            </Button>
            <label className="ml-2 text-xs text-muted">
              สำเนียง{" "}
              <select
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="rounded-lg border border-line bg-surface px-2 py-1"
              >
                <option value="en-US">US</option>
                <option value="en-GB">UK</option>
              </select>
            </label>
            <label className="text-xs text-muted">
              ความเร็ว{" "}
              <select
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="rounded-lg border border-line bg-surface px-2 py-1"
              >
                <option value="0.8">0.8×</option>
                <option value="0.9">0.9×</option>
                <option value="1">1×</option>
                <option value="1.15">1.15×</option>
              </select>
            </label>
          </div>
        </Card>
      )}

      {kind === "mock" && (
        <Card soft className="mb-4">
          <b className="text-sm">Parallel practice</b>
          <p className="text-sm text-muted">
            โจทย์ทั้งหมดเป็นเนื้อหาที่ Jumsup เขียนขึ้นใหม่ ไม่ใช่ข้อสอบจริง
          </p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-6">
          {sections.map((section, si) => {
            const start = offsets[si];
            const sectionQuestions = attempt.questions.slice(
              start,
              start + (section.questions?.length ?? 0),
            );
            const body = section.statements?.length
              ? null
              : section.text || section.passage || section.context || "";
            return (
              <Card key={si}>
                <div className="mb-3">
                  <Tag tone="info">PART {si + 1}</Tag>
                  <h2 className="mt-2 text-lg font-semibold">
                    {section.title || section.category || meta.title}
                  </h2>
                  {section.situation && (
                    <p className="text-sm text-muted">{section.situation}</p>
                  )}
                  {section.directions && (
                    <p className="text-sm text-muted">{section.directions}</p>
                  )}
                </div>

                {kind === "listening" && (section.script || section.context) && (
                  <div className="mb-4 space-y-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => speakScript(section.script || section.context || "", accent, rate)}
                    >
                      ▶ ฟังส่วนนี้
                    </Button>
                    <details className="rounded-xl border border-line bg-surface-2 p-3 text-sm">
                      <summary className="cursor-pointer font-semibold">
                        เปิด Transcript
                      </summary>
                      <p className="mt-2 whitespace-pre-line text-muted">
                        {section.script || section.context}
                      </p>
                    </details>
                  </div>
                )}

                {section.statements?.length ? (
                  <div className="mb-4 space-y-1 text-sm">
                    {section.statements.map((x, i) => (
                      <p key={i}>
                        <b>{String.fromCharCode(65 + i)}.</b> {x}
                      </p>
                    ))}
                  </div>
                ) : kind !== "listening" && body ? (
                  <div className="mb-4">
                    <SectionText text={body} tappable={kind === "reading"} />
                  </div>
                ) : null}

                {sectionQuestions.map((q, i) => (
                  <QuestionBlock key={q._attemptKey} q={q} index={start + i} />
                ))}
              </Card>
            );
          })}
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <Card className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">ตอบแล้ว</span>
              <b className="tabular-nums">
                {answered}/{total}
              </b>
            </div>
            {kind === "mock" && (
              <div className="grid grid-cols-8 gap-1">
                {attempt.questions.map((q, i) => (
                  <a
                    key={q._attemptKey}
                    href={`#${q._attemptKey}`}
                    className={cx(
                      "grid aspect-square place-items-center rounded-md border text-[10px]",
                      attempt.answers[q._attemptKey] != null
                        ? "border-primary-border bg-primary-soft text-primary"
                        : "border-line",
                    )}
                  >
                    {i + 1}
                  </a>
                ))}
              </div>
            )}
            <Button
              variant={kind === "mock" ? "danger" : "primary"}
              block
              onClick={doSubmit}
            >
              {kind === "mock" ? "ส่งข้อสอบ" : "ส่งคำตอบ"}
            </Button>
          </Card>
        </aside>
      </div>
    </>
  );
}
