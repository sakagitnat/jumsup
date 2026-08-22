import { Header } from "../../components/ui.js";
import { isPro,proSource } from "../../lib/entitlements.js";
import { languages } from "../../lib/i18n.js";
import { escapeHtml } from "../../lib/utils.js";

export function renderProfile(s){
 const user=s.user,profile=s.profile;
 if(!user){
  return `${Header("ACCOUNT","บัญชี","โปรไฟล์และการตั้งค่าทั้งหมดอยู่ในหน้าเดียว","Guest")}
  <div class="profile-hero"><div class="profile-avatar-lg">G</div><div class="profile-main"><h2>Guest</h2><p>ข้อมูลตอนนี้อยู่บนอุปกรณ์นี้</p><div class="actions" style="margin-top:12px"><button class="btn btn-primary" data-action="login-google">เข้าสู่ระบบด้วย Google</button></div></div></div>
  <div class="section-title"><h2>การตั้งค่าการเรียน</h2></div>${preferencePanels(s)}`;
 }
 const level=Math.floor((s.xp||0)/250)+1,pro=isPro(s),name=profile?.username||"Jumsup learner";
 const avatar=profile?.avatar_url?`<img src="${escapeHtml(profile.avatar_url)}" alt="">`:name.slice(0,1).toUpperCase();
 return `${Header("ACCOUNT","บัญชี","จัดการตัวตน การเรียน สมาชิก และความเป็นส่วนตัวในหน้าเดียว","Account")}
 <section class="account-identity">
  <div class="profile-avatar-lg profile-avatar-real">${avatar}</div>
  <div class="account-identity-main"><div class="profile-name-row"><div><h2>${escapeHtml(name)}</h2><p>ชื่อที่คนอื่นเห็นใน Community · อีเมลไม่แสดงต่อสาธารณะ</p></div><span class="tag ${pro?"green":"blue"}">${pro?"PRO":"FREE"}</span></div>
  <div class="display-name-editor"><label><span>ชื่อที่แสดง</span><small>ใช้ภาษาไทย เว้นวรรค อีโมจิ หรือตัวอักษรภาษาอื่นได้</small><div><input id="accountDisplayName" maxlength="40" value="${escapeHtml(name)}" autocomplete="off"><button class="btn btn-primary" data-action="save-username" data-input="accountDisplayName">บันทึกชื่อ</button></div></label></div>
  <div class="actions account-photo-actions"><label class="btn">เปลี่ยนรูป<input id="avatarFile" type="file" accept="image/*" hidden></label><button class="btn btn-quiet" data-action="logout">ออกจากระบบ</button></div></div>
 </section>
 <div class="privacy-banner"><span>◉</span><div><b>ข้อมูลส่วนตัวได้รับการปกป้อง</b><small>Jumsup แสดงเฉพาะชื่อที่แสดงและรูปโปรไฟล์ อีเมลใช้สำหรับเข้าสู่ระบบเท่านั้น</small></div></div>
 <div class="profile-stats"><div class="profile-stat"><span class="profile-stat-icon">✦</span><div><small>XP</small><strong>${(s.xp||0).toLocaleString()}</strong></div></div><div class="profile-stat"><span class="profile-stat-icon">🔥</span><div><small>Streak</small><strong>${s.streak||0} วัน</strong></div></div><div class="profile-stat"><span class="profile-stat-icon">▣</span><div><small>Decks</small><strong>${s.decks.length}</strong></div></div><div class="profile-stat"><span class="profile-stat-icon">↑</span><div><small>Level</small><strong>${level}</strong></div></div></div>
 <div class="section-title"><h2>การตั้งค่าการเรียน</h2></div>${preferencePanels(s)}
 <div class="section-title"><h2>สมาชิก</h2></div>
 <div class="membership-card"><div class="membership-mark">★</div><div class="grow"><b>${pro?"Jumsup Pro":"Jumsup Free"}</b><small>${pro?`ใช้งาน Pro ผ่าน ${proSource(s)}`:"อัปเกรดเพื่อปลดล็อกสิทธิ์เพิ่มเติม"}${profile?.pro_bonus_until?` · โบนัสถึง ${new Date(profile.pro_bonus_until).toLocaleDateString()}`:""}</small></div>${pro?`<button class="btn" data-action="open-membership-settings">จัดการสมาชิก</button>`:`<div class="actions"><button class="btn btn-primary" data-action="checkout-monthly">รายเดือน</button><button class="btn" data-action="checkout-yearly">รายปี</button></div>`}</div>
 <div class="grid g2 account-extras">
  <div class="card"><h3>Gift Code</h3><p>แลกโค้ดเพื่อรับสิทธิ์ Pro</p><div class="actions"><input id="giftCode" placeholder="กรอกโค้ด"><button class="btn" data-action="redeem-gift">แลกโค้ด</button></div></div>
  <div class="card"><h3>ชวนเพื่อน</h3><p>คนชวน +14 วัน · คนถูกชวน +7 วัน</p><div class="actions"><input id="referralCode" placeholder="โค้ดผู้ชวน"><button class="btn" data-action="claim-referral">ใช้โค้ด</button></div>${profile?.referral_code?`<p>โค้ดของคุณ: <b>${escapeHtml(profile.referral_code)}</b></p>`:""}</div>
 </div>
 <details class="account-tools"><summary>ข้อมูลและการจัดการบัญชี</summary><div class="account-tools-body"><div class="skill-card"><div class="skill-icon">⇩</div><div class="grow"><b>ดาวน์โหลดข้อมูล</b><small>Export ข้อมูลบัญชีและการเรียน</small></div><button class="btn" data-action="export-account">ดาวน์โหลด</button></div><div class="skill-card"><div class="skill-icon">!</div><div class="grow"><b>ลบบัญชี</b><small>มีช่วงรอ 7 วันก่อนดำเนินการ</small></div><button class="btn btn-danger" data-action="request-account-delete">ขอลบบัญชี</button></div></div></details>
 ${profile?.role==="admin"?`<div class="section-title"><h2>Admin</h2></div><div class="card"><div class="actions"><h3>Refund Queue</h3><button class="btn" data-action="admin-load-refunds">โหลดคำขอคืนเงิน</button></div><div id="adminRefundQueue"></div></div><div class="card"><h3>ออก Gift Code</h3><div class="actions"><input id="adminGiftCode" placeholder="CODE"><input id="adminGiftDays" type="number" value="30" min="1"><button class="btn btn-primary" data-action="admin-create-gift">สร้างโค้ด</button></div></div>`:""}`;
}

function preferencePanels(s){
 return `<div class="account-preferences">
 <section class="preference-card"><div class="preference-copy"><span class="preference-icon">文</span><div><b>ภาษา</b><small>ภาษาของเมนูและส่วนติดต่อ</small></div></div><div class="compact-language-picker">${languages.map(([id,name])=>`<button class="${s.lang===id?"selected":""}" data-lang="${id}">${name}${s.lang===id?" ✓":""}</button>`).join("")}</div></section>
 <section class="preference-card"><div class="preference-copy"><span class="preference-icon">◐</span><div><b>ธีม</b><small>เลือกรูปแบบที่สบายตา</small></div></div><div class="preference-actions"><button class="btn ${s.theme==="light"?"selected":""}" data-theme-choice="light">สว่าง</button><button class="btn ${s.theme==="dark"?"selected":""}" data-theme-choice="dark">มืด</button></div></section>
 <section class="preference-card"><div class="preference-copy"><span class="preference-icon">♫</span><div><b>เสียงเอฟเฟกต์</b><small>${s.sound?"เปิด":"ปิด"}</small></div></div><label class="switch"><input id="soundToggle" type="checkbox" ${s.sound?"checked":""}><span></span></label></section>
 </div>`;
}
