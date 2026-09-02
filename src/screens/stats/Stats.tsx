import { Link } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { PageHeader, Card, Progress, Tag, EmptyState } from "../../ui";

export function Stats() {
  const { xp, streak, decks, progress } = useStore((s) => ({
    xp: s.xp,
    streak: s.streak,
    decks: s.decks,
    progress: s.progress,
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
