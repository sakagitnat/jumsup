import { Header } from "../../components/ui.js";
import { isPro,proSource } from "../../lib/entitlements.js";
import { escapeHtml } from "../../lib/utils.js";

export function renderProfile(s){
 const user=s.user,profile=s.profile;
 if(!user){
  return `${Header("ACCOUNT","Profile","เข้าสู่ระบบเพื่อ Sync ข้อมูลทุกอุปกรณ์และใช้ Community/สมาชิก","Guest")}
  <div class="profile-hero"><div class="profile-avatar-lg">G</div><div class="profile-main"><h2>Guest</h2><p>ข้อมูลตอนนี้อยู่บนอุปกรณ์นี้</p><div class="actions" style="margin-top:12px"><button class="btn btn-primary" data-action="login-google">เข้าสู่ระบบด้วย Google</button></div></div></div>`;
 }
 const level=Math.floor((s.xp||0)/250)+1,pro=isPro(s);
 const avatar=profile?.avatar_url?`<img src="${escapeHtml(profile.avatar_url)}" alt="">`:(profile?.username||"U").slice(0,1).toUpperCase();
 return `${Header("ACCOUNT","Profile","บัญชี การ Sync และสมาชิก Jumsup","Profile")}
 <div class="profile-hero"><div class="profile-avatar-lg profile-avatar-real">${avatar}</div><div class="profile-main"><div class="profile-name-row"><div><h2>${escapeHtml(profile?.username||user.email)}</h2><p>${escapeHtml(user.email||"")}</p></div><span class="tag ${pro?"green":"blue"}">${pro?"PRO":"FREE"}</span></div><div class="actions" style="margin-top:12px"><label class="btn">เปลี่ยนรูป<input id="avatarFile" type="file" accept="image/*" hidden></label><button class="btn" data-action="logout">ออกจากระบบ</button></div></div></div>
 <div class="profile-stats"><div class="profile-stat"><span class="profile-stat-icon">✦</span><div><small>XP</small><strong>${(s.xp||0).toLocaleString()}</strong></div></div><div class="profile-stat"><span class="profile-stat-icon">🔥</span><div><small>Streak</small><strong>${s.streak||0} วัน</strong></div></div><div class="profile-stat"><span class="profile-stat-icon">▣</span><div><small>Decks</small><strong>${s.decks.length}</strong></div></div><div class="profile-stat"><span class="profile-stat-icon">↑</span><div><small>Level</small><strong>${level}</strong></div></div></div>
 <div class="section-title"><h2>สมาชิก</h2></div>
 <div class="card"><div class="skill-card"><div class="skill-icon">★</div><div class="grow"><b>${pro?"Jumsup Pro":"Jumsup Free"}</b><small>สิทธิ์ปัจจุบัน: ${proSource(s)}${profile?.pro_bonus_until?` · โบนัสถึง ${new Date(profile.pro_bonus_until).toLocaleDateString()}`:""}</small></div>${pro?`<button class="btn" data-action="billing-portal">จัดการสมาชิก</button>`:`<button class="btn btn-primary" data-nav="pricing">ดูแพ็กเกจและราคา</button>`}</div></div>
 <div class="grid g2" style="margin-top:14px">
  <div class="card"><h3>Gift Code</h3><p>แลกโค้ดเพื่อรับสิทธิ์ Pro</p><div class="actions" style="margin-top:10px"><input id="giftCode" placeholder="กรอกโค้ด" style="flex:1"><button class="btn" data-action="redeem-gift">แลกโค้ด</button></div></div>
  <div class="card"><h3>ชวนเพื่อน</h3><p>คนชวน +14 วัน · คนถูกชวน +7 วัน</p><div class="actions" style="margin-top:10px"><input id="referralCode" placeholder="โค้ดผู้ชวน" style="flex:1"><button class="btn" data-action="claim-referral">ใช้โค้ด</button></div>${profile?.referral_code?`<p style="margin-top:10px">โค้ดของคุณ: <b>${escapeHtml(profile.referral_code)}</b></p>`:""}</div>
 </div>
 <div class="section-title"><h2>การชำระเงินและคืนเงิน</h2></div>
 <div class="card">
  <div class="skill-card"><div class="skill-icon">฿</div><div class="grow"><b>ขอคืนเงิน</b><small>ส่งคำขอให้ผู้ดูแลตรวจสอบ การส่งคำขอไม่ได้คืนเงินอัตโนมัติ</small></div><button class="btn" data-action="open-refund-request">ขอคืนเงิน</button></div>
  ${(s.refunds||[]).length?`<div class="refund-history">${s.refunds.slice(0,5).map(r=>`<div class="refund-row"><span><b>${r.status}</b><small>${new Date(r.requested_at).toLocaleDateString()} · ${escapeHtml(r.reason)}</small></span><span class="tag ${r.status==="refunded"?"green":r.status==="rejected"||r.status==="failed"?"pink":"blue"}">${r.status}</span></div>`).join("")}</div>`:""}
 </div>
 <div class="section-title"><h2>ข้อมูลและความเป็นส่วนตัว</h2></div>
 <div class="card"><div class="skill-card"><div class="skill-icon">⇩</div><div class="grow"><b>ดาวน์โหลดข้อมูลของฉัน</b><small>Export ข้อมูลบัญชีและการเรียน</small></div><button class="btn" data-action="export-account">ดาวน์โหลด</button></div>
 <div class="skill-card" style="margin-top:10px"><div class="skill-icon">!</div><div class="grow"><b>ลบบัญชี</b><small>มีช่วงรอ 7 วันก่อนดำเนินการ</small></div><button class="btn btn-danger" data-action="request-account-delete">ขอลบบัญชี</button></div></div>
  ${profile?.role==="admin"?`<div class="section-title"><h2>Admin</h2></div><div class="card"><div class="actions" style="justify-content:space-between"><h3>Refund Queue</h3><button class="btn" data-action="admin-load-refunds">โหลดคำขอคืนเงิน</button></div><div id="adminRefundQueue"></div></div><div class="card" style="margin-top:12px"><h3>ออก Gift Code</h3><div class="actions"><input id="adminGiftCode" placeholder="CODE"><input id="adminGiftDays" type="number" value="30" min="1" style="width:100px"><button class="btn btn-primary" data-action="admin-create-gift">สร้างโค้ด</button></div></div>`:""}`;
}
