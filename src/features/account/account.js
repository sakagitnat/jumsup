import { Header } from "../../components/ui.js";
import { renderProfile } from "../profile/profile.js";
import { renderPricing } from "../pricing/pricing.js";
import { renderSettings } from "../settings/settings.js";
import { renderAdmin } from "../admin/admin.js";

const icons={
 profile:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6"/></svg>',
 plan:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/></svg>',
 settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.6h-4L10.4 6A8 8 0 0 0 8.8 7L6.5 6.1l-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1A8 8 0 0 0 10.4 18l.3 2.6h4L15 18a8 8 0 0 0 1.5-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"/></svg>',
 privacy:'<svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
 admin:'<svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z"/><path d="M9 12h6M12 9v6"/></svg>'
};
const tabs=[["profile","โปรไฟล์","ชื่อ รูปภาพ และกิจกรรมการเรียน"],["plan","แพ็กเกจและการชำระเงิน","ดูสิทธิ์ อัปเกรด หรือจัดการสมาชิก"],["settings","การตั้งค่า","ภาษา ธีม และเสียง"],["privacy","ข้อมูลและความเป็นส่วนตัว","ดาวน์โหลดข้อมูลหรือจัดการบัญชี"]];
const labels=Object.fromEntries(tabs.map(([id,label])=>[id,label]));
labels.admin="Admin Center";

export function renderAccount(s,active="menu",adminData={}){
 const menuTabs=s.profile?.role==="admin"?[...tabs,["admin","Admin Center","งานค้าง ค่าใช้จ่าย Gift Code และความปลอดภัย"]]:tabs;
 if(active==="menu")return `${Header("ACCOUNT","บัญชีของฉัน","เลือกหัวข้อที่ต้องการจัดการ","Account")}<div class="account-menu-card">${menuTabs.map(([id,label,desc])=>`<button class="account-menu-row" data-account-tab="${id}"><span class="account-menu-icon">${icons[id]}</span><span><b>${label}</b><small>${desc}</small></span><i>›</i></button>`).join("")}</div>`;
 const content=active==="admin"&&s.profile?.role==="admin"?renderAdmin(adminData):active==="plan"?`${renderProfile(s,{embedded:true,section:"billing"})}${renderPricing(s,{embedded:true})}`:active==="settings"?renderSettings(s,{embedded:true}):active==="privacy"?renderProfile(s,{embedded:true,section:"privacy"}):renderProfile(s,{embedded:true,section:"profile"});
 return `<div class="account-subhead"><button class="icon-back" data-account-back aria-label="ย้อนกลับ"><svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m10 7-5 5 5 5"/></svg></button><div><p class="content-eyebrow">ACCOUNT</p><h1>${labels[active]||"บัญชี"}</h1></div></div><div class="account-panel">${content}</div>`;
}
