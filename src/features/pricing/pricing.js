import { Header } from "../../components/ui.js";
import { isPro } from "../../lib/entitlements.js";
import { PLANS } from "../../lib/plans.js";

const checks=items=>`<ul class="plan-features">${items.map(x=>`<li><span>✓</span>${x}</li>`).join("")}</ul>`;

export function renderPricing(s){
 const pro=isPro(s),loggedIn=Boolean(s.user),monthly=PLANS.monthly,yearly=PLANS.yearly;
 return `${Header("MEMBERSHIP","เลือกแพ็กเกจที่เหมาะกับคุณ","เริ่มใช้ฟรีได้จริง และอัปเกรดเมื่ออยากฝึกได้มากขึ้น","Pricing")}
 <section class="pricing-intro"><span class="tag green">ทดลองระบบชำระเงินก่อนเปิดขายจริง</span><h2>เรียนต่อเนื่องในราคาที่เข้าถึงได้</h2><p>ไม่มีค่าแรกเข้า ไม่มีสัญญาผูกมัด และชุดที่คุณสร้างจะไม่หายเมื่อยกเลิก Pro</p></section>
 <div class="pricing-grid">
  <article class="plan-card"><div class="plan-head"><div><span class="plan-kicker">เริ่มต้น</span><h2>${PLANS.free.name}</h2></div>${!pro?`<span class="current-plan">แพ็กเกจปัจจุบัน</span>`:""}</div><div class="plan-price"><strong>฿0</strong><span>ตลอดไป</span></div>${checks(PLANS.free.features)}<button class="btn plan-button" disabled>${loggedIn?"ใช้งาน Free อยู่":"สมัครฟรีด้วย Google"}</button></article>
  <article class="plan-card featured"><div class="popular-badge">คุ้มที่สุด</div><div class="plan-head"><div><span class="plan-kicker">รายปี</span><h2>${yearly.name}</h2></div>${pro&&s.subscription?.plan==="yearly"?`<span class="current-plan">แพ็กเกจปัจจุบัน</span>`:""}</div><div class="plan-price"><strong>฿${yearly.price.toLocaleString()}</strong><span>/ ${yearly.period}</span></div><p class="price-note">เฉลี่ย ฿${yearly.monthlyEquivalent}/เดือน · ประหยัด 33%</p>${checks(yearly.features)}<button class="btn btn-primary plan-button" data-action="${pro?"billing-portal":loggedIn?"checkout-yearly":"login-google"}">${pro?"จัดการสมาชิก":loggedIn?"เลือก Pro รายปี":"เข้าสู่ระบบเพื่อเลือกแพ็กเกจ"}</button></article>
  <article class="plan-card"><div class="plan-head"><div><span class="plan-kicker">ยืดหยุ่น</span><h2>${monthly.name}</h2></div>${pro&&s.subscription?.plan==="monthly"?`<span class="current-plan">แพ็กเกจปัจจุบัน</span>`:""}</div><div class="plan-price"><strong>฿${monthly.price}</strong><span>/ ${monthly.period}</span></div><p class="price-note">เหมาะสำหรับลองใช้ Pro ก่อน</p>${checks(monthly.features)}<button class="btn plan-button" data-action="${pro?"billing-portal":loggedIn?"checkout-monthly":"login-google"}">${pro?"จัดการสมาชิก":loggedIn?"เลือก Pro รายเดือน":"เข้าสู่ระบบเพื่อเลือกแพ็กเกจ"}</button></article>
 </div>
 <section class="pricing-faq"><h2>คำถามสำคัญ</h2><details><summary>ยกเลิกแล้วข้อมูลหายไหม?</summary><p>ไม่หาย ชุดและความคืบหน้ายังอยู่ แต่จะสร้างชุดส่วนตัวเพิ่มหรือเริ่มรอบที่เกินโควตา Free ไม่ได้จนกว่าจะลดจำนวนหรือสมัคร Pro อีกครั้ง</p></details><details><summary>ระบบจะเก็บเงินทันทีหรือไม่?</summary><p>ระหว่างตั้งค่า Stripe Test Mode จะไม่มีการเรียกเก็บเงินจริง ก่อนเปิดขายจริงต้องผ่านการทดสอบ Checkout, ต่ออายุ, ยกเลิก และการชำระไม่สำเร็จก่อน</p></details><details><summary>คืนเงินอย่างไร?</summary><p>จัดการสมาชิกผ่านหน้าบัญชี ส่วนคำขอคืนเงินจะได้รับการตรวจสอบตามนโยบายและช่องทางที่ชำระ</p></details></section>`;
}
