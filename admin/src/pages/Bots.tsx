import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, Field, Tag, Empty, useToast, useAsync } from "../ui";

interface Bot {
  id: string;
  name: string;
  factor: number;
  base_xp: number;
  active: boolean;
  hidden: boolean;
}
interface PreviewRow {
  username: string;
  xp: number;
  rank: number;
}

export function Bots() {
  const toast = useToast();
  const run = useAsync();
  const [items, setItems] = useState<Bot[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [factor, setFactor] = useState("0.8");

  const load = () => {
    setLoading(true);
    apiGet<{ items: Bot[]; preview: PreviewRow[] }>("/api/admin/bots")
      .then((d) => {
        setItems(d.items);
        setPreview(d.preview || []);
      })
      .catch((e) => toast((e as Error).message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (id: string, patch: object) =>
    run(() => apiPost("/api/admin/bots", { action: "update", id, ...patch }), load);

  return (
    <Section
      title="บอทลีดเดอร์บอร์ด"
      desc="บอทโผล่บนกระดานเฉพาะตอนผู้เล่นจริง < 15 คน · คะแนน = ตัวคูณ × XP ผู้เล่น (ขั้นต่ำอิง 150)"
      actions={
        <Btn onClick={load} disabled={loading}>
          รีเฟรช
        </Btn>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Card className="mb-3">
            <div className="flex flex-wrap items-end gap-2">
              <Field
                label="ชื่อบอทใหม่"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น พี่เก่ง"
              />
              <Field
                label="ตัวคูณ (0–5)"
                type="number"
                step="0.05"
                value={factor}
                onChange={(e) => setFactor(e.target.value)}
                className="w-24"
              />
              <Btn
                tone="primary"
                disabled={!name.trim() || !(Number(factor) > 0)}
                onClick={() =>
                  run(
                    () =>
                      apiPost("/api/admin/bots", {
                        action: "create",
                        name: name.trim(),
                        factor: Number(factor),
                      }),
                    () => {
                      setName("");
                      load();
                    },
                  )
                }
              >
                เพิ่ม
              </Btn>
            </div>
          </Card>

          {loading ? (
            <Empty>กำลังโหลด…</Empty>
          ) : items.length === 0 ? (
            <Empty>ยังไม่มีบอท</Empty>
          ) : (
            <div className="space-y-2">
              {items.map((b) => (
                <Card key={b.id} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      defaultValue={b.name}
                      className="min-w-0 flex-1 rounded-lg border border-[var(--line)] px-2 py-1 text-sm font-semibold"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== b.name) update(b.id, { name: v });
                      }}
                    />
                    {b.active ? <Tag tone="success">เปิด</Tag> : <Tag>ปิด</Tag>}
                    {b.hidden && <Tag tone="warning">ซ่อนชื่อ</Tag>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <label className="flex items-center gap-1">
                      ตัวคูณ
                      <input
                        type="number"
                        step="0.05"
                        defaultValue={b.factor}
                        className="w-20 rounded-lg border border-[var(--line)] px-2 py-1 text-sm text-[var(--text)]"
                        onBlur={(e) => {
                          const f = Number(e.target.value);
                          if (f > 0 && f !== b.factor) update(b.id, { factor: f });
                        }}
                      />
                    </label>
                    <Btn onClick={() => update(b.id, { active: !b.active })}>
                      {b.active ? "ปิด" : "เปิด"}
                    </Btn>
                    <Btn onClick={() => update(b.id, { hidden: !b.hidden })}>
                      {b.hidden ? "แสดงชื่อ" : "ซ่อนชื่อ"}
                    </Btn>
                    <Btn
                      tone="danger"
                      onClick={() => {
                        if (confirm(`ลบบอท "${b.name}"?`))
                          run(
                            () => apiPost("/api/admin/bots", { action: "delete", id: b.id }),
                            load,
                          );
                      }}
                    >
                      ลบ
                    </Btn>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Card>
          <h3 className="mb-2 text-sm font-bold">ลีดเดอร์บอร์ดตอนนี้ (มุมมองผู้เล่นทั่วไป)</h3>
          {preview.length === 0 ? (
            <p className="text-sm text-[var(--subtle)]">ไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-1">
              {preview.map((row) => (
                <div
                  key={`${row.rank}-${row.username}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm odd:bg-[var(--surface-2)]"
                >
                  <span className="w-6 text-center font-bold tabular-nums">{row.rank}</span>
                  <span className="min-w-0 flex-1 truncate">{row.username}</span>
                  <span className="tabular-nums text-[var(--muted)]">{row.xp} XP</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Section>
  );
}
