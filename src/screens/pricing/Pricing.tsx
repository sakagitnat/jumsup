import { useStore } from "../../store/useStore";
import { isPro } from "../../store/pro";
import { PLANS, money } from "../../lib/plans.js";
import { loginGoogle } from "../../actions/auth";
import { startCheckout, openBillingPortal } from "../../actions/billing";
import { PageHeader, Card, Tag, Button, cx, IconCheck } from "../../ui";

function Features({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {items.map((x, i) => (
        <li key={i} className="flex gap-2">
          <IconCheck size={16} className="mt-0.5 shrink-0 text-success" />
          <span className="text-muted">{x}</span>
        </li>
      ))}
    </ul>
  );
}

export function Pricing({ embedded = false }: { embedded?: boolean }) {
  const { profile, subscription, user, lang } = useStore((s) => ({
    profile: s.profile,
    subscription: s.subscription,
    user: s.user,
    lang: s.lang,
  }));
  const pro = isPro({ profile, subscription });
  const loggedIn = Boolean(user);
  const currency = lang === "th" ? "THB" : "USD";
  const { free, monthly, yearly } = PLANS;

  return (
    <>
      {!embedded && (
        <PageHeader
          eyebrow="MEMBERSHIP"
          title="เลือกแพ็กเกจที่เหมาะกับคุณ"
          description="เริ่มใช้ฟรีได้จริง และอัปเกรดเมื่ออยากฝึกได้มากขึ้น"
        />
      )}

      <Card soft className="mb-5">
        <Tag tone="success">Stripe · ชำระเงินจริงอย่างปลอดภัยผ่าน Stripe</Tag>
        <h2 className="mt-2 text-lg font-semibold">เรียนต่อเนื่องในราคาที่เข้าถึงได้</h2>
        <p className="text-sm text-muted">
          {`ราคาจะแสดงเป็น ${currency} ตามภาษาที่คุณเลือก และตรงกับ Stripe Checkout`}
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wide text-subtle">เริ่มต้น</span>
          <h2 className="mt-1 text-lg font-semibold">{free.name}</h2>
          <div className="mt-3 flex items-baseline gap-2">
            <strong className="text-2xl">{money(0, currency)}</strong>
            <span className="text-sm text-muted">ตลอดไป</span>
          </div>
          <Features items={free.features} />
          <Button
            className="mt-4"
            disabled={loggedIn}
            onClick={loggedIn ? undefined : loginGoogle}
          >
            {loggedIn ? "ใช้งาน Free อยู่" : "สมัครฟรีด้วย Google"}
          </Button>
        </Card>

        <Card className={cx("relative flex flex-col", "border-primary-border")}>
          <span className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-on-primary">
            คุ้มที่สุด
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-subtle">รายปี</span>
          <h2 className="mt-1 text-lg font-semibold">{yearly.name}</h2>
          <div className="mt-3 flex items-baseline gap-2">
            <strong className="text-2xl">{money(yearly.prices[currency], currency)}</strong>
            <span className="text-sm text-muted">/ {yearly.period?.[currency]}</span>
          </div>
          <p className="mt-1 text-xs text-subtle">
            เฉลี่ย {money(yearly.monthlyEquivalent?.[currency] ?? 0, currency)}/เดือน · ประหยัดประมาณ 33%
          </p>
          <Features items={yearly.features} />
          <Button
            variant="primary"
            className="mt-4"
            onClick={
              pro ? openBillingPortal : loggedIn ? () => startCheckout("yearly") : loginGoogle
            }
          >
            {pro ? "จัดการสมาชิก" : loggedIn ? "เลือก Pro รายปี" : "เข้าสู่ระบบเพื่อเลือกแพ็กเกจ"}
          </Button>
        </Card>

        <Card className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wide text-subtle">ยืดหยุ่น</span>
          <h2 className="mt-1 text-lg font-semibold">{monthly.name}</h2>
          <div className="mt-3 flex items-baseline gap-2">
            <strong className="text-2xl">{money(monthly.prices[currency], currency)}</strong>
            <span className="text-sm text-muted">/ {monthly.period?.[currency]}</span>
          </div>
          <p className="mt-1 text-xs text-subtle">เหมาะสำหรับลองใช้ Pro ก่อน</p>
          <Features items={monthly.features} />
          <Button
            className="mt-4"
            onClick={
              pro ? openBillingPortal : loggedIn ? () => startCheckout("monthly") : loginGoogle
            }
          >
            {pro ? "จัดการสมาชิก" : loggedIn ? "เลือก Pro รายเดือน" : "เข้าสู่ระบบเพื่อเลือกแพ็กเกจ"}
          </Button>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">คำถามสำคัญ</h2>
      <div className="space-y-2">
        {[
          [
            "ยอดที่ถูกตัดจะตรงกับหน้าเว็บไหม?",
            "ตรงกัน ระบบส่งทั้งแพ็กเกจและสกุลเงินที่เลือกไป Stripe Checkout หากสกุลเงินนั้นยังไม่พร้อม ระบบจะหยุดและไม่สร้างรายการชำระเงิน",
          ],
          [
            "ยกเลิกแล้วข้อมูลหายไหม?",
            "ไม่หาย ชุดและความคืบหน้ายังอยู่ แต่จะสร้างชุดส่วนตัวเพิ่มหรือเริ่มรอบที่เกินโควตา Free ไม่ได้จนกว่าจะลดจำนวนหรือสมัคร Pro อีกครั้ง",
          ],
          [
            "ระบบจะเก็บเงินจริงหรือไม่?",
            "ระบบจะเรียกเก็บเงินจริงเมื่อคุณตรวจสอบราคาและยืนยันการชำระเงินใน Stripe Checkout เท่านั้น",
          ],
        ].map(([q, a]) => (
          <details key={q} className="rounded-xl border border-line bg-surface p-4 text-sm">
            <summary className="cursor-pointer font-semibold">{q}</summary>
            <p className="mt-2 text-muted">{a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
