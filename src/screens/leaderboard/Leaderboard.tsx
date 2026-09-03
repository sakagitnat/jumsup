import { useEffect, useState } from "react";
import {
  loadWeeklyLeaderboard,
  loadLeaderboardHistory,
  loadLeaderboardHistoryWeeks,
  type WeeklyLeaderboard,
} from "../../lib/cloud.js";
import { useStore } from "../../store/useStore";
import { loginGoogle } from "../../actions/auth";
import { setLeaderboardAnon } from "../../actions/account";
import { PageHeader, Card, Button, Switch, EmptyState, cx } from "../../ui";

const medal = ["🥇", "🥈", "🥉"];

function weekLabel(weekStart: string): string {
  if (!weekStart) return "สัปดาห์นี้";
  const start = new Date(`${weekStart}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "สัปดาห์นี้";
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function Leaderboard() {
  const { user, anon } = useStore((s) => ({
    user: s.user,
    anon: Boolean(s.profile?.leaderboard_anon),
  }));

  const [data, setData] = useState<WeeklyLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [sel, setSel] = useState(""); // "" = this week, otherwise a past week_start

  useEffect(() => {
    if (!user) return;
    loadLeaderboardHistoryWeeks()
      .then(setWeeks)
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    const load = sel ? loadLeaderboardHistory(sel, 20) : loadWeeklyLeaderboard(20);
    load
      .then(setData)
      .catch((e) => setErr((e as Error).message || "โหลดอันดับไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [user, sel, reloadKey]);

  const toggleAnon = async (v: boolean) => {
    await setLeaderboardAnon(v);
    setReloadKey((k) => k + 1);
  };

  const isPast = Boolean(sel);

  return (
    <>
      <PageHeader
        eyebrow="LEADERBOARD"
        title={isPast ? "อันดับย้อนหลัง" : "อันดับสัปดาห์นี้"}
        description={
          data
            ? `${isPast ? "ปิดสัปดาห์แล้ว · " : "สะสม XP · รีเซ็ตทุกวันจันทร์ · "}${weekLabel(data.weekStart)}`
            : "แข่งสะสม XP รีเซ็ตทุกวันจันทร์"
        }
      />

      {user && weeks.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSel("")}
            className={cx(
              "rounded-full px-3 py-1 text-sm font-medium",
              !sel ? "bg-primary text-on-primary" : "bg-surface-2 text-muted hover:text-text",
            )}
          >
            สัปดาห์นี้
          </button>
          {weeks.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setSel(w)}
              className={cx(
                "rounded-full px-3 py-1 text-sm font-medium",
                sel === w ? "bg-primary text-on-primary" : "bg-surface-2 text-muted hover:text-text",
              )}
            >
              {weekLabel(w)}
            </button>
          ))}
        </div>
      )}

      {!user ? (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">เข้าสู่ระบบเพื่อร่วมแข่ง</h2>
            <p className="mt-1 text-sm text-muted">สะสม XP จากเช็คอินและการเรียนเพื่อไต่อันดับ</p>
          </div>
          <Button variant="primary" className="shrink-0" onClick={loginGoogle}>
            เข้าสู่ระบบด้วย Google
          </Button>
        </Card>
      ) : loading ? (
        <EmptyState>กำลังโหลดอันดับ…</EmptyState>
      ) : err ? (
        <EmptyState>{err}</EmptyState>
      ) : (
        <>
          <Card soft className="mb-4 space-y-3">
            {data?.me ? (
              <p className="text-sm">
                อันดับของคุณ{isPast ? "สัปดาห์นั้น" : "สัปดาห์นี้"}:{" "}
                <b className="text-primary">#{data.me.rank}</b> · {data.me.xp.toLocaleString()} XP
              </p>
            ) : (
              <p className="text-sm text-muted">
                {isPast
                  ? "สัปดาห์นั้นคุณยังไม่มี XP บนกระดาน"
                  : "ยังไม่มี XP สัปดาห์นี้ — เช็คอินหรือเรียนสักหน่อยเพื่อขึ้นกระดาน"}
              </p>
            )}
            {!isPast && (
              <div className="flex items-center justify-between border-t border-line pt-3">
                <span className="text-sm">ซ่อนชื่อของฉันบนกระดาน</span>
                <Switch checked={anon} label="ซ่อนชื่อ" onChange={toggleAnon} />
              </div>
            )}
          </Card>

          {!data || data.top.length === 0 ? (
            <EmptyState>
              {isPast ? "ไม่มีข้อมูลสัปดาห์นั้น" : "ยังไม่มีใครทำคะแนนสัปดาห์นี้ — เป็นคนแรกเลย!"}
            </EmptyState>
          ) : (
            <div className="space-y-2">
              {data.top.map((row) => {
                const mine = row.isMe;
                return (
                  <Card
                    key={`${row.rank}-${row.username}`}
                    className={cx(
                      "flex items-center gap-3 py-3",
                      mine && "border-primary-border bg-primary-soft",
                    )}
                  >
                    <span className="w-8 shrink-0 text-center text-sm font-bold tabular-nums">
                      {row.rank <= 3 ? medal[row.rank - 1] : row.rank}
                    </span>
                    <b className="min-w-0 flex-1 truncate text-sm">
                      {row.username}
                      {mine && <span className="ml-1 text-xs font-normal text-primary">(คุณ)</span>}
                    </b>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {row.xp.toLocaleString()} XP
                    </span>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
