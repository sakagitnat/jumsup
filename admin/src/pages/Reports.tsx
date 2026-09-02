import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, Empty, useAsync } from "../ui";

interface Report {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  status: string;
  created_at: string;
}

export function Reports() {
  const run = useAsync();
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiGet<{ items: Report[] }>("/api/admin/reports")
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resolve = (id: string, status: string) =>
    run(() => apiPost("/api/admin/reports", { id, status }), load);

  return (
    <Section title="รายงานเนื้อหา Community" desc="ตรวจโดยไม่เปิดเผยผู้รายงาน">
      {loading ? (
        <Empty>กำลังโหลด…</Empty>
      ) : items.length === 0 ? (
        <Empty>ไม่มีรายงานรอตรวจ</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <b className="block text-sm">
                  {r.content_type} · {r.content_id}
                </b>
                <small className="text-xs text-[var(--muted)]">{r.reason}</small>
              </div>
              <Btn tone="danger" onClick={() => resolve(r.id, "removed")}>
                ซ่อนเนื้อหา
              </Btn>
              <Btn onClick={() => resolve(r.id, "resolved")}>ดำเนินการแล้ว</Btn>
              <Btn onClick={() => resolve(r.id, "dismissed")}>ยกเลิก</Btn>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}
