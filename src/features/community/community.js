import { Header } from "../../components/ui.js";
import { escapeHtml } from "../../lib/utils.js";
export function renderCommunity(s,query="",tab="vocab"){
 const q=query.toLowerCase();
 const items=(s.community||[]).filter(x=>x.type===tab&&(!q||x.title.toLowerCase().includes(q)||x.creator.toLowerCase().includes(q)));
 return `${Header("COMMUNITY","Community Search","ค้นหาชุดคำศัพท์หรือชุดฝึกจากผู้ใช้อื่น","Online Library")}
 <div class="tabs"><button class="tab ${tab==="vocab"?"active":""}" data-community-tab="vocab">ชุดคำศัพท์</button><button class="tab ${tab==="skill"?"active":""}" data-community-tab="skill">ชุดฝึกทักษะ</button></div>
 <div class="toolbar-row"><input id="communitySearch" class="search-input" value="${escapeHtml(query)}" placeholder="ค้นหาชื่อชุด หรือ username ผู้สร้าง..."><button class="btn" data-action="community-search">ค้นหา</button><button class="btn" data-action="community-refresh">รีเฟรช</button></div>
 ${!s.user?`<div class="card soft" style="margin-bottom:12px"><p>เข้าสู่ระบบเพื่อดูและนำเข้าคลัง Community ออนไลน์</p><button class="btn btn-primary" data-action="login-google">เข้าสู่ระบบ Google</button></div>`:""}
 <div class="grid g2">${items.map(x=>`<div class="card"><span class="tag green">COMMUNITY</span><h3>${escapeHtml(x.title)}</h3><p>${x.count||1} รายการ · สร้างโดย <b>@${escapeHtml(x.creator)}</b></p><div class="actions" style="margin-top:12px"><button class="btn btn-primary" data-action="import-community" data-id="${x.id}" data-type="${x.type}">นำเข้า</button></div></div>`).join("")||"<div class='empty'>ยังไม่พบผลลัพธ์</div>"}</div>`;
}
