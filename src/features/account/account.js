import { Header } from "../../components/ui.js";
import { renderProfile } from "../profile/profile.js";
import { renderPricing } from "../pricing/pricing.js";
import { renderSettings } from "../settings/settings.js";

const tabs=[["profile","โปรไฟล์","◎"],["plan","แพ็กเกจและการชำระเงิน","฿"],["settings","การตั้งค่า","⚙"],["privacy","ข้อมูลและความเป็นส่วนตัว","◈"]];
export function renderAccount(s,active="profile"){
 const content=active==="plan"?`${renderProfile(s,{embedded:true,section:"billing"})}${renderPricing(s,{embedded:true})}`:active==="settings"?renderSettings(s,{embedded:true}):active==="privacy"?renderProfile(s,{embedded:true,section:"privacy"}):renderProfile(s,{embedded:true,section:"profile"});
 return `${Header("ACCOUNT","บัญชีของฉัน","จัดการข้อมูล สมาชิก และการตั้งค่าจากที่เดียว","Account")}<div class="account-workspace"><nav class="account-tabs" aria-label="เมนูบัญชี">${tabs.map(([id,label,icon])=>`<button class="account-tab ${active===id?"active":""}" data-account-tab="${id}"><span>${icon}</span><b>${label}</b><i>›</i></button>`).join("")}</nav><div class="account-panel">${content}</div></div>`;
}
