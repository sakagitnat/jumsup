import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, Field, Tag, Empty, useToast, useAsync } from "../ui";

interface Tier {
  id?: number;
  min_rank: number;
  max_rank: number;
  reward_xp: number;
  reward_pro_days: number;
  label: string;
}
interface WeekRow {
  week_start: string;
  players: number;
  bots: number;
  closed_at: string;
  top3: Array<{ rank: number; name: string; xp: number }>;
}
interface DetailRow {
  rank: number;
  name: string;
  xp: number;
  is_bot: boolean;
  reward_xp: number;
  reward_pro_days: number;
}
interface Payload {
  weeks: WeekRow[];
  tiers: Tier[];
  detail: { week_start: string; rows: DetailRow[] } | null;
}

const fmtWeek = (d: string) => {
  const start = new Date(`${d}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const f = (x: Date) => x.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  return `${f(start)} – ${f(end)}`;
};

export function Seasons() {
  const toast = useToast();
  const run = useAsync();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState<string | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [closeWeek, setCloseWeek] = useState("");

  const load = (week?: string | null) => {
    setLoading(true);
    apiGet<Payload>(`/api/admin/seasons${week ? `?week=${week}` : ""}`)
      .then((d) => {
        setData(d);
        setTiers(d.tiers.map((t) => ({ ...t })));
        setFocus(d.detail?.week_start ?? null);
      })
      .catch((e) => toast((e as Error).message))
      .finally(() => setLoading(false));
  };
  useEffect(() => load(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const setTier = (i: number, patch: Partial<Tier>) =>
    setTiers((ts) => ts.map((t, k) => (k === i ? { ...t, ...patch } : t)));
  const addTier = () =>
    setTiers((ts) => [
      ...ts,
      { min_rank: 1, max_rank: 1, reward_xp: 0, reward_pro_days: 0, label: "" },
    ]);
  const removeTier = (i: number) => setTiers((ts) => ts.filter((_, k) => k !== i));

  return (
    <Section
      title="ฤดูกาลลีดเดอร์บอร์ด"
      desc="ปิดสัปดาห์ → เก็บอันดับ แจกรางวัล และสร้างการ์ดสรุปให้ผู้เล่น · cron ปิดให้เองทุกเช้าวันจันทร์"
      actions={
        <Btn onClick={() => load(focus)} disabled={loading}>
          {loading ? "กำลังโหลด…" : "รีเฟรช"}
        </Btn>
      }
    >
      <Card className="mb-4">
        <h3 className="mb-2 text-sm font-bold">ปิดสัปดาห์เดี๋ยวนี้</h3>
        <p className="mb-3 text-sm text-[var(--muted)]">
          ปกติ cron จะปิดสัปดาห์ที่เพิ่งจบให้อัตโนมัติ ใช้ปุ่มนี้ถ้าต้องปิดเองหรือปิดย้อนหลัง
          (ปิดซ้ำสัปดาห์เดิมไม่มีผล) เว้นว่าง = สัปดาห์ที่เพิ่งจบ
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Field
            label="วันจันทร์ต้นสัปดาห์ (YYYY-MM-DD)"
            placeholder="เว้นว่าง = สัปดาห์ล่าสุด"
            value={closeWeek}
            onChange={(e) => setCloseWeek(e.target.value)}
            className="w-56"
          />
          <Btn
            tone="primary"
            onClick={() =>
              run(
                async () => {
                  const r = await apiPost<{ result: Record<string, unknown> }>(
                    "/api/admin/seasons",
                    { action: "close", week: closeWeek.trim() || undefined },
                  );
                  const res = r.result || {};
                  toast(
                    res.already_closed
                      ? "สัปดาห์นี้ปิดไปแล้ว"
                      : res.error
                        ? `ปิดไม่ได้: ${String(res.error)}`
                        : "ปิดสัปดาห์เรียบร้อย",
                  );
                },
                () => {
                  setCloseWeek("");
                  load();
                },
              )
            }
          >
            ปิดสัปดาห์
          </Btn>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold">รางวัลตามอันดับ</h3>
          <Btn onClick={addTier}>+ เพิ่มช่วง</Btn>
        </div>
        <p className="mb-3 text-sm text-[var(--muted)]">
          ผู้เล่นที่จบสัปดาห์ในช่วงอันดับนี้จะได้ XP โบนัส และ/หรือ Pro เพิ่มกี่วัน
          (XP โบนัสไม่นับกลับเข้ากระดานสัปดาห์ใหม่) บอทไม่ได้รับรางวัลจริง
        </p>
        {tiers.length === 0 ? (
          <Empty>ยังไม่มีช่วงรางวัล — กำหนดอย่างน้อยหนึ่งช่วง</Empty>
        ) : (
          <div className="space-y-2">
            {tiers.map((t, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl bg-[var(--surface-2)] p-2">
                <Field
                  label="อันดับตั้งแต่"
                  type="number"
                  value={t.min_rank}
                  onChange={(e) => setTier(i, { min_rank: Number(e.target.value) })}
                  className="w-24"
                />
                <Field
                  label="ถึง"
                  type="number"
                  value={t.max_rank}
                  onChange={(e) => setTier(i, { max_rank: Number(e.target.value) })}
                  className="w-24"
                />
                <Field
                  label="XP โบนัส"
                  type="number"
                  value={t.reward_xp}
                  onChange={(e) => setTier(i, { reward_xp: Number(e.target.value) })}
                  className="w-28"
                />
                <Field
                  label="Pro +วัน"
                  type="number"
                  value={t.reward_pro_days}
                  onChange={(e) => setTier(i, { reward_pro_days: Number(e.target.value) })}
                  className="w-24"
                />
                <Field
                  label="ป้ายกำกับ"
                  value={t.label}
                  onChange={(e) => setTier(i, { label: e.target.value })}
                  className="w-40"
                />
                <Btn tone="danger" onClick={() => removeTier(i)}>
                  ลบ
                </Btn>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3">
          <Btn
            tone="primary"
            onClick={() =>
              run(() => apiPost("/api/admin/seasons", { action: "set_tiers", tiers }), () =>
                toast("บันทึกรางวัลแล้ว"),
              )
            }
          >
            บันทึกรางวัล
          </Btn>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-sm font-bold">สัปดาห์ที่ปิดแล้ว</h3>
          {loading ? (
            <Empty>กำลังโหลด…</Empty>
          ) : !data || data.weeks.length === 0 ? (
            <Empty>ยังไม่มีสัปดาห์ที่ปิด</Empty>
          ) : (
            <div className="space-y-2">
              {data.weeks.map((w) => (
                <button
                  key={w.week_start}
                  type="button"
                  onClick={() => {
                    setFocus(w.week_start);
                    load(w.week_start);
                  }}
                  className={
                    "block w-full rounded-xl border p-3 text-left text-sm " +
                    (focus === w.week_start
                      ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                      : "border-[var(--line)] hover:bg-[var(--surface-2)]")
                  }
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>{fmtWeek(w.week_start)}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {w.players} คน · {w.bots} บอท
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    {w.top3.map((r) => `#${r.rank} ${r.name}`).join("  ·  ") || "—"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-2 text-sm font-bold">
            {data?.detail ? `อันดับ ${fmtWeek(data.detail.week_start)}` : "อันดับรายสัปดาห์"}
          </h3>
          {!data?.detail || data.detail.rows.length === 0 ? (
            <p className="text-sm text-[var(--subtle)]">เลือกสัปดาห์ทางซ้าย</p>
          ) : (
            <div className="space-y-1">
              {data.detail.rows.map((r) => (
                <div
                  key={r.rank}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm odd:bg-[var(--surface-2)]"
                >
                  <span className="w-6 text-center font-bold tabular-nums">{r.rank}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {r.name} {r.is_bot && <Tag>บอท</Tag>}
                  </span>
                  {(r.reward_xp > 0 || r.reward_pro_days > 0) && (
                    <span className="shrink-0 text-xs text-[var(--success)]">
                      +{r.reward_xp} XP
                      {r.reward_pro_days > 0 ? ` · Pro +${r.reward_pro_days}ว` : ""}
                    </span>
                  )}
                  <span className="w-20 shrink-0 text-right tabular-nums text-[var(--muted)]">
                    {r.xp.toLocaleString()} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Section>
  );
}
