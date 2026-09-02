import { useEffect, useState } from "react";
import { apiGet } from "../api";
import { Card, Section, Btn, useToast } from "../ui";

interface Overview {
  users: number;
  paid: number;
  free_users: number;
  pending_dictionary: number;
  pending_reports: number;
  pending_refunds: number;
  active_codes: number;
  gift_liability_days: number;
  translations_today: number;
  google_configured: boolean;
  google_characters: number;
  google_cap: number;
  revenue: Record<string, number>;
}

const money = (v: number, c: string) =>
  new Intl.NumberFormat(c === "thb" ? "th-TH" : "en-US", {
    style: "currency",
    currency: c.toUpperCase(),
  }).format(v / 100);

export function Overview() {
  const toast = useToast();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiGet<Overview>("/api/admin/overview")
      .then(setData)
      .catch((e) => toast((e as Error).message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const g = data;
  const pct = g ? Math.min(100, Math.round((g.google_characters / (g.google_cap || 1)) * 100)) : 0;
  const revenue = g
    ? Object.entries(g.revenue || {})
        .map(([c, v]) => money(v, c))
        .join(" · ") || "—"
    : "—";

  const metrics: Array<[string, string | number]> = g
    ? [
        ["ผู้ใช้ทั้งหมด", g.users],
        ["สมาชิกจ่ายเงิน", g.paid],
        ["ผู้ใช้ฟรี", g.free_users],
        ["รายรับเดือนนี้", revenue],
        ["คำแปลวันนี้", g.translations_today],
        ["Gift Code ที่เปิดอยู่", g.active_codes],
      ]
    : [];

  return (
    <Section
      title="ศูนย์จัดการ Jumsup"
      desc="ภาพรวมระบบ งานค้าง และต้นทุน"
      actions={
        <Btn onClick={load} disabled={loading}>
          {loading ? "กำลังโหลด…" : "รีเฟรช"}
        </Btn>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {metrics.map(([label, value]) => (
          <Card key={label}>
            <div className="text-xs text-[var(--muted)]">{label}</div>
            <div className="mt-1 text-xl font-bold break-words">{value}</div>
          </Card>
        ))}
      </div>

      {g && (
        <>
          <Card className="mt-3">
            <div className="flex items-center justify-between text-sm">
              <b>
                Google Translate{" "}
                {g.google_configured ? `${pct}%` : "ยังไม่ได้ตั้ง API Key"}
              </b>
              <span className="text-[var(--muted)]">
                {g.google_characters.toLocaleString()} / {g.google_cap.toLocaleString()} ตัวอักษร
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background:
                    pct >= 90 ? "var(--danger)" : pct >= 70 ? "var(--warning)" : "var(--success)",
                }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Gift Code คงค้าง {g.gift_liability_days.toLocaleString()} / 5,000 Pro-days
            </p>
          </Card>

          <Card className="mt-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-[var(--surface-2)] px-3 py-1">
                คำแปลรอตรวจ {g.pending_dictionary}
              </span>
              <span className="rounded-full bg-[var(--surface-2)] px-3 py-1">
                รายงานรอตรวจ {g.pending_reports}
              </span>
              <span className="rounded-full bg-[var(--surface-2)] px-3 py-1">
                คืนเงินรอตรวจ {g.pending_refunds}
              </span>
            </div>
          </Card>
        </>
      )}
    </Section>
  );
}
