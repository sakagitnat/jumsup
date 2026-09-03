import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, Field, Tag, Empty, useAsync } from "../ui";

interface Row {
  user_id: string;
  username: string | null;
  role: string;
  xp: number;
  streak: number;
  pro_lifetime: boolean;
  pro_bonus_until: string | null;
  banned_at: string | null;
  created_at: string;
}

interface Detail {
  profile: Row & { referral_code?: string; last_checkin?: string };
  gift_redemptions: Array<{ code: string; pro_days: number; redeemed_at: string }>;
  free_codes_used: number;
  sets_count: number;
  reviews_count: number;
  imports_count: number;
  recent_attempts: Array<{ kind: string; percent: number; taken_at: string }>;
}

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "—";

function proState(r: { pro_lifetime: boolean; pro_bonus_until: string | null }): string {
  if (r.pro_lifetime) return "Pro ตลอดชีพ";
  if (r.pro_bonus_until && new Date(r.pro_bonus_until) > new Date())
    return `Pro ถึง ${fmtDate(r.pro_bonus_until)}`;
  return "ฟรี";
}

function UserDetail({ userId }: { userId: string }) {
  const [d, setD] = useState<Detail | null>(null);
  useEffect(() => {
    apiGet<{ detail: Detail }>(`/api/admin/users?user_id=${userId}`)
      .then((r) => setD(r.detail))
      .catch(() => setD(null));
  }, [userId]);
  if (!d) return <p className="text-xs text-[var(--subtle)]">กำลังโหลด…</p>;
  return (
    <div className="mt-2 space-y-2 rounded-xl bg-[var(--surface-2)] p-3 text-sm">
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--muted)]">
        <span>สร้างชุด {d.sets_count}</span>
        <span>รีวิว {d.reviews_count}</span>
        <span>นำเข้า Community {d.imports_count}</span>
        <span>เช็คอินล่าสุด {fmtDate(d.profile.last_checkin)}</span>
        <span>โค้ดฟรีที่ใช้ไป {d.free_codes_used} ครั้ง</span>
      </div>
      {d.gift_redemptions.length > 0 && (
        <div>
          <b className="text-xs">ประวัติใช้โค้ด</b>
          <ul className="mt-1 space-y-0.5 text-xs text-[var(--muted)]">
            {d.gift_redemptions.map((g, i) => (
              <li key={i}>
                <span className="font-mono">{g.code}</span> · +{g.pro_days} วัน ·{" "}
                {new Date(g.redeemed_at).toLocaleString("th-TH")}
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.recent_attempts.length > 0 && (
        <div className="text-xs text-[var(--muted)]">
          ข้อสอบล่าสุด:{" "}
          {d.recent_attempts
            .slice(0, 8)
            .map((a) => `${a.kind} ${a.percent}%`)
            .join(" · ")}
        </div>
      )}
    </div>
  );
}

export function Users() {
  const run = useAsync();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ items: Row[]; count: number; per: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiGet<{ items: Row[]; count: number; per: number }>(
      `/api/admin/users?q=${encodeURIComponent(q)}&page=${page}`,
    )
      .then(setData)
      .catch(() => setData({ items: [], count: 0, per: 25 }))
      .finally(() => setLoading(false));
  };
  useEffect(load, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = (user_id: string, payload: object) =>
    run(() => apiPost("/api/admin/users", { user_id, ...payload }), load);

  const totalPages = data ? Math.max(1, Math.ceil(data.count / data.per)) : 1;

  return (
    <Section title="ผู้ใช้" desc={data ? `${data.count} บัญชี` : ""}>
      <Card className="mb-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            load();
          }}
        >
          <Field
            label="ค้นหาชื่อผู้ใช้"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full"
          />
          <Btn tone="primary" className="self-end">
            ค้นหา
          </Btn>
        </form>
      </Card>

      {loading ? (
        <Empty>กำลังโหลด…</Empty>
      ) : !data || data.items.length === 0 ? (
        <Empty>ไม่พบผู้ใช้</Empty>
      ) : (
        <div className="space-y-2">
          {data.items.map((r) => (
            <Card key={r.user_id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-sm">@{r.username || "ไม่มีชื่อ"}</b>
                {r.role === "admin" && <Tag tone="primary">admin</Tag>}
                {r.banned_at && <Tag tone="danger">ถูกแบน</Tag>}
                <span className="text-xs text-[var(--muted)]">
                  {proState(r)} · {r.xp.toLocaleString()} XP · streak {r.streak} · สมัคร{" "}
                  {fmtDate(r.created_at)}
                </span>
                <button
                  type="button"
                  className="ml-auto text-xs font-semibold text-[var(--primary)] hover:underline"
                  onClick={() => setOpenId(openId === r.user_id ? null : r.user_id)}
                >
                  {openId === r.user_id ? "ซ่อน" : "รายละเอียด"}
                </button>
              </div>

              {openId === r.user_id && <UserDetail userId={r.user_id} />}

              <div className="flex flex-wrap gap-2">
                <Btn onClick={() => act(r.user_id, { action: "grant_pro", days: 30 })}>
                  +30 วัน Pro
                </Btn>
                <Btn onClick={() => act(r.user_id, { action: "grant_pro", lifetime: true })}>
                  Pro ตลอดชีพ
                </Btn>
                <Btn onClick={() => act(r.user_id, { action: "revoke_pro" })}>ถอน Pro</Btn>
                <Btn
                  onClick={() =>
                    act(r.user_id, {
                      action: "set_role",
                      role: r.role === "admin" ? "user" : "admin",
                    })
                  }
                >
                  {r.role === "admin" ? "ถอน admin" : "ตั้งเป็น admin"}
                </Btn>
                {r.banned_at ? (
                  <Btn onClick={() => act(r.user_id, { action: "unban" })}>ปลดแบน</Btn>
                ) : (
                  <Btn
                    tone="danger"
                    onClick={() => {
                      if (confirm(`แบน @${r.username}? ผู้ใช้จะเข้าระบบไม่ได้`))
                        act(r.user_id, { action: "ban" });
                    }}
                  >
                    แบน
                  </Btn>
                )}
              </div>
            </Card>
          ))}
          <div className="flex items-center justify-between pt-2 text-sm text-[var(--muted)]">
            <Btn disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              ก่อนหน้า
            </Btn>
            <span>
              หน้า {page + 1} / {totalPages}
            </span>
            <Btn disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              ถัดไป
            </Btn>
          </div>
        </div>
      )}
    </Section>
  );
}
