import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Card, Section, Btn, Tag, Empty, useToast, useAsync } from "../ui";

interface Refund {
  id: string;
  reason: string;
  profiles?: { username?: string };
  payment_events?: { amount?: number; currency?: string };
  prior_granted?: number;
  prior_rejected?: number;
}

const money = (v: number, c: string) =>
  new Intl.NumberFormat(c === "thb" ? "th-TH" : "en-US", {
    style: "currency",
    currency: (c || "thb").toUpperCase(),
  }).format(v / 100);

export function Refunds() {
  const toast = useToast();
  const run = useAsync();
  const [items, setItems] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiGet<{ refunds: Refund[] }>("/api/admin/refunds")
      .then((d) => setItems(d.refunds || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Section title="คำขอคืนเงิน" desc="การคืนเงินจริงผ่าน Stripe ย้อนกลับไม่ได้ และถูกบันทึก Audit Log">
      {loading ? (
        <Empty>กำลังโหลด…</Empty>
      ) : items.length === 0 ? (
        <Empty>ไม่มีคำขอรอตรวจ</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <b className="text-sm">@{r.profiles?.username || "user"}</b>
                  {(r.prior_granted ?? 0) > 0 && (
                    <Tag tone="danger">เคยคืนเงินแล้ว {r.prior_granted} ครั้ง</Tag>
                  )}
                  {(r.prior_rejected ?? 0) > 0 && (
                    <Tag tone="warning">เคยถูกปฏิเสธ {r.prior_rejected} ครั้ง</Tag>
                  )}
                </div>
                <small className="text-xs text-[var(--muted)]">
                  {r.reason}
                  {r.payment_events?.amount != null &&
                    ` · ${money(r.payment_events.amount, r.payment_events.currency || "thb")}`}
                </small>
              </div>
              <Btn
                tone="danger"
                onClick={() => {
                  if (!confirm("ยืนยันคืนเงินเต็มจำนวนผ่าน Stripe? ย้อนกลับไม่ได้")) return;
                  run(
                    () =>
                      apiPost("/api/admin/refund-action", {
                        action: "approve",
                        refund_request_id: r.id,
                      }),
                    () => {
                      toast("ส่งคำสั่งคืนเงินแล้ว");
                      load();
                    },
                  );
                }}
              >
                คืนเต็มจำนวน
              </Btn>
              <Btn
                onClick={() => {
                  const note = prompt("เหตุผลที่ปฏิเสธ", "ไม่เข้าเงื่อนไขนโยบายคืนเงิน");
                  if (!note) return;
                  run(
                    () =>
                      apiPost("/api/admin/refund-action", {
                        action: "reject",
                        refund_request_id: r.id,
                        admin_note: note,
                      }),
                    load,
                  );
                }}
              >
                ปฏิเสธ
              </Btn>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}
