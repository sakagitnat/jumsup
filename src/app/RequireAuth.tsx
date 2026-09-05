import { Outlet, useLocation } from "react-router-dom";
import { useStore } from "../store/useStore";
import { loginGoogle } from "../actions/auth";
import { PageHeader, Card, Button, Logo } from "../ui";

const FEATURE_LABEL: Record<string, string> = {
  flash: "Flashcard",
  match: "เกม Match",
  crossword: "เกม Crossword",
  reading: "แบบฝึก Reading",
  listening: "แบบฝึก Listening",
  writing: "แบบฝึก Writing",
  mock: "ข้อสอบ Mock",
  practice: "ผลการฝึก",
  library: "คลังของฉัน",
  stats: "สถิติการเรียน",
  leaderboard: "ลีดเดอร์บอร์ด",
  community: "Community",
};

/** Guests can only use Flashcard. Everything else needs an account so progress,
 *  XP, streak and the leaderboard can be saved. */
export function RequireAuth() {
  const user = useStore((s) => s.user);
  const loc = useLocation();
  if (user) return <Outlet />;

  const seg = loc.pathname.split("/")[1] || "";
  const label = FEATURE_LABEL[seg] || "ฟีเจอร์นี้";

  return (
    <>
      <PageHeader
        eyebrow="สมัครฟรี"
        title={`สมัครเพื่อใช้ ${label}`}
        description="สมัครฟรีด้วย Google เพื่อเริ่มใช้ Jumsup เก็บความคืบหน้า และสะสม XP/Streak"
      />
      <Card className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft">
          <Logo size={40} />
        </div>
        <p className="max-w-sm text-sm text-muted">
          Flashcard, Reading, Listening, Writing, Mock, เกม, ลีดเดอร์บอร์ด และ Community
          ใช้ได้เมื่อสมัคร เพื่อบันทึกผลและซิงก์ทุกอุปกรณ์
        </p>
        <Button variant="primary" onClick={loginGoogle}>
          สมัครฟรีด้วย Google
        </Button>
      </Card>
    </>
  );
}
