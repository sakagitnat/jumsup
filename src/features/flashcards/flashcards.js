import { Header } from "../../components/ui.js";
import { escapeHtml,speak } from "../../lib/utils.js";
export function renderDecks(s,mode="flash"){
 return `${Header("VOCABULARY","เลือกชุดคำศัพท์","เลือกชุดก่อนเริ่มฝึก แก้ไข ลบ และกำหนดการมองเห็นได้",`${s.decks.length} sets`)}
 <div class="actions" style="margin:14px 0"><button class="btn btn-primary" data-action="new-deck">+ สร้างชุดใหม่</button><button class="btn" data-action="open-bulk-import" data-type="vocab">นำเข้าหลายคำ</button><button class="btn" data-nav="community">ค้นหาใน Community</button></div>
 <div class="grid g2">${s.decks.map(d=>`<div class="card"><div class="card-head"><div><span class="tag ${d.official||d.visibility==="public"?"green":"blue"}">${d.official?"ชุดทางการ":d.visibility==="public"?"สาธารณะ":"ส่วนตัว"}</span><h3>${escapeHtml(d.name)}</h3><p>${d.words.length} คำ · สร้างโดย @${escapeHtml(d.creator)}</p></div><span class="avatar-mini">Aa</span></div><div class="actions" style="margin-top:12px"><button class="btn btn-primary" data-action="start-deck" data-id="${d.id}" data-mode="${mode}">เริ่ม ${mode==="match"?"Match":mode==="crossword"?"Crossword":"Flashcards"}</button>${d.official?"":`<button class="btn" data-action="edit-deck" data-id="${d.id}">แก้ไข</button><button class="btn btn-danger" data-action="delete-deck" data-id="${d.id}">ลบ</button>`}</div></div>`).join("")}</div>`;
}
export function renderStudy(s,session){
 const deck=s.decks.find(d=>d.id===session.deckId); if(!deck)return "<div class='empty'>ไม่พบชุดคำศัพท์</div>";
 const pool=Math.min(session.poolSize,deck.words.length),active=[...Array(pool).keys()],un=active.filter(i=>!session.mastered.includes(i));
 if(!un.length)return `${Header("FLASHCARDS",deck.name,"จำครบ Loop นี้แล้ว","Complete")}<div class="batch-done"><h2>จำครบ ${pool} คำแล้ว</h2><div class="actions" style="justify-content:center"><button class="btn btn-primary" data-action="next-loop">กำหนด Loop ถัดไป</button><button class="btn" data-nav="flash">กลับหน้าเลือกชุด</button></div></div>`;
 const idx=un[session.cursor%un.length],w=deck.words[idx];
 if(s.flashSettings.autoSpeak)setTimeout(()=>speak(w.w),50);
 return `${Header("FLASHCARDS",deck.name,"ปัดซ้าย = ยังไม่จำ · ปัดขวา = จำได้","Swipe Study")}
 <div class="flash-study"><div class="study-status"><span class="tag blue">Loop ${pool}</span><span class="tag green">จำแล้ว ${pool-un.length}/${pool}</span><span class="tag yellow">เหลือ ${un.length}</span></div><div class="progress"><i style="width:${Math.round((pool-un.length)/pool*100)}%"></i></div>
 <div class="flash-card swipe-card" id="swipeCard" data-index="${idx}"><div class="flash-card-tools"><button class="flash-tool-btn" data-action="speak" data-word="${escapeHtml(w.w)}" title="ฟังเสียง">🔊</button><button class="flash-tool-btn" data-action="open-flash-settings" title="ตั้งค่า Flashcard">⚙</button></div><span class="tag pink">คำที่ ${idx+1}</span><h2 class="flash-word">${escapeHtml(w.w)}</h2><div class="stress-reading">${escapeHtml(w.stress||w.w)}</div>${s.flashSettings.showMeaning?`<div class="flash-meaning">${escapeHtml(w.m)}</div>`:""}<div class="flash-example">${escapeHtml(w.e||"")}</div></div>
 <div class="flash-actions"><button class="btn btn-danger" data-action="miss-word">← ยังไม่จำ</button><button class="btn btn-success" data-action="know-word" data-index="${idx}">จำได้ →</button></div>
 <div class="flash-study-footer"><span>← / → บนคอม · ปัดซ้าย/ขวาบนมือถือและ iPad</span><button class="btn flash-settings-link" data-action="open-flash-settings">⚙ ตั้งค่าการฝึก</button></div></div>`;
}
export function masteredWords(s,deckId,progress){const d=s.decks.find(x=>x.id===deckId);if(!d)return[];return (progress?.mastered||[]).map(i=>d.words[i]).filter(Boolean)}

