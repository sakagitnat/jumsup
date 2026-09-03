import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, Field, Tag, Empty, useAsync } from "../ui";

interface Review {
  id: string;
  username: string;
  nickname: string;
  content_type: string;
  content_id: string;
  content_title: string;
  set_owner: string;
  set_visibility: string;
  set_link: string;
  rating: number;
  body: string;
  status: "visible" | "hidden" | "removed";
  helpful_count: number;
  anonymous: boolean;
  creator_reply: string | null;
  creator_replied_at: string | null;
  created_at: string;
  updated_at: string;
}

const FILTERS: Array<["" | Review["status"], string]> = [
  ["", "ทั้งหมด"],
  ["visible", "แสดงอยู่"],
  ["hidden", "ซ่อน"],
  ["removed", "ลบแล้ว"],
];

const fmt = (s: string) => new Date(s).toLocaleString("th-TH");

function ReviewCard({ r, reload }: { r: Review; reload: () => void }) {
  const run = useAsync();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(r.body);
  const [rating, setRating] = useState(r.rating);
  const [editReply, setEditReply] = useState(false);
  const [reply, setReply] = useState(r.creator_reply || "");

  const setStatus = (s: Review["status"]) =>
    run(() => apiPost("/api/admin/reviews", { action: "set_status", id: r.id, status: s }), reload);

  return (
    <Card className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <b className="text-[var(--warning)]">{"★".repeat(r.rating)}</b>
        <span>
          <b>{r.nickname || r.username}</b>{" "}
          <span className="text-xs font-normal text-[var(--subtle)]">@{r.username}</span>
          {r.anonymous && (
            <span className="ml-1 text-xs text-[var(--subtle)]">(ซ่อนชื่อจากผู้สร้าง)</span>
          )}
        </span>
        {r.status !== "visible" && (
          <Tag tone={r.status === "removed" ? "danger" : "warning"}>{r.status}</Tag>
        )}
        <span className="ml-auto text-xs text-[var(--subtle)]">
          {fmt(r.created_at)}
          {r.updated_at !== r.created_at && " · แก้ไขแล้ว"} · มีประโยชน์ {r.helpful_count}
        </span>
      </div>

      {editing ? (
        <div className="space-y-2 rounded-lg bg-[var(--surface-2)] p-2">
          <div className="flex items-center gap-2 text-xs">
            คะแนน
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="rounded-lg border border-[var(--line)] px-2 py-1 text-sm"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} ดาว
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={body}
            maxLength={1000}
            onChange={(e) => setBody(e.target.value)}
            className="h-24 w-full rounded-lg border border-[var(--line)] p-2 text-sm"
          />
          <div className="flex gap-2">
            <Btn
              tone="primary"
              onClick={() =>
                run(
                  () =>
                    apiPost("/api/admin/reviews", {
                      action: "edit",
                      id: r.id,
                      body,
                      rating,
                    }),
                  () => {
                    setEditing(false);
                    reload();
                  },
                )
              }
            >
              บันทึก
            </Btn>
            <Btn onClick={() => setEditing(false)}>ยกเลิก</Btn>
          </div>
        </div>
      ) : (
        r.body && <p className="text-sm">{r.body}</p>
      )}

      {editReply ? (
        <div className="space-y-2 rounded-lg border-l-2 border-[var(--primary)] bg-[var(--primary-soft)] p-2">
          <textarea
            value={reply}
            maxLength={1000}
            placeholder="คำตอบของผู้สร้าง (เว้นว่าง = ลบ)"
            onChange={(e) => setReply(e.target.value)}
            className="h-20 w-full rounded-lg border border-[var(--line)] p-2 text-sm"
          />
          <div className="flex gap-2">
            <Btn
              tone="primary"
              onClick={() =>
                run(
                  () =>
                    apiPost("/api/admin/reviews", { action: "edit_reply", id: r.id, reply }),
                  () => {
                    setEditReply(false);
                    reload();
                  },
                )
              }
            >
              บันทึกคำตอบ
            </Btn>
            <Btn onClick={() => setEditReply(false)}>ยกเลิก</Btn>
          </div>
        </div>
      ) : (
        r.creator_reply && (
          <p className="rounded-lg border-l-2 border-[var(--primary)] bg-[var(--primary-soft)] p-2 text-xs">
            ผู้สร้างตอบ: {r.creator_reply}
          </p>
        )
      )}

      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => setEditing((v) => !v)}>แก้ไขข้อความ</Btn>
        <Btn onClick={() => setEditReply((v) => !v)}>
          {r.creator_reply ? "แก้ไขคำตอบผู้สร้าง" : "เพิ่มคำตอบผู้สร้าง"}
        </Btn>
        {r.status !== "visible" && <Btn onClick={() => setStatus("visible")}>คืนค่าให้แสดง</Btn>}
        {r.status !== "hidden" && <Btn onClick={() => setStatus("hidden")}>ซ่อน</Btn>}
        {r.status !== "removed" && (
          <Btn
            tone="danger"
            onClick={() => {
              if (confirm("ลบรีวิวนี้?")) setStatus("removed");
            }}
          >
            ลบ
          </Btn>
        )}
      </div>
    </Card>
  );
}

export function Reviews() {
  const [status, setStatus] = useState<"" | Review["status"]>("");
  const [q, setQ] = useState("");
  const [grouped, setGrouped] = useState(true);
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    apiGet<{ items: Review[] }>(`/api/admin/reviews?${params}`)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    const map = new Map<string, { title: string; owner: string; link: string; visibility: string; rows: Review[] }>();
    for (const r of items) {
      const key = `${r.content_type}:${r.content_id}`;
      if (!map.has(key))
        map.set(key, {
          title: r.content_title,
          owner: r.set_owner,
          link: r.set_link,
          visibility: r.set_visibility,
          rows: [],
        });
      map.get(key)!.rows.push(r);
    }
    return [...map.values()].sort((a, b) => b.rows.length - a.rows.length);
  }, [items]);

  return (
    <Section
      title="รีวิว / คอมเมนต์"
      desc="ดู แก้ไขข้อความ/คะแนน ตอบแทนผู้สร้าง ซ่อน หรือลบ"
      actions={
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(([v, label]) => (
            <Btn key={v} tone={status === v ? "primary" : "line"} onClick={() => setStatus(v)}>
              {label}
            </Btn>
          ))}
          <Btn tone={grouped ? "primary" : "line"} onClick={() => setGrouped((v) => !v)}>
            จัดกลุ่มตามชุด
          </Btn>
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
            label="ค้นหา (ผู้รีวิว / เจ้าของชุด / ชื่อชุด / ข้อความ)"
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
        <Empty>ไม่มีรีวิว</Empty>
      ) : grouped ? (
        <div className="space-y-6">
          {groups.map((grp) => (
            <div key={grp.link}>
              <div className="mb-2 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm">
                {grp.link ? (
                  <a
                    href={grp.link}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[var(--primary)] underline"
                  >
                    {grp.title}
                  </a>
                ) : (
                  <b>{grp.title}</b>
                )}{" "}
                <span className="text-xs text-[var(--muted)]">
                  · เจ้าของ @{grp.owner} · {grp.visibility} · {grp.rows.length} รีวิว
                  {!grp.link && " · (เปิดหน้าไม่ได้: ส่วนตัว/ถูกซ่อน)"}
                </span>
              </div>
              <div className="space-y-2 border-l-2 border-[var(--line)] pl-3">
                {grp.rows.map((r) => (
                  <ReviewCard key={r.id} r={r} reload={load} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id}>
              <div className="mb-1 rounded-lg bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--muted)]">
                รีวิวชุด{" "}
                {r.set_link ? (
                  <a href={r.set_link} target="_blank" rel="noreferrer" className="font-semibold text-[var(--primary)] underline">
                    {r.content_title}
                  </a>
                ) : (
                  <b className="text-[var(--text)]">{r.content_title}</b>
                )}{" "}
                · เจ้าของ @{r.set_owner}
                {!r.set_link && " · (เปิดหน้าไม่ได้)"}
              </div>
              <ReviewCard r={r} reload={load} />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
