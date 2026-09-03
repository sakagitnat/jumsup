import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { apiGet } from "../api";
import { Card, Section, Btn, Tag, Empty, useToast } from "../ui";

interface Row {
  user_id: string;
  name: string;
  peak_day_xp: number;
  window_xp: number;
  active_days: number;
  max_same_set_day: number;
  lifetime_xp: number;
  account_created: string;
  banned: boolean;
  flags: string[];
}
interface Payload {
  since: string | null;
  days: number;
  items: Row[];
}

const FLAG_LABEL: Record<string, string> = {
  xp_spike: "XP พุ่งใน 1 วัน",
  set_farming: "ทำชุดเดิมซ้ำรัว",
  fast_new_account: "บัญชีใหม่โตเร็ว",
  earning_while_banned: "ได้ XP ทั้งที่ถูกแบน",
};

export function XpIntegrity() {
  const toast = useToast();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  const load = (d = days) => {
    setLoading(true);
    apiGet<Payload>(`/api/admin/xp-integrity?days=${d}`)
      .then(setData)
      .catch((e) => toast((e as Error).message))
      .finally(() => setLoading(false));
  };
  useEffect(() => load(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Section
      title="ตรวจความผิดปกติ XP"
      desc="สแกน xp_events หาผู้ใช้ที่รูปแบบการได้ XP ดูผิดปกติ · เป็นสัญญาณเตือน ไม่ได้ลงโทษอัตโนมัติ"
      actions={
        <div className="flex gap-1">
          {[7, 14, 30].map((d) => (
            <Btn
              key={d}
              tone={days === d ? "primary" : "line"}
              onClick={() => {
                setDays(d);
                load(d);
              }}
            >
              {d} วัน
            </Btn>
          ))}
        </div>
      }
    >
      <Card className="mb-4 text-sm text-[var(--muted)]">
        เกณฑ์ที่จับ: <b className="text-[var(--text)]">XP พุ่ง</b> &gt; 800/วัน ·{" "}
        <b className="text-[var(--text)]">ฟาร์มชุดเดิม</b> ทำชุดข้อสอบเดิม ≥ 6 ครั้งในวันเดียว ·{" "}
        <b className="text-[var(--text)]">บัญชีใหม่โตเร็ว</b> สมัคร &lt; 3 วันแต่ได้ &gt; 500 XP ·{" "}
        <b className="text-[var(--text)]">ได้ XP ทั้งที่ถูกแบน</b>
      </Card>

      {loading ? (
        <Empty>กำลังสแกน…</Empty>
      ) : !data || data.items.length === 0 ? (
        <Empty>ไม่พบผู้ใช้ที่เข้าเกณฑ์ในช่วง {data?.days ?? days} วัน</Empty>
      ) : (
        <div className="space-y-2">
          {data.items.map((r) => (
            <Card key={r.user_id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-sm">{r.name}</b>
                {r.banned && <Tag tone="danger">ถูกแบน</Tag>}
                {r.flags.map((f) => (
                  <Tag key={f} tone="warning">
                    {FLAG_LABEL[f] || f}
                  </Tag>
                ))}
                <NavLink
                  to={`/users?q=${encodeURIComponent(r.name)}`}
                  className="ml-auto text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  จัดการผู้ใช้ →
                </NavLink>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--muted)]">
                <span>XP สูงสุด/วัน: <b className="text-[var(--text)]">{r.peak_day_xp.toLocaleString()}</b></span>
                <span>XP ช่วงนี้: <b className="text-[var(--text)]">{r.window_xp.toLocaleString()}</b></span>
                <span>วันที่ active: <b className="text-[var(--text)]">{r.active_days}</b></span>
                <span>ทำชุดเดิมสูงสุด/วัน: <b className="text-[var(--text)]">{r.max_same_set_day}</b></span>
                <span>XP รวมทั้งหมด: <b className="text-[var(--text)]">{r.lifetime_xp.toLocaleString()}</b></span>
                <span>
                  สมัคร:{" "}
                  <b className="text-[var(--text)]">
                    {new Date(r.account_created).toLocaleDateString("th-TH")}
                  </b>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}
