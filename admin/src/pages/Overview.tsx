import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, useToast, useAsync } from "../ui";
import { friendlyError } from "../errors";

interface Overview {
  users: number;
  paid: number;
  free_users: number;
  paid_ratio: number;
  admins: number;
  banned: number;
  new_users_7d: number;
  new_users_30d: number;
  active_7d: number;
  active_30d: number;
  active_ratio_7d: number;
  pending_dictionary: number;
  pending_reports: number;
  pending_refunds: number;
  reviews_total: number;
  reviews_hidden: number;
  public_sets: number;
  public_vocab: number;
  public_skill: number;
  sets_new_30d: number;
  imports_30d: number;
  attempts_30d: number;
  attempts_by_kind_30d: Record<string, number>;
  xp_by_source_30d: Record<string, number>;
  gift_redemptions_30d: number;
  redeemers_total: number;
  redeemers_converted: number;
  redeemers_pending: number;
  active_codes: number;
  gift_liability_days: number;
  translations_today: number;
  google_configured: boolean;
  revenue: Record<string, number>;
}

const money = (v: number, c: string) =>
  new Intl.NumberFormat(c === "thb" ? "th-TH" : "en-US", {
    style: "currency",
    currency: c.toUpperCase(),
  }).format(v / 100);

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-24 shrink-0 text-[var(--muted)]">{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--surface-2)]">
        <div
          className="h-full rounded"
          style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color }}
        />
      </div>
      <span className="w-10 shrink-0 text-right tabular-nums">{value}</span>
    </div>
  );
}

const JOBS: Array<[string, string]> = [
  ["push_digest", "ส่งแจ้งเตือน (streak + recap)"],
  ["close_week", "ปิดสัปดาห์ลีดเดอร์บอร์ด"],
  ["purge_deletions", "กวาดลบบัญชีที่ครบกำหนด"],
];

interface Funnel {
  days: number;
  signup: number;
  onboarded: number;
  first_word: number;
  first_practice: number;
  first_checkin: number;
  returned_day2: number;
  started_pro: number;
}
const FUNNEL_STEPS: Array<[keyof Funnel, string]> = [
  ["signup", "สมัคร"],
  ["onboarded", "ตั้งค่าแผนเสร็จ"],
  ["first_word", "จำคำแรก"],
  ["first_practice", "ทำ Practice แรก"],
  ["first_checkin", "เช็คอินอย่างน้อย 1 ครั้ง"],
  ["returned_day2", "กลับมาวันที่ 2+"],
  ["started_pro", "เริ่มสมัคร Pro"],
];

export function Overview() {
  const toast = useToast();
  const run = useAsync();
  const [g, setG] = useState<Overview | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiGet<Overview>("/api/admin/overview")
      .then(setG)
      .catch((e) => toast(friendlyError((e as Error).message)))
      .finally(() => setLoading(false));
    apiGet<Funnel>("/api/admin/funnel?days=30")
      .then(setFunnel)
      .catch(() => {});
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const revenue = g
    ? Object.entries(g.revenue || {})
        .map(([c, v]) => money(v, c))
        .join(" · ") || "—"
    : "—";

  const kindLabels: Record<string, string> = {
    reading: "Reading",
    listening: "Listening",
    writing: "Writing",
    mock: "Mock",
  };
  const kindEntries = g ? Object.entries(g.attempts_by_kind_30d || {}) : [];
  const kindMax = Math.max(1, ...kindEntries.map(([, v]) => v));

  const xpSourceLabels: Record<string, string> = {
    checkin: "เช็คอิน",
    practice: "ทำข้อสอบ",
    flashcard: "จำศัพท์",
    game: "เกม",
    import: "ชุดถูกนำเข้า",
  };
  const xpEntries = g ? Object.entries(g.xp_by_source_30d || {}).sort((a, b) => b[1] - a[1]) : [];
  const xpMax = Math.max(1, ...xpEntries.map(([, v]) => v));

  return (
    <Section
      title="ศูนย์จัดการ Jumsup"
      desc="ภาพรวมผู้ใช้ การใช้งาน รายรับ และงานค้าง (ช่วง 30 วันล่าสุด)"
      actions={
        <Btn onClick={load} disabled={loading}>
          {loading ? "กำลังโหลด…" : "รีเฟรช"}
        </Btn>
      }
    >
      {funnel && funnel.signup > 0 && (
        <>
          <h3 className="mb-2 text-sm font-bold text-[var(--muted)]">
            Funnel — คนสมัคร {funnel.days} วันล่าสุด ({funnel.signup} คน)
          </h3>
          <Card className="mb-5 space-y-1.5">
            {FUNNEL_STEPS.map(([key, label]) => {
              const v = funnel[key];
              const pct = funnel.signup ? Math.round((v / funnel.signup) * 100) : 0;
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className="w-40 shrink-0 text-[var(--muted)]">{label}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded bg-[var(--primary)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right tabular-nums">
                    {v} <span className="text-[var(--muted)]">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </Card>
        </>
      )}

      {!g ? null : (
        <>
          <h3 className="mb-2 text-sm font-bold text-[var(--muted)]">ผู้ใช้</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["ทั้งหมด", g.users],
              ["จ่ายเงิน", `${g.paid} (${g.paid_ratio}%)`],
              ["ฟรี", g.free_users],
              ["Active 7 วัน", `${g.active_7d} (${g.active_ratio_7d}%)`],
              ["Active 30 วัน", g.active_30d],
              ["ใหม่ 7 วัน", g.new_users_7d],
              ["ใหม่ 30 วัน", g.new_users_30d],
              ["ถูกแบน", g.banned],
            ].map(([label, value]) => (
              <Card key={label}>
                <div className="text-xs text-[var(--muted)]">{label}</div>
                <div className="mt-1 text-lg font-bold">{value}</div>
              </Card>
            ))}
          </div>

          <h3 className="mb-2 mt-5 text-sm font-bold text-[var(--muted)]">
            การใช้งาน (30 วัน)
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <div className="mb-2 text-xs text-[var(--muted)]">
                ทำข้อสอบ {g.attempts_30d} ครั้ง — แยกตามประเภท
              </div>
              <div className="space-y-1.5">
                {kindEntries.length === 0 ? (
                  <span className="text-sm text-[var(--subtle)]">ยังไม่มีข้อมูล</span>
                ) : (
                  kindEntries
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <Bar
                        key={k}
                        label={kindLabels[k] || k}
                        value={v}
                        max={kindMax}
                        color="var(--primary)"
                      />
                    ))
                )}
              </div>
            </Card>
            <Card>
              <div className="mb-2 text-xs text-[var(--muted)]">XP มาจากกิจกรรมไหนมากสุด</div>
              <div className="space-y-1.5">
                {xpEntries.length === 0 ? (
                  <span className="text-sm text-[var(--subtle)]">ยังไม่มีข้อมูล</span>
                ) : (
                  xpEntries.map(([k, v]) => (
                    <Bar
                      key={k}
                      label={xpSourceLabels[k] || k}
                      value={v}
                      max={xpMax}
                      color="var(--success)"
                    />
                  ))
                )}
              </div>
            </Card>
            <Card>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["ชุดสาธารณะ", g.public_sets],
                  ["ชุดใหม่ 30 วัน", g.sets_new_30d],
                  ["นำเข้าจาก Community", g.imports_30d],
                  ["รีวิวทั้งหมด", `${g.reviews_total} (ซ่อน ${g.reviews_hidden})`],
                  ["โค้ดถูกใช้ 30 วัน", g.gift_redemptions_30d],
                  ["คำแปลวันนี้", g.translations_today],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-xs text-[var(--muted)]">{label}</div>
                    <div className="text-lg font-bold">{value}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <h3 className="mb-2 mt-5 text-sm font-bold text-[var(--muted)]">
            การแปลงลูกค้า (โค้ดฟรี → จ่ายเงิน)
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <div className="text-xs text-[var(--muted)]">เคยใช้โค้ดฟรี</div>
              <div className="mt-1 text-lg font-bold">{g.redeemers_total} คน</div>
            </Card>
            <Card>
              <div className="text-xs text-[var(--muted)]">แปลงเป็นลูกค้าแล้ว</div>
              <div className="mt-1 text-lg font-bold text-[var(--success)]">
                {g.redeemers_converted} คน
                {g.redeemers_total
                  ? ` (${Math.round((g.redeemers_converted / g.redeemers_total) * 100)}%)`
                  : ""}
              </div>
            </Card>
            <Card>
              <div className="text-xs text-[var(--muted)]">ยังไม่จ่ายเงิน</div>
              <div className="mt-1 text-lg font-bold text-[var(--warning)]">
                {g.redeemers_pending} คน
              </div>
            </Card>
          </div>

          <h3 className="mb-2 mt-5 text-sm font-bold text-[var(--muted)]">
            รายรับและงานค้าง
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["รายรับเดือนนี้", revenue],
              ["Gift Code เปิดอยู่", g.active_codes],
              ["Gift คงค้าง (Pro-days)", `${g.gift_liability_days} / 5000`],
              ["Google Translate", g.google_configured ? "ตั้งค่าแล้ว" : "ยังไม่ตั้ง"],
              ["คำแปลรอตรวจ", g.pending_dictionary],
              ["รายงานรอตรวจ", g.pending_reports],
              ["คืนเงินรอตรวจ", g.pending_refunds],
              ["Admin", g.admins],
            ].map(([label, value]) => (
              <Card key={label}>
                <div className="text-xs text-[var(--muted)]">{label}</div>
                <div className="mt-1 text-lg font-bold break-words">{value}</div>
              </Card>
            ))}
          </div>

          <h3 className="mb-2 mt-5 text-sm font-bold text-[var(--muted)]">
            งานอัตโนมัติ (cron)
          </h3>
          <Card>
            <p className="mb-3 text-xs text-[var(--muted)]">
              ปกติรันเองตามเวลา — กดเพื่อรันเดี๋ยวนี้ (ทุกงานรันซ้ำได้ปลอดภัย)
            </p>
            <div className="flex flex-wrap gap-2">
              {JOBS.map(([job, label]) => (
                <Btn
                  key={job}
                  onClick={() =>
                    run(async () => {
                      const r = await apiPost<{ result: unknown }>("/api/admin/run-job", { job });
                      toast(`${label}: ${JSON.stringify(r.result)}`);
                    })
                  }
                >
                  {label}
                </Btn>
              ))}
            </div>
          </Card>
        </>
      )}
    </Section>
  );
}
