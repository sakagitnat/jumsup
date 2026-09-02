import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, Field, Tag, Empty, useToast, useAsync } from "../ui";

interface Code {
  id: string;
  code: string;
  pro_days: number;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  active: boolean;
}

export function GiftCodes() {
  const toast = useToast();
  const run = useAsync();
  const [items, setItems] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);

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
    <Section title="Gift Code" desc="ภาระรวมทั้งระบบจำกัด 5,000 Pro-days">
      <Card className="mb-3">
        <h3 className="mb-2 text-sm font-bold">สร้างโค้ดเดี่ยว</h3>
        <div className="flex flex-wrap items-end gap-2">
          <Field
            label="โค้ด"
            value={single.code}
            onChange={(e) => setSingle({ ...single, code: e.target.value.toUpperCase() })}
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

      <Card className="mb-4">
        <h3 className="mb-2 text-sm font-bold">สร้างชุด (แจกสุ่ม/การตลาด)</h3>
        <div className="flex flex-wrap items-end gap-2">
          <Field
            label="Prefix"
            value={bulk.prefix}
            onChange={(e) => setBulk({ ...bulk, prefix: e.target.value.toUpperCase() })}
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
            className="mt-3 h-40 w-full rounded-lg border border-[var(--line)] p-2 font-mono text-xs"
          />
        )}
      </Card>

      {loading ? (
        <Empty>กำลังโหลด…</Empty>
      ) : items.length === 0 ? (
        <Empty>ยังไม่มี Gift Code</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center gap-3">
              <b className="font-mono text-sm">{c.code}</b>
              {!c.active && <Tag tone="danger">ปิดแล้ว</Tag>}
              <small className="text-xs text-[var(--muted)]">
                {c.pro_days} วัน · ใช้ {c.used_count}/{c.max_uses}
                {c.expires_at &&
                  ` · หมดอายุ ${new Date(c.expires_at).toLocaleDateString("th-TH")}`}
              </small>
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
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}
