import { Outlet, useLocation } from "react-router-dom";
import { useStore } from "../store/useStore";
import { loginGoogle } from "../actions/auth";
import { PageHeader, Card, Button, LinkButton } from "../ui";

const FEATURE_LABEL: Record<string, string> = {
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
        description="โหมด Guest ใช้ได้เฉพาะ Flashcard — สมัครฟรีเพื่อปลดล็อกทุกอย่าง เก็บความคืบหน้า และรับ Pro 7 วันทันที"
      />
      <Card className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="text-4xl">🔓</div>
        <p className="max-w-sm text-sm text-muted">
          Reading, Listening, Writing, Mock, เกม, ลีดเดอร์บอร์ด และ Community
          ต้องมีบัญชี เพื่อบันทึกผลและสะสม XP/Streak
        </p>
        <Button variant="primary" onClick={loginGoogle}>
          สมัครฟรีด้วย Google · รับ Pro 7 วัน
        </Button>
        <LinkButton to="/flash" variant="ghost" size="sm">
          กลับไปเล่น Flashcard
        </LinkButton>
      </Card>
    </>
  );
}
