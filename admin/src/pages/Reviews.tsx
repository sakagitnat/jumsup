import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, Field, Tag, Empty, useAsync } from "../ui";

interface Review {
  id: string;
  username: string;
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

export function Reviews() {
  const run = useAsync();
  const [status, setStatus] = useState<"" | Review["status"]>("");
  const [q, setQ] = useState("");
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

  const setReviewStatus = (id: string, s: Review["status"]) =>
    run(() => apiPost("/api/admin/reviews", { action: "set_status", id, status: s }), load);

  return (
    <Section
      title="รีวิว"
      desc="รีวิวทั้งหมดจากผู้ใช้ พร้อมชุดที่ถูกรีวิวและเจ้าของชุด"
      actions={
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(([v, label]) => (
            <Btn key={v} tone={status === v ? "primary" : "line"} onClick={() => setStatus(v)}>
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
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <Card key={r.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <b className="text-[var(--warning)]">{"★".repeat(r.rating)}</b>
                <span>
                  <b>@{r.username}</b>
                  {r.anonymous && (
                    <span className="ml-1 text-xs text-[var(--subtle)]">(ซ่อนชื่อจากผู้สร้าง)</span>
                  )}
                </span>
                {r.status !== "visible" && (
                  <Tag tone={r.status === "removed" ? "danger" : "warning"}>{r.status}</Tag>
                )}
              </div>

              <div className="rounded-lg bg-[var(--surface-2)] p-2 text-xs text-[var(--muted)]">
                รีวิวชุด{" "}
                <a href={r.set_link} target="_blank" rel="noreferrer" className="font-semibold text-[var(--primary)] underline">
                  {r.content_title}
                </a>{" "}
                ({r.content_type}) · เจ้าของ <b>@{r.set_owner}</b> · การมองเห็น {r.set_visibility}
                <br />
                สร้าง {fmt(r.created_at)}
                {r.updated_at !== r.created_at && ` · แก้ไข ${fmt(r.updated_at)}`} · มีประโยชน์{" "}
                {r.helpful_count}
              </div>

              {r.body && <p className="text-sm">{r.body}</p>}
              {r.creator_reply && (
                <p className="rounded-lg border-l-2 border-[var(--primary)] bg-[var(--primary-soft)] p-2 text-xs">
                  ผู้สร้างตอบ: {r.creator_reply}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {r.status !== "visible" && (
                  <Btn onClick={() => setReviewStatus(r.id, "visible")}>คืนค่าให้แสดง</Btn>
                )}
                {r.status !== "hidden" && (
                  <Btn onClick={() => setReviewStatus(r.id, "hidden")}>ซ่อน</Btn>
                )}
                {r.status !== "removed" && (
                  <Btn
                    tone="danger"
                    onClick={() => {
                      if (confirm("ลบรีวิวนี้?")) setReviewStatus(r.id, "removed");
                    }}
                  >
                    ลบ
                  </Btn>
                )}
                {r.creator_reply && (
                  <Btn
                    onClick={() =>
                      run(
                        () => apiPost("/api/admin/reviews", { action: "clear_reply", id: r.id }),
                        load,
                      )
                    }
                  >
                    ลบคำตอบผู้สร้าง
                  </Btn>
                )}
                <a
                  href={r.set_link}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-[var(--line)] px-3.5 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]"
                >
                  เปิดหน้าชุด ↗
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}
