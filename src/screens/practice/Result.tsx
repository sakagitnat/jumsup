import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { attemptStore, useAttempt } from "./session";
import { PageHeader, Card, Tag, Button, cx, toast } from "../../ui";

export function Result() {
  const attempt = useAttempt();
  const navigate = useNavigate();

  useEffect(() => {
    if (!attempt) navigate("/home", { replace: true });
  }, [attempt, navigate]);

  if (!attempt) return null;

  const { questions, answers, kind, set } = attempt;
  const correct = questions.reduce(
    (n, q) => n + (Number(answers[q._attemptKey]) === Number(q.answer) ? 1 : 0),
    0,
  );
  const percent = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  const minutes = Math.max(1, Math.round((Date.now() - attempt.startedAt) / 60000));
  const tone = percent >= 70 ? "success" : percent >= 50 ? "warning" : "danger";
  const verdict =
    percent >= 70 ? "ทำได้ดี" : percent >= 50 ? "ใกล้ถึงเป้าหมาย" : "ควรทบทวน";

  const backToList = () => {
    attemptStore.clear();
    navigate(`/${kind}`);
  };
  const retry = () => {
    attemptStore.clear();
    navigate(`/${kind}`);
    toast("เลือกรอบใหม่จากหน้ารายการ ระบบจะตรวจสิทธิ์ทดลองหรือเวลาพักให้อัตโนมัติ");
  };

  return (
    <>
      <PageHeader
        eyebrow="RESULTS"
        title={set.title}
        description="ตรวจคำตอบและอ่านคำอธิบายก่อนเริ่มรอบใหม่"
      />

      <Card className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className="grid h-24 w-24 shrink-0 place-items-center rounded-full text-center"
          style={{
            background: `conic-gradient(var(--color-primary) ${percent * 3.6}deg, var(--color-surface-2) 0)`,
          }}
        >
          <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-surface">
            <strong className="text-lg">{percent}%</strong>
          </div>
        </div>
        <div>
          <Tag tone={tone}>{verdict}</Tag>
          <h2 className="mt-2 text-lg font-semibold">
            ตอบถูก {correct} จาก {questions.length} ข้อ
          </h2>
          <p className="text-sm text-muted">
            ใช้เวลา {minutes} นาที · ตอบ {Object.keys(answers).length} ข้อ
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" onClick={retry}>
              ทำอีกครั้ง
            </Button>
            <Button onClick={backToList}>กลับไปเลือกชุด</Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {questions.map((q, i) => {
          const chosen = answers[q._attemptKey];
          const ok = Number(chosen) === Number(q.answer);
          return (
            <Card
              key={q._attemptKey}
              className={cx(
                "border-l-4",
                ok ? "border-l-success" : "border-l-danger",
              )}
            >
              <div className="flex items-start gap-2">
                <span className="text-sm font-bold text-subtle">{i + 1}</span>
                <b className="flex-1 text-sm">{q.prompt}</b>
                <em
                  className={cx(
                    "text-xs font-bold not-italic",
                    ok ? "text-success" : "text-danger",
                  )}
                >
                  {ok ? "ถูก" : "ผิด"}
                </em>
              </div>
              <p className="mt-2 text-sm text-muted">
                คำตอบของคุณ:{" "}
                {chosen === undefined ? "ไม่ได้ตอบ" : q.choices?.[chosen] || ""}
              </p>
              {!ok && (
                <p className="text-sm text-muted">
                  คำตอบที่ถูก: <b className="text-text">{q.choices?.[q.answer ?? -1] || ""}</b>
                </p>
              )}
              <p className="mt-1 text-xs text-subtle">
                {q.explanation || "ตรวจจากใจความ ไวยากรณ์ และบริบทของคำถาม"}
              </p>
            </Card>
          );
        })}
      </div>
    </>
  );
}
