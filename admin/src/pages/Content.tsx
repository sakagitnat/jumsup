import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, Field, Tag, Empty, useAsync } from "../ui";

interface Item {
  id: string;
  kind: string;
  title: string;
  owner: string;
  size: number | null;
  moderation_status: string;
  exam: string | null;
  level: string | null;
  created_at: string;
  link: string;
}

const KINDS: Array<[string, string]> = [
  ["all", "ทั้งหมด"],
  ["vocab", "คำศัพท์"],
  ["skill", "ทักษะ"],
];

export function Content() {
  const run = useAsync();
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams({ kind });
    if (q.trim()) p.set("q", q.trim());
    apiGet<{ items: Item[] }>(`/api/admin/content?${p}`)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const moderate = (it: Item, action: "hide" | "unhide") =>
    run(
      () =>
        apiPost("/api/admin/content", {
          action,
          kind: it.kind === "vocab" ? "vocab" : "skill",
          id: it.id,
        }),
      load,
    );

  return (
    <Section
      title="เนื้อหาสาธารณะ (คู่ขนาน Community)"
      desc="ชุดทั้งหมดที่เผยแพร่อยู่ · ซ่อนได้เลยโดยไม่ต้องรอรายงาน"
      actions={
        <div className="flex gap-1">
          {KINDS.map(([v, label]) => (
            <Btn key={v} tone={kind === v ? "primary" : "line"} onClick={() => setKind(v)}>
              {label}
            </Btn>
          ))}
        </div>
      }
    >
      <Card className="mb-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <Field
            label="ค้นหา (ชื่อชุด / เจ้าของ)"
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
      ) : items.length === 0 ? (
        <Empty>ไม่มีเนื้อหาสาธารณะ</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <Card key={`${it.kind}-${it.id}`} className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <a
                  href={it.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-[var(--primary)] underline"
                >
                  {it.title}
                </a>
                <div className="text-xs text-[var(--muted)]">
                  {it.kind} · เจ้าของ @{it.owner}
                  {it.size != null && ` · ${it.size} คำ`}
                  {it.exam && ` · ${it.exam}`}
                  {it.level && ` · ${it.level}`}
                </div>
              </div>
              {it.moderation_status === "hidden" ? (
                <>
                  <Tag tone="danger">ถูกซ่อน</Tag>
                  <Btn onClick={() => moderate(it, "unhide")}>เลิกซ่อน</Btn>
                </>
              ) : (
                <Btn
                  tone="danger"
                  onClick={() => {
                    if (confirm(`ซ่อน "${it.title}" ออกจาก Community?`)) moderate(it, "hide");
                  }}
                >
                  ซ่อนเนื้อหา
                </Btn>
              )}
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}
