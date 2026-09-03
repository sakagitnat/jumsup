import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadWeekRecap, markWeekRecapSeen, type WeekRecap as Recap } from "../../lib/cloud.js";
import { useStore } from "../../store/useStore";
import { Modal, Button, IconTrophy, cx } from "../../ui";

const rankTint: Record<number, string> = {
  1: "bg-[#f2c94c33] text-[#a9791b] dark:text-[#e8c877]",
  2: "bg-[#c9ced633] text-[#7b8494] dark:text-[#c2c9d6]",
  3: "bg-[#cd7f3233] text-[#9a5a24] dark:text-[#d59a6a]",
};

function delta(rank: number, prev: number | null): { text: string; tone: string } {
  if (prev == null) return { text: "สัปดาห์แรกบนกระดาน", tone: "text-muted" };
  if (prev === rank) return { text: "อันดับเท่าสัปดาห์ก่อน", tone: "text-muted" };
  if (rank < prev) return { text: `ขึ้น ${prev - rank} อันดับจากสัปดาห์ก่อน`, tone: "text-primary" };
  return { text: `ลง ${rank - prev} อันดับจากสัปดาห์ก่อน`, tone: "text-muted" };
}

/** Global one-time "your week is over" card. Mounted once in RootChrome. */
export function WeekRecap() {
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const [recap, setRecap] = useState<Recap | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    loadWeekRecap()
      .then((r) => {
        if (alive && r) {
          setRecap(r);
          setOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  const close = () => {
    setOpen(false);
    void markWeekRecapSeen();
  };

  if (!recap) return null;

  const d = delta(recap.rank, recap.prevRank);
  const hasReward = recap.rewardXp > 0 || recap.rewardProDays > 0;

  return (
    <Modal
      open={open}
      onClose={close}
      title="สรุปสัปดาห์ที่ผ่านมา"
      size="sm"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              close();
              navigate("/leaderboard");
            }}
          >
            ดูกระดาน
          </Button>
          <Button variant="primary" onClick={close}>
            รับทราบ
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-center">
        <div>
          <div
            className={cx(
              "mx-auto grid h-16 w-16 place-items-center rounded-2xl",
              rankTint[recap.rank] || "bg-primary-soft text-primary",
            )}
          >
            <IconTrophy size={30} />
          </div>
          <p className="mt-2 text-2xl font-bold">อันดับ {recap.rank}</p>
          <p className={`mt-1 text-sm ${d.tone}`}>{d.text}</p>
        </div>

        <p className="text-sm text-muted">
          สะสมได้ <b className="text-text">{recap.xp.toLocaleString()} XP</b> ในสัปดาห์นั้น
        </p>

        {hasReward ? (
          <div className="rounded-xl border border-primary-border bg-primary-soft p-3 text-sm">
            <p className="font-semibold text-primary">รางวัล{recap.tierLabel ? ` (${recap.tierLabel})` : ""}</p>
            <p className="mt-1">
              {recap.rewardXp > 0 && <>+{recap.rewardXp.toLocaleString()} XP</>}
              {recap.rewardXp > 0 && recap.rewardProDays > 0 && " · "}
              {recap.rewardProDays > 0 && <>Pro เพิ่ม {recap.rewardProDays} วัน</>}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">สัปดาห์นี้ทำต่อให้ติดรางวัลนะ</p>
        )}
      </div>
    </Modal>
  );
}
