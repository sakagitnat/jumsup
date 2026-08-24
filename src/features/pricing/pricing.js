import { Header } from "../../components/ui.js";
import { isPro } from "../../lib/entitlements.js";
import { PLANS,money } from "../../lib/plans.js";

const checks=items=>`<ul class="plan-features">${items.map(x=>`<li><span>✓</span>${x}</li>`).join("")}</ul>`;

export function renderPricing(s,{embedded=false}={}){
 const pro=isPro(s),loggedIn=Boolean(s.user),monthly=PLANS.monthly,yearly=PLANS.yearly;
 const currency=s.lang==="th"?"THB":"USD";
 return `${embedded?"":Header("MEMBERSHIP","เลือกแพ็กเกจที่เหมาะกับคุณ","เริ่มใช้ฟรีได้จริง และอัปเกรดเมื่ออยากฝึกได้มากขึ้น","Pricing")}
 <section class="pricing-intro"><span class="tag green">Stripe Test Mode · ยังไม่เรียกเก็บเงินจริง</span><h2>เรียนต่อเนื่องในราคาที่เข้าถึงได้</h2><p>ราคาจะแสดงเป็น ${currency} ตามภาษาที่คุณเลือก และตรงกับ Stripe Checkout</p></section>
 <div class="pricing-grid">
  <article class="plan-card"><div class="plan-head"><div><span class="plan-kicker">เริ่มต้น</span><h2>${PLANS.free.name}</h2></div>${!pro?`<span class="current-plan">แพ็กเกจปัจจุบัน</span>`:""}</div><div class="plan-price"><strong>${money(0,currency)}</strong><span>ตลอดไป</span></div>${checks(PLANS.free.features)}<button class="btn plan-button" disabled>${loggedIn?"ใช้งาน Free อยู่":"สมัครฟรีด้วย Google"}</button></article>
  <article class="plan-card featured"><div class="popular-badge">คุ้มที่สุด</div><div class="plan-head"><div><span class="plan-kicker">รายปี</span><h2>${yearly.name}</h2></div>${pro&&s.subscription?.plan==="yearly"?`<span class="current-plan">แพ็กเกจปัจจุบัน</span>`:""}</div><div class="plan-price"><strong>${money(yearly.prices[currency],currency)}</strong><span>/ ${yearly.period[currency]}</span></div><p class="price-note">เฉลี่ย ${money(yearly.monthlyEquivalent[currency],currency)}/เดือน · ประหยัดประมาณ 33%</p>${checks(yearly.features)}<button class="btn btn-primary plan-button" data-action="${pro?"billing-portal":loggedIn?"checkout-yearly":"login-google"}">${pro?"จัดการสมาชิก":loggedIn?"เลือก Pro รายปี":"เข้าสู่ระบบเพื่อเลือกแพ็กเกจ"}</button></article>
  <article class="plan-card"><div class="plan-head"><div><span class="plan-kicker">ยืดหยุ่น</span><h2>${monthly.name}</h2></div>${pro&&s.subscription?.plan==="monthly"?`<span class="current-plan">แพ็กเกจปัจจุบัน</span>`:""}</div><div class="plan-price"><strong>${money(monthly.prices[currency],currency)}</strong><span>/ ${monthly.period[currency]}</span></div><p class="price-note">เหมาะสำหรับลองใช้ Pro ก่อน</p>${checks(monthly.features)}<button class="btn plan-button" data-action="${pro?"billing-portal":loggedIn?"checkout-monthly":"login-google"}">${pro?"จัดการสมาชิก":loggedIn?"เลือก Pro รายเดือน":"เข้าสู่ระบบเพื่อเลือกแพ็กเกจ"}</button></article>
 </div>
 <section class="pricing-faq"><h2>คำถามสำคัญ</h2><details><summary>ยอดที่ถูกตัดจะตรงกับหน้าเว็บไหม?</summary><p>ตรงกัน ระบบส่งทั้งแพ็กเกจและสกุลเงินที่เลือกไป Stripe Checkout หากสกุลเงินนั้นยังไม่พร้อม ระบบจะหยุดและไม่สร้างรายการชำระเงิน</p></details><details><summary>ยกเลิกแล้วข้อมูลหายไหม?</summary><p>ไม่หาย ชุดและความคืบหน้ายังอยู่ แต่จะสร้างชุดส่วนตัวเพิ่มหรือเริ่มรอบที่เกินโควตา Free ไม่ได้จนกว่าจะลดจำนวนหรือสมัคร Pro อีกครั้ง</p></details><details><summary>ระบบจะเก็บเงินจริงหรือไม่?</summary><p>ขณะนี้เป็น Stripe Test Mode จึงไม่มีการเรียกเก็บเงินจริง ก่อนเปิดขายต้องยืนยันธุรกิจ เปิด Live Mode และทดสอบรายการเงินจริงมูลค่าต่ำอีกครั้ง</p></details></section>`;
}
