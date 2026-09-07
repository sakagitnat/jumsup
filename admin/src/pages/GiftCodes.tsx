import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, Field, Tag, Empty, useToast, useAsync } from "../ui";

// The server only accepts A-Z, 0-9, "_" and "-" (see functions/api/admin/
// gift-code.js's INVALID_CODE / gift-codes.js's INVALID_PREFIX checks) --
// strip anything else as it's typed instead of letting the admin submit an
// invalid code and hit a raw server error code.
const sanitizeCode = (raw: string, maxLen: number) =>
  raw.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, maxLen);

interface Redeemer {
  username: string;
  user_id: string;
  redeemed_at: string;
}
interface Code {
  id: string;
  code: string;
  pro_days: number;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  redeemers: Redeemer[];
}

export function GiftCodes() {
  const toast = useToast();
  const run = useAsync();
  const [items, setItems] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const [single, setSingle] = useState({ code: "", days: "7", uses: "10", expiry: "30" });
  const [bulk, setBulk] = useState({ prefix: "LAUNCH", count: "20", days: "7", expiry: "45" });
  const [generated, setGenerated] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    apiGet<{ items: Code[] }>("/api/admin/gift-codes")
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Section title="Gift Code" desc="ดูใครใช้โค้ดไหนไปแล้วบ้าง · ภาระรวมทั้งระบบจำกัด 5,000 Pro-days">
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-sm font-bold">สร้างโค้ดเดี่ยว</h3>
          <div className="flex flex-wrap items-end gap-2">
            <Field
              label="โค้ด (ตัวพิมพ์ใหญ่/ตัวเลข/_/- อย่างน้อย 4 ตัว)"
              value={single.code}
              onChange={(e) => setSingle({ ...single, code: sanitizeCode(e.target.value, 32) })}
              placeholder="LAUNCH2026"
            />
            <Field
              label="วัน Pro"
              type="number"
              className="w-20"
              value={single.days}
              onChange={(e) => setSingle({ ...single, days: e.target.value })}
            />
            <Field
              label="จำนวนสิทธิ์"
              type="number"
              className="w-24"
              value={single.uses}
              onChange={(e) => setSingle({ ...single, uses: e.target.value })}
            />
            <Field
              label="หมดอายุใน (วัน)"
              type="number"
              className="w-28"
              value={single.expiry}
              onChange={(e) => setSingle({ ...single, expiry: e.target.value })}
            />
            <Btn
              tone="primary"
              onClick={() =>
                run(
                  () =>
                    apiPost("/api/admin/gift-code", {
                      code: single.code,
                      days: Number(single.days),
                      max_uses: Number(single.uses),
                      expiry_days: Number(single.expiry),
                    }),
                  () => {
                    toast("สร้างโค้ดแล้ว");
                    setSingle({ ...single, code: "" });
                    load();
                  },
                )
              }
            >
              สร้าง
            </Btn>
          </div>
        </Card>

        <Card>
          <h3 className="mb-2 text-sm font-bold">สร้างชุด (แจกสุ่ม/การตลาด)</h3>
          <div className="flex flex-wrap items-end gap-2">
            <Field
              label="Prefix (ตัวพิมพ์ใหญ่/ตัวเลข/_/- 2-16 ตัว)"
              value={bulk.prefix}
              onChange={(e) => setBulk({ ...bulk, prefix: sanitizeCode(e.target.value, 16) })}
            />
            <Field
              label="จำนวนโค้ด"
              type="number"
              className="w-24"
              value={bulk.count}
              onChange={(e) => setBulk({ ...bulk, count: e.target.value })}
            />
            <Field
              label="วัน Pro / โค้ด"
              type="number"
              className="w-24"
              value={bulk.days}
              onChange={(e) => setBulk({ ...bulk, days: e.target.value })}
            />
            <Field
              label="หมดอายุใน (วัน)"
              type="number"
              className="w-28"
              value={bulk.expiry}
              onChange={(e) => setBulk({ ...bulk, expiry: e.target.value })}
            />
            <Btn
              tone="primary"
              onClick={() =>
                run(
                  async () => {
                    const r = await apiPost<{ codes: string[] }>("/api/admin/gift-codes", {
                      action: "bulk_create",
                      prefix: bulk.prefix,
                      count: Number(bulk.count),
                      days: Number(bulk.days),
                      expiry_days: Number(bulk.expiry),
                    });
                    setGenerated(r.codes);
                  },
                  () => {
                    toast(`สร้าง ${bulk.count} โค้ดแล้ว`);
                    load();
                  },
                )
              }
            >
              สร้างชุด
            </Btn>
          </div>
          {generated.length > 0 && (
            <textarea
              readOnly
              value={generated.join("\n")}
              className="mt-3 h-32 w-full rounded-lg border border-[var(--line)] p-2 font-mono text-xs"
            />
          )}
        </Card>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <Empty>กำลังโหลด…</Empty>
        ) : items.length === 0 ? (
          <Empty>ยังไม่มี Gift Code</Empty>
        ) : (
          items.map((c) => (
            <Card key={c.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <b className="font-mono text-sm">{c.code}</b>
                {!c.active && <Tag tone="danger">ปิดแล้ว</Tag>}
                <small className="text-xs text-[var(--muted)]">
                  {c.pro_days} วัน · ใช้ {c.used_count}/{c.max_uses}
                  {c.expires_at &&
                    ` · หมดอายุ ${new Date(c.expires_at).toLocaleDateString("th-TH")}`}
                </small>
                {c.redeemers.length > 0 && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--primary)] hover:underline"
                    onClick={() => setOpenId(openId === c.id ? null : c.id)}
                  >
                    {openId === c.id ? "ซ่อนผู้ใช้" : `ดูผู้ใช้ (${c.redeemers.length})`}
                  </button>
                )}
                {c.active && (
                  <Btn
                    className="ml-auto"
                    onClick={() => {
                      if (confirm(`ปิดโค้ด ${c.code}?`))
                        run(
                          () => apiPost("/api/admin/gift-codes", { action: "revoke", id: c.id }),
                          load,
                        );
                    }}
                  >
                    ปิดโค้ด
                  </Btn>
                )}
              </div>
              {openId === c.id && (
                <ul className="rounded-lg bg-[var(--surface-2)] p-2 text-xs text-[var(--muted)]">
                  {c.redeemers.map((r, i) => (
                    <li key={i}>
                      <b>@{r.username}</b> · {new Date(r.redeemed_at).toLocaleString("th-TH")}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))
        )}
      </div>
    </Section>
  );
}
