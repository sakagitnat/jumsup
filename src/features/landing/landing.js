import { PLANS,money } from "../../lib/plans.js";
import { languages } from "../../lib/i18n.js";

export function renderLanding(lang="th"){
 const currency=lang==="th"?"THB":"USD";
 return `<div class="landing-page">
  <header class="landing-nav"><div class="landing-logo"><span>J</span><strong>Jumsup</strong></div><nav><button data-action="landing-features">ฟีเจอร์</button><button data-nav="pricing">ราคา</button><label class="landing-language"><span aria-hidden="true">文</span><select id="uiLanguage" aria-label="ภาษาที่แสดง">${languages.map(([id,name])=>`<option value="${id}" ${lang===id?"selected":""}>${name}</option>`).join("")}</select></label><button class="btn" data-action="login-google">เข้าสู่ระบบ</button></nav></header>
  <section class="landing-hero"><div class="landing-hero-copy"><span class="landing-pill">A-Level English Practice</span><h1>ฝึกอังกฤษครบทั้ง<br><em>ศัพท์ ทักษะ และข้อสอบ</em></h1><p>วางแผนฝึกจากจุดอ่อนของคุณ ทบทวนศัพท์ด้วย Loop และลองข้อสอบคู่ขนานที่สร้างใหม่โดยไม่คัดลอกข้อสอบจริง</p><div class="landing-actions"><button class="btn btn-primary landing-main-cta" data-action="explore-free">เริ่มฝึกฟรี</button><button class="btn" data-action="landing-demo">ลองตัวอย่าง</button></div><div class="landing-trust"><span>✓ ไม่ต้องใช้บัตร</span><span>✓ มีแพ็กเกจฟรี</span><span>✓ ใช้ได้บนมือถือ</span></div></div>
   <div class="landing-demo-card" id="landingDemo"><div class="demo-top"><span>FLASHCARD · A-LEVEL</span><small>1 / 10</small></div><div class="demo-word"><small>แตะเพื่อดูคำแปล</small><strong>significant</strong><p>/sɪɡˈnɪfɪkənt/</p><div class="demo-answer"><b>สำคัญ · มีนัยสำคัญ</b><span>The change had a significant effect.</span></div></div><div class="demo-buttons"><button data-action="demo-miss">ยังไม่จำ</button><button data-action="demo-know">จำได้</button></div></div>
  </section>
  <section class="landing-goals"><div><strong>4</strong><span>ทักษะหลัก</span></div><div><strong>80</strong><span>ข้อใน Full Mock</span></div><div><strong>5–20</strong><span>นาทีต่อวัน</span></div><div><strong>ฟรี</strong><span>เริ่มเรียนได้ทันที</span></div></section>
  <section class="landing-section" id="landingFeatures"><div class="landing-section-head"><span>ฝึกให้ตรงจุด</span><h2>หนึ่งที่สำหรับการเตรียมอังกฤษ A-Level</h2><p>ไม่ต้องเปิดหลายแอป และไม่ต้องสร้างชุดเองก่อนเริ่มเรียน</p></div><div class="landing-feature-grid">
   <article><i>Aa</i><h3>จำศัพท์ด้วย Loop</h3><p>คำที่ยังไม่จำจะวนกลับมา และบันทึกไว้ทบทวนได้เสมอ</p></article>
   <article><i>R</i><h3>Reading พร้อมเครื่องมือ</h3><p>ไฮไลต์ แตะคำ แปล และเก็บคำที่ไม่รู้เข้า Flashcard</p></article>
   <article><i>L</i><h3>Listening ตามรูปแบบข้อสอบ</h3><p>ฟังบทสนทนา ซ่อน Transcript และตอบคำถามตามบริบท</p></article>
   <article><i>M</i><h3>Mock Exam คู่ขนาน</h3><p>ซ้อมเวลา ตรวจคะแนน และดูคำอธิบายหลังส่งคำตอบ</p></article>
  </div></section>
  <section class="landing-flow"><div class="landing-section-head"><span>เริ่มง่าย</span><h2>รู้ว่าต้องทำอะไรต่อในทุกวัน</h2></div><div class="landing-steps"><article><b>1</b><div><h3>เลือกเป้าหมาย</h3><p>กำหนดทักษะและเวลาที่ต้องการฝึก</p></div></article><article><b>2</b><div><h3>ฝึกตามแผน</h3><p>เริ่มจากชุดพร้อมเรียนและจุดอ่อนของคุณ</p></div></article><article><b>3</b><div><h3>วัดพัฒนาการ</h3><p>ดูคะแนน คำที่จำได้ และกลับมาทบทวน</p></div></article></div></section>
  <section class="landing-price"><div><span>เริ่มต้นโดยไม่ต้องจ่าย</span><h2>Free ใช้งานได้จริง<br>Pro เมื่ออยากฝึกได้มากขึ้น</h2><p>Pro เริ่ม ${money(PLANS.monthly.prices[currency],currency)}/เดือน หรือรายปีเฉลี่ย ${money(PLANS.yearly.monthlyEquivalent[currency],currency)}/เดือน</p></div><div class="landing-price-actions"><button class="btn btn-primary" data-action="explore-free">เริ่มฝึกฟรี</button><button class="btn" data-nav="pricing">ดูแพ็กเกจทั้งหมด</button></div></section>
  <footer class="landing-footer"><div class="landing-logo"><span>J</span><strong>Jumsup</strong></div><p>ฝึกอังกฤษให้เป็นระบบในแบบของคุณ</p><div><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="mailto:sakagitnat@gmail.com">Contact</a></div></footer>
 </div>`;
}
