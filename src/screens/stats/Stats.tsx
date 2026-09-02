import { Link } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { PageHeader, Card, Progress, Tag, EmptyState } from "../../ui";
import type { PracticeAttempt } from "../../store/types";

const KIND_LABEL: Record<PracticeAttempt["kind"], string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  mock: "Mock",
};

function scoreTone(percent: number): "success" | "warning" | "danger" {
  return percent >= 70 ? "success" : percent >= 50 ? "warning" : "danger";
}

function scoreColor(percent: number): string {
  if (percent >= 70) return "var(--color-success)";
  if (percent >= 50) return "var(--color-warning)";
  return "var(--color-danger)";
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function AttemptChart({ attempts }: { attempts: PracticeAttempt[] }) {
  // attempts arrive newest-first; show the last 20 oldest -> newest.
  const data = attempts.slice(0, 20).reverse();
  const W = 320;
  const H = 120;
  const gap = 4;
  const barW = (W - gap * (data.length - 1)) / data.length;

  return (
    <svg
      viewBox={`0 -12 ${W} ${H + 30}`}
      className="w-full"
      role="img"
      aria-label="กราฟคะแนนย้อนหลัง"
    >
      {[0, 50, 100].map((line) => {
        const y = H - (line / 100) * H;
        return (
          <g key={line}>
            <line
              x1={0}
              y1={y}
              x2={W}
              y2={y}
              stroke="var(--color-border)"
              strokeWidth={1}
              strokeDasharray={line === 0 ? "" : "3 3"}
            />
            <text x={W} y={y - 2} textAnchor="end" fontSize={8} fill="var(--color-subtle)">
              {line}%
            </text>
          </g>
        );
      })}
      {data.map((a, i) => {
        const h = Math.max(2, (a.percent / 100) * H);
        const x = i * (barW + gap);
        return (
          <g key={a.id}>
            <rect
              x={x}
              y={H - h}
              width={barW}
              height={h}
              rx={2}
              fill={scoreColor(a.percent)}
            >
              <title>{`${KIND_LABEL[a.kind]} · ${a.title} · ${a.percent}% · ${shortDate(a.takenAt)}`}</title>
            </rect>
          </g>
        );
      })}
    </svg>
  );
}

export function Stats() {
  const { xp, streak, decks, progress, practiceHistory } = useStore((s) => ({
    xp: s.xp,
    streak: s.streak,
    decks: s.decks,
    progress: s.progress,
    practiceHistory: s.practiceHistory,
  }));

  const level = Math.floor((xp || 0) / 250) + 1;
  const xpIntoLevel = (xp || 0) % 250;

  const perDeck = decks
    .map((d) => {
      const mastered = (progress[d.id]?.mastered ?? []).filter((i) => i < d.words.length);
      return {
        id: d.id,
        name: d.name,
        total: d.words.length,
        mastered: mastered.length,
        weak: d.words
          .map((w, i) => ({ w, i }))
          .filter(({ i }) => !mastered.includes(i))
          .slice(0, 6),
      };
    })
    .filter((d) => d.total > 0);

  const totalWords = perDeck.reduce((n, d) => n + d.total, 0);
  const totalMastered = perDeck.reduce((n, d) => n + d.mastered, 0);

  const history = practiceHistory ?? [];
  const kindStats = (["reading", "listening", "writing", "mock"] as const)
    .map((kind) => {
      const rows = history.filter((a) => a.kind === kind);
      if (!rows.length) return null;
      const avg = Math.round(rows.reduce((n, a) => n + a.percent, 0) / rows.length);
      const best = Math.max(...rows.map((a) => a.percent));
      return { kind, count: rows.length, avg, best };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <>
      <PageHeader
        eyebrow="PROGRESS"
        title="สถิติการเรียน"
        description="ภาพรวมความก้าวหน้าและคำที่ยังต้องทบทวน"
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        <Card>
          <Tag tone="info">LEVEL</Tag>
          <h3 className="mt-2 text-xl font-semibold">{level}</h3>
          <Progress value={(xpIntoLevel / 250) * 100} className="mt-2" />
          <p className="mt-1 text-xs text-muted">{xpIntoLevel}/250 XP สู่เลเวลถัดไป</p>
        </Card>
        <Card>
          <Tag tone="info">XP รวม</Tag>
          <h3 className="mt-2 text-xl font-semibold">{(xp || 0).toLocaleString()}</h3>
        </Card>
        <Card>
          <Tag tone="success">STREAK</Tag>
          <h3 className="mt-2 text-xl font-semibold">{streak || 0} วัน</h3>
        </Card>
        <Card>
          <Tag tone="warning">จำแล้ว</Tag>
          <h3 className="mt-2 text-xl font-semibold">
            {totalMastered}
            <span className="text-base font-normal text-muted"> / {totalWords} คำ</span>
          </h3>
        </Card>
      </div>

      <h2 className="mb-3 text-lg font-semibold">ผลสอบย้อนหลัง</h2>
      {history.length === 0 ? (
        <EmptyState>
          ยังไม่มีประวัติการทำข้อสอบ — ลองทำ Reading, Listening หรือ Mock สักรอบ
        </EmptyState>
      ) : (
        <div className="mb-6 space-y-4">
          <Card>
            <p className="mb-2 text-xs font-semibold text-muted">
              คะแนน {Math.min(history.length, 20)} รอบล่าสุด
            </p>
            <AttemptChart attempts={history} />
          </Card>

          {kindStats.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {kindStats.map((k) => (
                <Card key={k.kind}>
                  <div className="flex items-center justify-between">
                    <b className="text-sm">{KIND_LABEL[k.kind]}</b>
                    <span className="text-xs text-subtle">{k.count} รอบ</span>
                  </div>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span>
                      เฉลี่ย <b className="tabular-nums">{k.avg}%</b>
                    </span>
                    <span className="text-muted">
                      สูงสุด <b className="tabular-nums text-text">{k.best}%</b>
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {history.slice(0, 8).map((a) => (
              <Card key={a.id} className="flex items-center gap-3 py-3">
                <Tag tone="info">{KIND_LABEL[a.kind]}</Tag>
                <b className="min-w-0 flex-1 truncate text-sm">{a.title || "ไม่มีชื่อ"}</b>
                <span className="shrink-0 text-xs text-subtle">{shortDate(a.takenAt)}</span>
                <Tag tone={scoreTone(a.percent)}>{a.percent}%</Tag>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">ความคืบหน้าแต่ละชุด</h2>
      {perDeck.length === 0 ? (
        <EmptyState>ยังไม่มีชุดคำศัพท์ที่ฝึก</EmptyState>
      ) : (
        <div className="space-y-3">
          {perDeck.map((d) => (
            <Card key={d.id}>
              <div className="flex items-center justify-between gap-3">
                <b className="min-w-0 truncate text-sm">{d.name}</b>
                <span className="shrink-0 text-sm tabular-nums text-muted">
                  {d.mastered}/{d.total}
                </span>
              </div>
              <Progress value={(d.mastered / d.total) * 100} className="mt-2" />
              {d.weak.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold text-muted">คำที่ยังไม่แม่น</p>
                  <div className="flex flex-wrap gap-1.5">
                    {d.weak.map(({ w, i }) => (
                      <span
                        key={i}
                        className="rounded-md bg-surface-2 px-2 py-1 text-xs"
                        title={w.m}
                      >
                        {w.w}
                      </span>
                    ))}
                  </div>
                  <Link
                    to={`/flash/study/${d.id}`}
                    className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    ทบทวนชุดนี้ →
                  </Link>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
