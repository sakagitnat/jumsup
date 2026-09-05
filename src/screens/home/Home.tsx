import { Link } from "react-router-dom";
import { todayKey } from "../../lib/utils.js";
import { useStore } from "../../store/useStore";
import { dailyCheckin } from "../../actions/session";
import { loginGoogle } from "../../actions/auth";
import { dueCount } from "../../lib/srs";
import { skillLabel } from "../../lib/taxonomy";
import { isPro } from "../../lib/entitlements.js";
import {
  PageHeader,
  Card,
  Tag,
  Button,
  LinkButton,
  toast,
  IconBolt,
  IconArrowRight,
  IconCheck,
} from "../../ui";

/** A single contextual Pro nudge for the daily-plan card. Returns null for Pro
 *  users (unless their trial is about to lapse) and when nothing is relevant. */
function proNudge(opts: {
  pro: boolean;
  proBonusUntil?: string | null;
  hasSub: boolean;
  daysToExam: number | null;
  streak: number;
}): string | null {
  const { pro, proBonusUntil, hasSub, daysToExam, streak } = opts;
  if (pro) {
    // trial (pro via bonus, no paid sub) winding down
    if (!hasSub && proBonusUntil) {
      const left = Math.ceil((new Date(proBonusUntil).getTime() - Date.now()) / 86_400_000);
      if (left >= 0 && left <= 3) {
        return `ทดลอง Pro เหลือ ${left} วัน — สมัครต่อเพื่อฝึกไม่จำกัดต่อเนื่อง`;
      }
    }
    return null;
  }
  // trial already ended
  if (!hasSub && proBonusUntil && new Date(proBonusUntil).getTime() < Date.now()) {
    return "ทดลอง Pro หมดแล้ว — สมัคร Pro รายปี ฿99/เดือน หรือชวนเพื่อนสมัคร Pro รับ +14 วัน";
  }
  if (daysToExam !== null && daysToExam >= 0 && daysToExam <= 30) {
    return "โค้งสุดท้ายก่อนสอบ — Pro ปลดล็อก Reading / Listening / Writing / Mock ไม่จำกัด";
  }
  if ([7, 14, 30, 60, 100].includes(streak)) {
    return `เรียนต่อเนื่อง ${streak} วันแล้ว — จริงจังขนาดนี้ Pro รายปี (฿99/เดือน) คุ้มกว่า`;
  }
  return null;
}

const skillCards: Array<[string, string, string, string]> = [
  ["/flash", "Aa", "Flashcard", "วนคำจนจำครบ"],
  ["/match", "Mt", "Match", "จับคู่แข่งกับเวลาและทำลายสถิติ"],
  ["/crossword", "Cw", "Crossword", "เติมคำศัพท์ลงตารางไขว้จริง"],
  ["/reading", "R", "Reading", "อ่าน แตะคำ แปล และเก็บศัพท์"],
  ["/listening", "L", "Listening", "ฟังบทสนทนาและตอบคำถาม"],
  ["/writing", "W", "Writing", "Text Completion และเรียงย่อหน้า"],
  ["/mock", "M", "Mock Exam", "สร้างและเลือกชุดข้อสอบ"],
  ["/community", "Cm", "Community", "ค้นหาชุดจากผู้ใช้อื่น"],
];

const skillRoute = (s: string) => (s === "vocabulary" ? "/flash" : `/${s}`);
const skillName = (s: string) => (s === "vocabulary" ? "คำศัพท์" : skillLabel(s) || s);

interface PlanStep {
  key: string;
  text: string;
  cta: string;
  to?: string;
  action?: () => void;
  done?: boolean;
}

export function Home() {
  const {
    xp,
    streak,
    decks,
    srs,
    examTargets,
    reading,
    listening,
    writing,
    mocks,
    lastCheckin,
    profile,
    subscription,
    user,
  } = useStore((s) => ({
    xp: s.xp,
    streak: s.streak,
    decks: s.decks,
    srs: s.srs,
    examTargets: s.examTargets,
    reading: s.reading,
    listening: s.listening,
    writing: s.writing,
    mocks: s.mocks,
    lastCheckin: s.lastCheckin,
    profile: s.profile,
    subscription: s.subscription,
    user: s.user,
  }));

  const checked = lastCheckin === todayKey();
  const minutes = profile?.daily_minutes || 10;
  const ownSets =
    decks.filter((d) => !d.official).length +
    [...reading, ...listening, ...writing, ...mocks].filter((x) => !x.official).length;

  const totalDue = decks.reduce((n, d) => n + dueCount(srs[d.id]), 0);
  const weakSkills = profile?.weak_skills?.length ? profile.weak_skills : ["vocabulary"];

  const upcomingExams = examTargets
    .filter((t) => t.date)
    .map((t) => ({
      name: t.name,
      days: Math.ceil(
        (new Date(`${t.date}T00:00:00`).getTime() - Date.now()) / 86_400_000,
      ),
    }))
    .filter((t) => t.days >= 0)
    .sort((a, b) => a.days - b.days);
  const nextExam = upcomingExams[0] ?? null;
  const daysToExam = nextExam ? nextExam.days : null;

  const pro = isPro({ profile, subscription });
  const nudge = proNudge({
    pro,
    proBonusUntil: profile?.pro_bonus_until,
    hasSub: subscription?.status === "active" || subscription?.status === "trialing",
    daysToExam,
    streak,
  });
  const examText = !nextExam
    ? null
    : nextExam.days === 0
      ? `วันนี้สอบ ${nextExam.name} — เต็มที่นะ`
      : `เหลืออีก ${nextExam.days} วัน ถึง ${nextExam.name}` +
        (upcomingExams.length > 1 ? ` · อีก ${upcomingExams.length - 1} รายการ` : "");

  const planSteps: PlanStep[] = [];
  planSteps.push(
    checked
      ? { key: "checkin", text: "เช็คอินแล้ววันนี้", cta: "เสร็จ", done: true }
      : {
          key: "checkin",
          text: "เช็คอินรับ +20 XP และรักษา Streak",
          cta: "เช็คอิน",
          action: dailyCheckin,
        },
  );
  if (totalDue > 0)
    planSteps.push({
      key: "review",
      text: `ทบทวนคำศัพท์ที่ครบกำหนด ${totalDue} คำ`,
      cta: "ทบทวน",
      to: "/flash",
    });
  for (const s of weakSkills.slice(0, 2))
    planSteps.push({
      key: `skill-${s}`,
      text: `ฝึก${skillName(s)} ประมาณ ${minutes} นาที`,
      cta: "เริ่ม",
      to: skillRoute(s),
    });
  if (daysToExam !== null && daysToExam >= 0 && daysToExam <= 14 && mocks.length)
    planSteps.push({
      key: "mock",
      text: "จับเวลาทำ Mock สักชุดก่อนสอบ",
      cta: "ทำ Mock",
      to: "/mock",
    });

  return (
    <>
      <PageHeader
        eyebrow="ENGLISH PRACTICE"
        title="ฝึกภาษาอังกฤษในแบบของคุณ"
        description="Flashcard, Reading, Listening, Writing และแบบทดสอบในที่เดียว"
      />

      {/* next step */}
      {!user ? (
        <Card className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Tag tone="info">เริ่มต้น</Tag>
            <h2 className="mt-2 text-lg font-semibold">เข้าสู่ระบบเพื่อบันทึกความคืบหน้า</h2>
            <p className="mt-1 text-sm text-muted">
              Sync ทุกอุปกรณ์ · ปลดล็อก Community และการนำเข้าชุด
            </p>
          </div>
          <Button variant="primary" className="shrink-0" onClick={loginGoogle}>
            สมัครฟรี
          </Button>
        </Card>
      ) : !profile?.onboarding_completed_at ? (
        <Card className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Tag tone="info">ก้าวต่อไป</Tag>
            <h2 className="mt-2 text-lg font-semibold">ตั้งค่าแผนการเรียนของคุณ</h2>
            <p className="mt-1 text-sm text-muted">ใช้เวลาไม่ถึง 1 นาที เพื่อให้ Jumsup แนะนำได้ตรงจุด</p>
          </div>
          <LinkButton to="/onboarding" variant="primary" className="shrink-0">
            เริ่มตั้งค่า
          </LinkButton>
        </Card>
      ) : (
        <Card className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="success">แผนวันนี้ · {minutes} นาที</Tag>
            {examText && <span className="text-sm font-medium text-muted">{examText}</span>}
            <Link
              to="/onboarding"
              className="ml-auto text-xs font-semibold text-primary hover:underline"
            >
              แก้ไขแผน
            </Link>
          </div>
          {!examText && (
            <p className="mt-1 text-xs text-subtle">
              <Link to="/onboarding" className="font-semibold text-primary hover:underline">
                ตั้งวันสอบและทักษะที่อยากเน้น
              </Link>{" "}
              เพื่อให้แผนวันนี้ละเอียดขึ้น
            </p>
          )}
          <ol className="mt-3 space-y-2">
            {planSteps.map((step, i) => (
              <li
                key={step.key}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/40 px-3 py-2"
              >
                <span
                  className={
                    step.done
                      ? "grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success-soft text-xs font-bold text-success"
                      : "grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary"
                  }
                >
                  {step.done ? <IconCheck size={13} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm">{step.text}</span>
                {step.done ? (
                  <span className="shrink-0 text-xs text-subtle">{step.cta}</span>
                ) : step.action ? (
                  <Button size="sm" variant="primary" onClick={step.action}>
                    {step.cta}
                  </Button>
                ) : (
                  <LinkButton size="sm" variant="primary" to={step.to ?? "/home"}>
                    {step.cta}
                  </LinkButton>
                )}
              </li>
            ))}
          </ol>
          {nudge && (
            <Link
              to="/pricing"
              className="mt-3 flex items-center gap-2 rounded-xl border border-primary-border bg-primary-soft px-3 py-2 text-xs font-medium text-primary transition hover:brightness-95"
            >
              <IconBolt size={14} className="shrink-0" />
              <span className="min-w-0 flex-1">{nudge}</span>
              <IconArrowRight size={14} className="shrink-0" />
            </Link>
          )}
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
        <Link to="/library" className="block">
          <Card className="h-full transition-colors hover:border-primary-border">
            <Tag tone="warning">คลังของฉัน</Tag>
            <h3 className="mt-2 text-xl font-semibold">{ownSets} ชุด</h3>
            <p className="text-sm text-muted">ชุดที่คุณสร้างหรือนำเข้า →</p>
          </Card>
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
        <Link to="/leaderboard" className="text-sm font-semibold text-primary hover:underline">
          อันดับสัปดาห์นี้ →
        </Link>
        <Link to="/stats" className="text-sm font-semibold text-primary hover:underline">
          ดูสถิติการเรียนทั้งหมด →
        </Link>
      </div>

      {user && !checked && (
        <Card className="mt-4 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <IconCheck size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <b className="block text-sm">ยังไม่ได้เช็คอินวันนี้</b>
            <small className="text-xs text-muted">รักษา Streak และรับ +20 XP</small>
          </div>
          <Button variant="primary" onClick={dailyCheckin}>
            เช็คอิน
          </Button>
        </Card>
      )}

      {user && ownSets === 0 && (
        <Card soft className="mt-4">
          <h3 className="text-base font-semibold">ยังไม่มีชุดของคุณเอง</h3>
          <p className="mt-1 text-sm text-muted">
            สร้างชุดคำศัพท์/ข้อสอบเอง นำเข้าจาก CSV หรือหยิบจาก Community มาใช้
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <LinkButton to="/library" variant="primary" size="sm">
              ไปที่คลังของฉัน
            </LinkButton>
            <LinkButton to="/community" size="sm">
              เปิด Community
            </LinkButton>
          </div>
        </Card>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">ฝึกทักษะ</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {skillCards.map(([to, icon, title]) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface p-3 text-center transition-colors hover:border-primary-border hover:bg-primary-soft"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg font-bold text-primary">
              {icon}
            </span>
            <b className="text-xs">{title}</b>
          </Link>
        ))}
      </div>

      {user && profile?.referral_code && (
        <Card className="mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <b className="block text-sm">ชวนเพื่อน รับ Pro ฟรี</b>
              <small className="text-xs text-muted">
                เมื่อเพื่อนสมัคร Pro: คุณ +14 วัน · เพื่อน +7 วัน · ลิงก์กรอกโค้ดให้อัตโนมัติ
              </small>
            </div>
            <Button
              variant="primary"
              className="shrink-0"
              onClick={async () => {
                const link = `${location.origin}/?ref=${profile.referral_code}`;
                const text = "มาฝึกภาษาอังกฤษเตรียมสอบกับ Jumsup กัน — สมัครฟรีได้เลย";
                try {
                  if (navigator.share) await navigator.share({ text, url: link });
                  else {
                    await navigator.clipboard.writeText(`${text}\n${link}`);
                    toast("คัดลอกลิงก์ชวนเพื่อนแล้ว");
                  }
                } catch {
                  /* user cancelled */
                }
              }}
            >
              แชร์ลิงก์ชวนเพื่อน
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
