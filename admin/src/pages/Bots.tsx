import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, Field, Tag, Empty, useToast, useAsync } from "../ui";

interface Bot {
  id: string;
  name: string;
  factor: number;
  base_xp: number;
  active: boolean;
}

export function Bots() {
  const toast = useToast();
  const run = useAsync();
  const [items, setItems] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [factor, setFactor] = useState("0.8");

  const load = () => {
    setLoading(true);
    apiGet<{ items: Bot[] }>("/api/admin/bots")
      .then((d) => setItems(d.items))
      .catch((e) => toast((e as Error).message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Section
      title="บอทลีดเดอร์บอร์ด"
      desc="บอทโผล่บนกระดานเฉพาะตอนผู้เล่นจริง < 15 คน คะแนน = ตัวคูณ × XP ผู้เล่น (ขั้นต่ำอิง 150)"
      actions={
        <Btn onClick={load} disabled={loading}>
          รีเฟรช
        </Btn>
      }
    >
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-2">
          <Field
            label="ชื่อบอท"
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
            className="w-28"
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
            เพิ่มบอท
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
            <Card key={b.id} className="flex flex-wrap items-center gap-3">
              <b className="min-w-0 flex-1 truncate text-sm">{b.name}</b>
              {b.active ? <Tag tone="success">เปิด</Tag> : <Tag>ปิด</Tag>}
              <label className="flex items-center gap-1 text-xs text-[var(--muted)]">
                ตัวคูณ
                <input
                  type="number"
                  step="0.05"
                  defaultValue={b.factor}
                  className="w-20 rounded-lg border border-[var(--line)] px-2 py-1 text-sm text-[var(--text)]"
                  onBlur={(e) => {
                    const f = Number(e.target.value);
                    if (f !== b.factor && f > 0)
                      run(
                        () => apiPost("/api/admin/bots", { action: "update", id: b.id, factor: f }),
                        load,
                      );
                  }}
                />
              </label>
              <Btn
                onClick={() =>
                  run(
                    () =>
                      apiPost("/api/admin/bots", {
                        action: "update",
                        id: b.id,
                        active: !b.active,
                      }),
                    load,
                  )
                }
              >
                {b.active ? "ปิด" : "เปิด"}
              </Btn>
              <Btn
                tone="danger"
                onClick={() => {
                  if (!confirm(`ลบบอท "${b.name}"?`)) return;
                  run(() => apiPost("/api/admin/bots", { action: "delete", id: b.id }), load);
                }}
              >
                ลบ
              </Btn>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}
