import { Header } from "../../components/ui.js";
import { escapeHtml } from "../../lib/utils.js";
export function renderList(kind,items){
 const titles={reading:"Reading",listening:"Listening",writing:"Writing",mock:"Mock Exam"};
 return `${Header("PRACTICE",titles[kind],"เลือกชุดก่อนเริ่มฝึก สร้าง แก้ไข หรือลบได้","My sets")}<div class="actions" style="margin-bottom:14px"><button class="btn btn-primary" data-action="new-practice" data-kind="${kind}">+ สร้างชุดใหม่</button><button class="btn" data-nav="community">ค้นหาใน Community</button></div><div class="grid g2">${items.map(x=>`<div class="card"><span class="tag ${x.visibility==="public"?"green":"blue"}">${x.visibility==="public"?"สาธารณะ":"ส่วนตัว"}</span><h3>${escapeHtml(x.title)}</h3><p>สร้างโดย @${escapeHtml(x.creator||"papatsorn")}${x.minutes?` · ${x.minutes} นาที`:""}</p><div class="actions" style="margin-top:12px"><button class="btn btn-primary" data-action="open-practice" data-kind="${kind}" data-id="${x.id}">เริ่มฝึก</button><button class="btn" data-action="edit-practice" data-kind="${kind}" data-id="${x.id}">แก้ไข</button><button class="btn btn-danger" data-action="delete-practice" data-kind="${kind}" data-id="${x.id}">ลบ</button></div></div>`).join("")}</div>`;
}
export function renderReading(item){
 const words=item.text.split(/(\s+|[,.!?;:]+)/).map(w=>{const k=w.toLowerCase().replace(/[^a-z-]/g,"");return k?`<span class="read-word" data-word="${escapeHtml(k)}">${escapeHtml(w)}</span>`:escapeHtml(w)}).join("");
 return `${Header("READING",item.title,"แตะคำเพื่อเปิดคำแปลและเพิ่มเข้า Flashcard","Practice")}<div class="reading-shell"><article class="reading-article"><div class="read-text">${words}</div>${item.questions.map(q=>`<div class="question"><h3>${escapeHtml(q.prompt)}</h3>${q.choices.map((c,i)=>`<button class="choice" data-answer="${i}" data-correct="${q.answer}">${i+1}. ${escapeHtml(c)}</button>`).join("")}</div>`).join("")}</article><aside class="read-tools"><div class="card soft"><h3>Reading tools</h3><p class="tool-note">แตะคำเพื่อดูคำแปลและเพิ่มลงชุดคำศัพท์</p></div></aside></div>`;
}
export function renderListening(item){
 return `${Header("LISTENING",item.title,"ฟังบทสนทนาและตอบคำถาม","Practice")}<div class="audio-panel"><div class="actions"><button class="btn btn-primary" data-action="speak-script" data-script="${escapeHtml(item.script)}">▶ ฟัง</button><button class="btn" data-action="stop-speech">■ หยุด</button></div></div><div class="card" style="margin-top:12px"><p style="line-height:1.9">${escapeHtml(item.script)}</p></div>${item.questions.map(q=>`<div class="question"><h3>${escapeHtml(q.prompt)}</h3>${q.choices.map((c,i)=>`<button class="choice" data-answer="${i}" data-correct="${q.answer}">${i+1}. ${escapeHtml(c)}</button>`).join("")}</div>`).join("")}`;
}
export function renderWriting(item){
 return `${Header("WRITING",item.title,"เลือกคำตอบที่เหมาะสม","Practice")}<div class="card soft"><p style="font-size:15px;line-height:2">${escapeHtml(item.prompt)}</p></div><div class="question">${item.choices.map((c,i)=>`<button class="choice" data-answer="${i}" data-correct="${item.answer}">${i+1}. ${escapeHtml(c)}</button>`).join("")}</div>`;
}
