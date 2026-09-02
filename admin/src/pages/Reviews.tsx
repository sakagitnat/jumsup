import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, Tag, Empty, useAsync } from "../ui";

interface Review {
  id: string;
  username: string;
  content_type: string;
  content_id: string;
  content_title: string;
  rating: number;
  body: string;
  status: "visible" | "hidden" | "removed";
  helpful_count: number;
  creator_reply: string | null;
  created_at: string;
}

const FILTERS: Array<["" | Review["status"], string]> = [
  ["", "ทั้งหมด"],
  ["visible", "แสดงอยู่"],
  ["hidden", "ซ่อน"],
  ["removed", "ลบแล้ว"],
];

export function Reviews() {
  const run = useAsync();
  const [status, setStatus] = useState<"" | Review["status"]>("");
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiGet<{ items: Review[] }>(`/api/admin/reviews${status ? `?status=${status}` : ""}`)
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
      desc="ดูและปรับสถานะรีวิวของผู้ใช้"
      actions={
        <div className="flex gap-1">
          {FILTERS.map(([v, label]) => (
            <Btn
              key={v}
              tone={status === v ? "primary" : "line"}
              onClick={() => setStatus(v)}
            >
              {label}
            </Btn>
          ))}
        </div>
      }
    >
      {loading ? (
        <Empty>กำลังโหลด…</Empty>
      ) : items.length === 0 ? (
        <Empty>ไม่มีรีวิว</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <Card key={r.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <b>{"★".repeat(r.rating)}</b>
                <span className="text-[var(--muted)]">@{r.username}</span>
                <span className="text-[var(--subtle)]">·</span>
                <span className="min-w-0 truncate text-[var(--muted)]">{r.content_title}</span>
                {r.status !== "visible" && (
                  <Tag tone={r.status === "removed" ? "danger" : "warning"}>{r.status}</Tag>
                )}
                <span className="ml-auto text-xs text-[var(--subtle)]">
                  ปุ่มมีประโยชน์ {r.helpful_count}
                </span>
              </div>
              {r.body && <p className="text-sm">{r.body}</p>}
              {r.creator_reply && (
                <p className="rounded-lg bg-[var(--surface-2)] p-2 text-xs text-[var(--muted)]">
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
              </div>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}
