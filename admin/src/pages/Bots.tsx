import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, Field, Tag, Empty, useToast, useAsync } from "../ui";
import { friendlyError } from "../errors";

interface Bot {
  id: string;
  name: string;
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
  const [xp, setXp] = useState("300");

  const load = () => {
    setLoading(true);
    apiGet<{ items: Bot[]; preview: PreviewRow[] }>("/api/admin/bots")
      .then((d) => {
        setItems(d.items);
        setPreview(d.preview || []);
      })
      .catch((e) => toast(friendlyError((e as Error).message)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (id: string, patch: object) =>
    run(() => apiPost("/api/admin/bots", { action: "update", id, ...patch }), load);

  return (
    <Section
      title="บอทลีดเดอร์บอร์ด"
      desc="บอทช่วยให้กระดานไม่ว่างตอนผู้เล่นจริงยังน้อย"
      actions={
        <Btn onClick={load} disabled={loading}>
          รีเฟรช
        </Btn>
      }
    >
      <Card className="mb-4 text-sm text-[var(--muted)]">
        <b className="text-[var(--text)]">แต่ละบอทมีคะแนน XP ต่อสัปดาห์แบบตายตัว</b> —{" "}
        ผู้เล่น <b>ทุกคนเห็นกระดานเดียวกัน</b> (มีบวกลบสุ่มเล็กน้อยไม่เกิน ±12 คงที่ต่อสัปดาห์) ·
        บอททั้งหมดจะโผล่บนกระดาน <b>เฉพาะตอนผู้เล่นจริง &lt; 15 คน</b> พอถึงเกณฑ์จะซ่อนเองอัตโนมัติ ·
        ปุ่ม "ซ่อนชื่อ" ทำให้บอทตัวนั้นแสดงเป็น "ผู้เรียน #xxxx" เหมือนคนที่ตั้งค่าซ่อนชื่อ
      </Card>

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
                label="XP ต่อสัปดาห์"
                type="number"
                value={xp}
                onChange={(e) => setXp(e.target.value)}
                className="w-28"
              />
              <Btn
                tone="primary"
                disabled={!name.trim() || !(Number(xp) >= 1)}
                onClick={() =>
                  run(
                    () =>
                      apiPost("/api/admin/bots", {
                        action: "create",
                        name: name.trim(),
                        base_xp: Number(xp),
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
                      XP/สัปดาห์
                      <input
                        type="number"
                        defaultValue={b.base_xp}
                        className="w-24 rounded-lg border border-[var(--line)] px-2 py-1 text-sm text-[var(--text)]"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v >= 1 && v !== b.base_xp) update(b.id, { base_xp: v });
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
          <h3 className="mb-2 text-sm font-bold">ลีดเดอร์บอร์ดตอนนี้ (ที่ผู้เล่นทุกคนเห็น)</h3>
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
