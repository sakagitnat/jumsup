import { Link } from "react-router-dom";
import { todayKey } from "../../lib/utils.js";
import { useStore } from "../../store/useStore";
import { dailyCheckin } from "../../actions/session";
import { PageHeader, Card, Tag, Button } from "../../ui";

const skillCards: Array<[string, string, string, string]> = [
  ["/flash", "Aa", "Flashcard", "วนคำจนจำครบ"],
  ["/match", "↔", "Match", "จับคู่แข่งกับเวลาและทำลายสถิติ"],
  ["/crossword", "＋", "Crossword", "เติมคำศัพท์ลงตารางไขว้จริง"],
  ["/reading", "R", "Reading", "อ่าน แตะคำ แปล และเก็บศัพท์"],
  ["/listening", "L", "Listening", "ฟังบทสนทนาและตอบคำถาม"],
  ["/writing", "W", "Writing", "Text Completion และเรียงย่อหน้า"],
  ["/mock", "M", "Mock Exam", "สร้างและเลือกชุดข้อสอบ"],
  ["/community", "◇", "Community", "ค้นหาชุดจากผู้ใช้อื่น"],
];

const planLabels: Record<string, string> = {
  vocabulary: "ทบทวนคำศัพท์",
  reading: "ฝึก Reading",
  listening: "ฝึก Listening",
  writing: "ฝึก Writing",
};

export function Home() {
  const { xp, streak, decks, lastCheckin, profile } = useStore((s) => ({
    xp: s.xp,
    streak: s.streak,
    decks: s.decks,
    lastCheckin: s.lastCheckin,
    profile: s.profile,
  }));

  const checked = lastCheckin === todayKey();
  const weak = profile?.weak_skills?.[0] || "vocabulary";
  const planRoute = weak === "vocabulary" ? "/flash" : `/${weak}`;
  const minutes = profile?.daily_minutes || 10;

  return (
    <>
      <PageHeader
        eyebrow="ENGLISH PRACTICE"
        title="ฝึกภาษาอังกฤษในแบบของคุณ"
        description="Flashcard, Reading, Listening, Writing และแบบทดสอบในที่เดียว"
      />

      {profile?.onboarding_completed_at && (
        <Card className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Tag tone="success">แผนวันนี้ · {minutes} นาที</Tag>
            <h2 className="mt-2 text-lg font-semibold">
              {planLabels[weak] || "เริ่มฝึกตามแผน"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              เริ่มจากทักษะที่คุณเลือกไว้ แล้วกลับมาทบทวนต่อได้ทุกวัน
            </p>
          </div>
          <Link
            to={planRoute}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover"
          >
            เริ่มแผนวันนี้
          </Link>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <Tag tone="info">XP</Tag>
          <h3 className="mt-2 text-xl font-semibold">{xp.toLocaleString()} XP</h3>
          <p className="text-sm text-muted">ความก้าวหน้ารวม</p>
        </Card>
        <Card>
          <Tag tone="success">STREAK</Tag>
          <h3 className="mt-2 text-xl font-semibold">{streak} วัน</h3>
          <p className="text-sm text-muted">
            {checked ? "เช็คอินแล้ววันนี้" : "ยังไม่ได้เช็คอินวันนี้"}
          </p>
        </Card>
        <Card>
          <Tag tone="warning">DECKS</Tag>
          <h3 className="mt-2 text-xl font-semibold">{decks.length} ชุด</h3>
          <p className="text-sm text-muted">เลือกชุดแล้วเริ่มฝึกได้ทันที</p>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">เริ่มฝึก</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {skillCards.map(([to, icon, title, desc]) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-primary-border hover:bg-primary-soft"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg font-bold text-primary">
              {icon}
            </span>
            <div className="min-w-0">
              <b className="block text-sm">{title}</b>
              <small className="text-xs text-muted">{desc}</small>
            </div>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">เช็คอินรายวัน</h2>
      <Card className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg font-bold text-primary">
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-sm">
            {checked ? "เช็คอินแล้ว" : "ยังไม่ได้เช็คอินวันนี้"}
          </b>
          <small className="text-xs text-muted">
            เช็คอินเพื่อรักษา Streak และรับ XP
          </small>
        </div>
        <Button variant="primary" disabled={checked} onClick={dailyCheckin}>
          {checked ? "เช็คอินแล้ว ✓" : "เช็คอิน +20 XP"}
        </Button>
      </Card>
    </>
  );
}
