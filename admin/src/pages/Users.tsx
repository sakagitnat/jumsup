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

function proState(r: Row): string {
  if (r.pro_lifetime) return "Pro ตลอดชีพ";
  if (r.pro_bonus_until && new Date(r.pro_bonus_until) > new Date())
    return `Pro ถึง ${new Date(r.pro_bonus_until).toLocaleDateString("th-TH")}`;
  return "ฟรี";
}

export function Users() {
  const run = useAsync();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ items: Row[]; count: number; per: number } | null>(null);
  const [loading, setLoading] = useState(true);

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
                  {proState(r)} · {r.xp.toLocaleString()} XP · streak {r.streak}
                </span>
              </div>
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
                    act(r.user_id, { action: "set_role", role: r.role === "admin" ? "user" : "admin" })
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
