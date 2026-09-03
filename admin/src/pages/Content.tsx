import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, Field, Tag, Empty, useAsync } from "../ui";

interface Item {
  id: string;
  kind: string;
  title: string;
  owner: string;
  size: number | null;
  visibility: string;
  moderation_status: string;
  exam: string | null;
  level: string | null;
  created_at: string;
  link: string;
}

interface Detail {
  kind: "vocab" | "skill";
  title: string;
  practice_kind?: string;
  text?: string;
  words?: Array<{ w: string; p: string; m: string; e: string }>;
  sections?: Array<{
    title: string;
    text: string;
    questions: Array<{ prompt: string; choices: string[]; answer?: number }>;
  }>;
  questions?: Array<{ prompt: string; choices: string[]; answer?: number }>;
}

const KINDS: Array<[string, string]> = [
  ["all", "ทุกประเภท"],
  ["vocab", "คำศัพท์"],
  ["skill", "ทักษะ"],
];
const SCOPES: Array<[string, string]> = [
  ["all", "ทั้งหมด (รวมส่วนตัว)"],
  ["public", "เฉพาะสาธารณะ"],
];

function ContentDetail({ id, kind }: { id: string; kind: string }) {
  const [d, setD] = useState<Detail | null>(null);
  const detailKind = kind === "vocab" ? "vocab" : "skill";
  useEffect(() => {
    apiGet<{ detail: Detail }>(
      `/api/admin/content?detail_id=${encodeURIComponent(id)}&detail_kind=${detailKind}`,
    )
      .then((r) => setD(r.detail))
      .catch(() => setD(null));
  }, [id, detailKind]);
  if (!d) return <p className="mt-2 text-xs text-[var(--subtle)]">กำลังโหลดเนื้อหา…</p>;

  return (
    <div className="mt-2 max-h-96 space-y-2 overflow-auto rounded-xl bg-[var(--surface-2)] p-3 text-sm">
      {d.kind === "vocab" ? (
        <table className="w-full text-xs">
          <tbody>
            {(d.words || []).map((w, i) => (
              <tr key={i} className="border-b border-[var(--line)] last:border-0">
                <td className="py-1 pr-2 font-semibold">{w.w}</td>
                <td className="py-1 pr-2 text-[var(--muted)]">{w.p}</td>
                <td className="py-1 pr-2">{w.m}</td>
                <td className="py-1 text-[var(--subtle)]">{w.e}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          {d.text && <p className="whitespace-pre-wrap text-xs text-[var(--muted)]">{d.text}</p>}
          {(d.sections || []).map((s, i) => (
            <div key={i} className="rounded-lg bg-[var(--surface)] p-2">
              {s.title && <b className="text-xs">{s.title}</b>}
              {s.text && (
                <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--muted)]">{s.text}</p>
              )}
              {s.questions.map((qq, j) => (
                <div key={j} className="mt-1 text-xs">
                  <span className="font-medium">
                    {j + 1}. {qq.prompt}
                  </span>
                  <div className="text-[var(--muted)]">
                    {qq.choices.map((c, k) => (
                      <span key={k} className={k === qq.answer ? "font-bold text-[var(--success)]" : ""}>
                        {" "}
                        [{String.fromCharCode(65 + k)}] {c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
          {(d.questions || []).map((qq, j) => (
            <div key={`f${j}`} className="text-xs">
              <span className="font-medium">
                {j + 1}. {qq.prompt}
              </span>
              <div className="text-[var(--muted)]">
                {qq.choices.map((c, k) => (
                  <span key={k} className={k === qq.answer ? "font-bold text-[var(--success)]" : ""}>
                    {" "}
                    [{String.fromCharCode(65 + k)}] {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function Content() {
  const run = useAsync();
  const [kind, setKind] = useState("all");
  const [scope, setScope] = useState("all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams({ kind, scope });
    if (q.trim()) p.set("q", q.trim());
    apiGet<{ items: Item[] }>(`/api/admin/content?${p}`)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [kind, scope]); // eslint-disable-line react-hooks/exhaustive-deps

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
      title="เนื้อหาทั้งหมด"
      desc={`ชุดของผู้ใช้ทุกคน · ${items.length} รายการ`}
      actions={
        <div className="flex flex-wrap gap-1">
          {KINDS.map(([v, label]) => (
            <Btn key={v} tone={kind === v ? "primary" : "line"} onClick={() => setKind(v)}>
              {label}
            </Btn>
          ))}
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1">
        {SCOPES.map(([v, label]) => (
          <Btn key={v} tone={scope === v ? "primary" : "line"} onClick={() => setScope(v)}>
            {label}
          </Btn>
        ))}
      </div>

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
        <Empty>ไม่มีเนื้อหา</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <Card key={`${it.kind}-${it.id}`} className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  {it.link ? (
                    <a
                      href={it.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-[var(--primary)] underline"
                    >
                      {it.title}
                    </a>
                  ) : (
                    <b className="text-sm">{it.title}</b>
                  )}
                  <div className="text-xs text-[var(--muted)]">
                    {it.kind} · เจ้าของ @{it.owner}
                    {it.size != null && ` · ${it.size} คำ`}
                    {it.exam && ` · ${it.exam}`}
                    {it.level && ` · ${it.level}`}
                  </div>
                </div>
                <Tag tone={it.visibility === "public" ? "success" : "line"}>
                  {it.visibility === "public" ? "สาธารณะ" : "ส่วนตัว"}
                </Tag>
                {it.moderation_status === "hidden" && <Tag tone="danger">ถูกซ่อน</Tag>}
              </div>

              <div className="flex flex-wrap gap-2">
                <Btn onClick={() => setOpenId(openId === it.id ? null : it.id)}>
                  {openId === it.id ? "ซ่อนเนื้อหา" : "ดูเนื้อหา"}
                </Btn>
                {it.moderation_status === "hidden" ? (
                  <Btn onClick={() => moderate(it, "unhide")}>เลิกซ่อน</Btn>
                ) : (
                  <Btn
                    tone="danger"
                    onClick={() => {
                      if (confirm(`ซ่อน "${it.title}" ออกจาก Community?`)) moderate(it, "hide");
                    }}
                  >
                    ซ่อนออกจาก Community
                  </Btn>
                )}
              </div>

              {openId === it.id && <ContentDetail id={it.id} kind={it.kind} />}
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}
