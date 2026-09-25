import { useState } from "react";
import { useStore } from "../../store/useStore";
import { isPro, proSource } from "../../store/pro";
import { MONETIZATION_ENABLED } from "../../lib/entitlements.js";
import { openBillingPortal, submitRefundRequest } from "../../actions";
import { AccountShell } from "./AccountShell";
import { Pricing } from "../pricing/Pricing";
import { Card, Tag, Button, Modal, IconStar } from "../../ui";

export function AccountBilling() {
  const { profile, subscription, payments, refunds } = useStore((s) => ({
    profile: s.profile,
    subscription: s.subscription,
    payments: s.payments,
    refunds: s.refunds,
  }));
  const pro = isPro({ profile, subscription });
  const [refundOpen, setRefundOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelSub, setCancelSub] = useState(true);

  const lastPaid = (payments || []).find(
    (p) => (p as { status?: string }).status === "succeeded",
  ) as { amount?: number; currency?: string } | undefined;

  if (!MONETIZATION_ENABLED) {
    return (
      <AccountShell title="แพ็กเกจและการชำระเงิน">
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
              <IconStar size={20} filled />
            </span>
            <div className="flex-1">
              <b className="block text-sm">Jumsup Free</b>
              <small className="text-xs text-muted">
                ตอนนี้ใช้งานได้ฟรีทุกฟีเจอร์ ยังไม่เปิดระบบสมาชิกแบบเสียเงิน
              </small>
            </div>
          </div>
        </Card>
      </AccountShell>
    );
  }

  return (
    <AccountShell title="แพ็กเกจและการชำระเงิน">
      <Card className="mb-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
            <IconStar size={20} filled={pro} />
          </span>
          <div className="flex-1">
            <b className="block text-sm">{pro ? "Jumsup Pro" : "Jumsup Free"}</b>
            <small className="text-xs text-muted">
              สิทธิ์ปัจจุบัน: {proSource({ profile, subscription })}
              {profile?.pro_bonus_until
                ? ` · โบนัสถึง ${new Date(profile.pro_bonus_until).toLocaleDateString()}`
                : ""}
            </small>
          </div>
          {pro ? (
            <Button onClick={openBillingPortal}>จัดการสมาชิก</Button>
          ) : (
            <Tag tone="info">FREE</Tag>
          )}
        </div>
        {(payments?.length || pro) && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
            <span className="text-muted">การยกเลิก การชำระเงิน หรือรายการที่ไม่ถูกต้อง</span>
            <button
              type="button"
              className="font-semibold text-primary"
              onClick={() => setRefundOpen(true)}
            >
              ความช่วยเหลือด้านการชำระเงิน
            </button>
          </div>
        )}
        {(refunds || []).length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold">
              ประวัติคำขอ {refunds.length} รายการ
            </summary>
            <div className="mt-2 space-y-2">
              {refunds.slice(0, 5).map((r, i) => {
                const rr = r as {
                  status?: string;
                  requested_at?: string;
                  reason?: string;
                };
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-line px-3 py-2"
                  >
                    <span>
                      <b>{rr.status}</b>
                      <small className="ml-2 text-muted">
                        {rr.requested_at
                          ? new Date(rr.requested_at).toLocaleDateString()
                          : ""}{" "}
                        · {rr.reason}
                      </small>
                    </span>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </Card>

      <Pricing embedded />

      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="ขอคืนเงิน"
        footer={
          <>
            <Button onClick={() => setRefundOpen(false)}>ยกเลิก</Button>
            <Button
              variant="primary"
              disabled={reason.trim().length < 5}
              onClick={async () => {
                await submitRefundRequest(reason.trim(), cancelSub);
                setRefundOpen(false);
                setReason("");
              }}
            >
              ส่งคำขอ
            </Button>
          </>
        }
      >
        <p className="mb-3 rounded-lg bg-surface-2 p-3 text-sm text-muted">
          คำขอนี้จะส่งให้ผู้ดูแลตรวจสอบก่อน ไม่มีการคืนเงินอัตโนมัติ
          {lastPaid?.amount != null && (
            <>
              <br />
              รายการล่าสุด: {(lastPaid.amount / 100).toFixed(2)}{" "}
              {String(lastPaid.currency || "").toUpperCase()}
            </>
          )}
        </p>
        <label className="block text-sm font-semibold">เหตุผลในการขอคืนเงิน</label>
        <textarea
          rows={4}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="กรุณาอธิบายเหตุผลอย่างน้อย 5 ตัวอักษร"
          className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
        />
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={cancelSub}
            onChange={(e) => setCancelSub(e.target.checked)}
          />
          <span>ถ้าเป็นการคืนเต็มจำนวน ให้ยกเลิกสมาชิกที่เกี่ยวข้องด้วย</span>
        </label>
      </Modal>
    </AccountShell>
  );
}
