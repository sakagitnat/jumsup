import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, Empty, useAsync } from "../ui";

interface Suggestion {
  id: number;
  source_word: string;
  target_language: string;
  suggested_meaning: string;
}

export function Dictionary() {
  const run = useAsync();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const edits = useRef<Record<number, string>>({});

  const load = () => {
    setLoading(true);
    apiGet<{ items: Suggestion[] }>("/api/admin/dictionary")
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = (s: Suggestion, action: "approve" | "reject") =>
    run(
      () =>
        apiPost("/api/admin/dictionary", {
          id: s.id,
          action,
          meaning: edits.current[s.id] ?? s.suggested_meaning,
        }),
      load,
    );

  return (
    <Section title="คำแปลชุมชน" desc="ตรวจก่อนเผยแพร่เข้าพจนานุกรม">
      {loading ? (
        <Empty>กำลังโหลด…</Empty>
      ) : items.length === 0 ? (
        <Empty>ไม่มีคำแปลรอตรวจ</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <Card key={s.id} className="space-y-2">
              <div className="flex items-baseline gap-2">
                <b className="text-sm">{s.source_word}</b>
                <small className="text-xs text-[var(--muted)]">{s.target_language}</small>
              </div>
              <input
                defaultValue={s.suggested_meaning}
                onChange={(e) => (edits.current[s.id] = e.target.value)}
                className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <Btn tone="primary" onClick={() => decide(s, "approve")}>
                  อนุมัติ
                </Btn>
                <Btn onClick={() => decide(s, "reject")}>ปฏิเสธ</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}
