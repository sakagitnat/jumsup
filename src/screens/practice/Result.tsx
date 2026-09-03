import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { attemptStore, useAttempt } from "./session";
import { useStore } from "../../store/useStore";
import { isPro } from "../../lib/entitlements.js";
import { PageHeader, Card, Tag, Button, cx, toast, IconBolt, IconArrowRight } from "../../ui";

const KIND_LABEL: Record<string, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  mock: "Mock Exam",
};

export function Result() {
  const attempt = useAttempt();
  const navigate = useNavigate();
  const { profile, subscription } = useStore((s) => ({
    profile: s.profile,
    subscription: s.subscription,
  }));
  const pro = isPro({ profile, subscription });

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
  const shareResult = async () => {
    const link = `${location.origin}/?ref=${profile?.referral_code || ""}`.replace(/\?ref=$/, "");
    const text = `ผมได้ ${percent}% (${correct}/${questions.length}) ใน ${
      KIND_LABEL[kind] || kind
    } บน Jumsup มาลองกัน`;
    try {
      if (navigator.share) await navigator.share({ text, url: link });
      else {
        await navigator.clipboard.writeText(`${text}\n${link}`);
        toast("คัดลอกผลและลิงก์แล้ว");
      }
    } catch {
      /* user cancelled */
    }
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
            <Button onClick={shareResult}>แชร์ผล</Button>
          </div>
        </div>
      </Card>

      {!pro && (
        <Link
          to="/pricing"
          className="mb-5 flex items-center gap-2 rounded-xl border border-primary-border bg-primary-soft px-4 py-3 text-sm font-medium text-primary transition hover:brightness-95"
        >
          <IconBolt size={14} className="shrink-0" />
          <span className="min-w-0 flex-1">
            Pro ฝึก Reading / Listening / Writing / Mock ได้ไม่จำกัด + วิเคราะห์จุดอ่อนแบบละเอียด
          </span>
          <IconArrowRight size={14} className="shrink-0" />
        </Link>
      )}

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
