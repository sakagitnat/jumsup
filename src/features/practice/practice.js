import { Header } from "../../components/ui.js";
import { escapeHtml } from "../../lib/utils.js";

const titles={reading:"Reading",listening:"Listening",writing:"Writing",mock:"Mock Exam"};
const specs={reading:["Advertisements & visuals","Reviews & news","General articles"],listening:["Short conversations","Long conversation","Speaking in context"],writing:["Text completion","Grammar in context","Paragraph organization"],mock:["20 Listening","40 Reading","20 Writing"]};

function question(q,index=0,prefix="q"){
 const id=q.id||`${prefix}-${index+1}`;
 return `<div class="question" id="${escapeHtml(id)}"><div class="question-kicker">ITEM ${index+1}</div><h3>${escapeHtml(q.prompt)}</h3>${(q.choices||[]).map((c,i)=>`<button class="choice" data-question="${escapeHtml(id)}" data-answer="${i}" data-correct="${q.answer}"><span>${i+1}</span>${escapeHtml(c)}</button>`).join("")}</div>`;
}

export function renderList(kind,items){
 const list=items||[];
 return `${Header("PRACTICE",titles[kind],"เลือกชุดก่อนเข้าสู่หน้าฝึกจริง หรือสร้างชุดของคุณเอง","My sets")}
 <div class="practice-overview"><div><span class="tag blue">SKILL PRACTICE</span><h2>${titles[kind]}</h2><p>หน้าฝึกคงรูปแบบจริงจังแบบข้อสอบ แต่ใช้เนื้อหาที่สร้างใหม่สำหรับ Jumsup</p></div><div class="practice-spec">${specs[kind].map((x,i)=>`<div><strong>${i+1}</strong><small>${x}</small></div>`).join("")}</div></div>
 <div class="actions practice-actions"><button class="btn btn-primary" data-action="new-practice" data-kind="${kind}">+ สร้างชุดใหม่</button><button class="btn" data-nav="community">ค้นหาใน Community</button></div>
 <div class="grid g2">${list.map(x=>`<div class="card practice-set-card"><div class="card-head"><span class="tag ${x.visibility==="public"?"green":"blue"}">${x.visibility==="public"?"สาธารณะ":"ส่วนตัว"}</span><span class="practice-kind">${escapeHtml(x.category||x.type||titles[kind])}</span></div><h3>${escapeHtml(x.title)}</h3><p>สร้างโดย @${escapeHtml(x.creator||"Jumsup")}${x.minutes?` · ${x.minutes} นาที`:""}${x.itemCount?` · ${x.itemCount} ข้อ`:""}</p><div class="actions"><button class="btn btn-primary" data-action="open-practice" data-kind="${kind}" data-id="${x.id}">เริ่มฝึก</button><button class="btn" data-action="edit-practice" data-kind="${kind}" data-id="${x.id}">แก้ไข</button><button class="btn btn-danger" data-action="delete-practice" data-kind="${kind}" data-id="${x.id}">ลบ</button></div></div>`).join("")||`<div class="empty">ยังไม่มีชุดฝึกในหมวดนี้</div>`}</div>`;
}

function tokenize(text){
 return String(text||"").split(/(\s+|[,.!?;:()“”]+)/).map(w=>{const k=w.toLowerCase().replace(/[^a-z-]/g,"");return k?`<span class="read-word" data-word="${escapeHtml(k)}">${escapeHtml(w)}</span>`:escapeHtml(w)}).join("");
}

export function renderReading(item){
 const sections=item.sections?.length?item.sections:[{title:item.title,category:item.category,text:item.text,questions:item.questions||[]}];
 const qs=sections.flatMap(s=>s.questions||[]);
 return `${Header("SECTION II","Reading Skill","โหมดอ่านแบบข้อสอบ + Readlang: แตะคำอังกฤษเพื่อดูคำแปลและเพิ่มเข้า Flashcard",`${item.itemCount||qs.length} items`)}
 <div class="exam-category-strip"><span class="pink">Advertisements</span><span class="green">Review</span><span class="blue">News Report</span><span class="yellow">Visuals</span><span class="blue">General Articles</span></div>
 <div class="practice-paper-head"><div><span class="tag green">FULL A-LEVEL PARALLEL PRACTICE</span><h2>${escapeHtml(item.title)}</h2></div><div class="paper-meta"><b>${qs.length}</b><small>questions</small></div></div>
 <div class="reading-shell"><article class="reading-article"><div class="directions">Directions: Read each original passage and choose the best answer.</div>${sections.map((s,si)=>`<section class="mock-section"><div class="mock-section-head"><span class="tag green">PART ${si+1}</span><h2>${escapeHtml(s.title||s.category||"Reading passage")}</h2><p>${escapeHtml(s.description||"")}</p></div>${s.text||s.context?`<div class="read-text">${tokenize(s.text||s.context)}</div>`:""}${(s.questions||[]).map((q,i)=>question(q,qs.indexOf(q),"reading")).join("")}</section>`).join("")}</article><aside class="read-tools"><div class="card soft readlang-panel"><h3>Readlang Mode</h3><ol><li>แตะคำศัพท์ในบทความ</li><li>ดูคำแปลทันที</li><li>เพิ่มเข้า Flashcard</li><li>ทบทวนในชุดคำศัพท์</li></ol><div class="paper-progress"><span>ตอบแล้ว</span><b id="answeredCount">0/${qs.length}</b></div><button class="btn btn-primary practice-submit" data-action="submit-practice">ส่งคำตอบ</button></div><div class="card exam-tip"><b>ทักษะที่วัด</b><p>${escapeHtml((item.skills||["main idea","detail","inference","vocabulary"]).join(" · "))}</p></div></aside></div>`;
}

export function renderListening(item){
 const sections=item.sections?.length?item.sections:[{title:item.title,situation:item.situation,script:item.script,questions:item.questions||[]}];
 const qs=sections.flatMap(s=>s.questions||[]),fullScript=sections.map(s=>`${s.title||""}. ${s.script||s.context||""}`).join(" ");
 return `${Header("SECTION I","Listening & Speaking","Short / Long Conversation พร้อม TTS สำเนียงและความเร็วเสียง",`${item.itemCount||qs.length} items`)}
 <div class="exam-category-strip"><span class="blue">Short Conversations</span><span class="green">Long Conversation</span><span class="yellow">Speaking in Context</span></div>
 <div class="audio-panel"><div class="audio-heading"><div><span class="tag blue">FULL A-LEVEL PARALLEL PRACTICE</span><h3>${escapeHtml(item.situation||"Listen to each original conversation")}</h3></div><span class="listen-status">Practice mode · ฟังซ้ำได้</span></div><div class="audio-controls"><button class="btn btn-primary" data-action="speak-script" data-script="${escapeHtml(fullScript)}">▶ ฟังทั้งหมด</button><button class="btn" data-action="pause-speech">Ⅱ พัก</button><button class="btn" data-action="resume-speech">▶ ต่อ</button><button class="btn" data-action="stop-speech">■ หยุด</button><label>สำเนียง <select id="listenAccent"><option value="en-US">US</option><option value="en-GB" selected>UK</option></select></label><label>ความเร็ว <select id="listenRate"><option value="0.8">0.8×</option><option value="0.9" selected>0.9×</option><option value="1">1×</option><option value="1.15">1.15×</option></select></label></div></div>
 <div class="exam-layout listening-layout"><div class="exam-paper"><div class="directions">Directions: Listen and choose the best answer.</div>${sections.map((s,si)=>`<section class="mock-section"><div class="mock-section-head"><span class="tag blue">PART ${si+1}</span><h2>${escapeHtml(s.title||"Conversation")}</h2><p>${escapeHtml(s.situation||s.description||"")}</p></div><button class="btn btn-primary" data-action="speak-script" data-script="${escapeHtml(s.script||s.context||"")}">▶ ฟังส่วนนี้</button><details class="transcript-card"><summary>เปิด Transcript สำหรับโหมดฝึก</summary><div class="dialogue"><p>${escapeHtml(s.script||s.context||"")}</p></div></details>${(s.questions||[]).map(q=>question(q,qs.indexOf(q),"listening")).join("")}</section>`).join("")}</div><aside class="exam-side"><div class="card"><h3>Listening guide</h3><p class="tool-note">ฟังรอบแรกเพื่อจับสถานการณ์และเจตนา จากนั้นจึงฟังรายละเอียดในรอบถัดไป</p><div class="paper-progress"><span>ตอบแล้ว</span><b id="answeredCount">0/${qs.length}</b></div><button class="btn btn-primary practice-submit" data-action="submit-practice">ส่งคำตอบ</button></div></aside></div>`;
}

export function renderWriting(item){
 const sections=item.sections?.length?item.sections:[item];
 const qs=sections.flatMap(s=>s.questions||[{id:s.id,prompt:s.question||"Choose the best answer to complete the sentence.",choices:s.choices||[],answer:s.answer}]);
 const passage=item.passage||item.prompt||"";
 return `${Header("SECTION III","Writing Skill","Text Completion, Grammar in Context และ Paragraph Organization",`${item.itemCount||qs.length} items`)}
 <div class="exam-category-strip"><span class="pink">Text Completion</span><span class="blue">Word Form & Grammar</span><span class="green">Paragraph Organization</span></div>
 <div class="practice-paper-head"><div><span class="tag pink">FULL A-LEVEL PARALLEL PRACTICE</span><h2>${escapeHtml(item.title)}</h2></div><div class="paper-meta"><b>${qs.length}</b><small>questions</small></div></div>
 <div class="exam-layout"><div class="exam-paper">${sections.map((s,si)=>`<section class="mock-section"><div class="mock-section-head"><span class="tag pink">PART ${si+1}</span><h2>${escapeHtml(s.title||s.type||"Writing")}</h2><p>${escapeHtml(s.directions||"Choose the best answer.")}</p></div>${s.statements?`<div class="organization-block">${s.statements.map((x,i)=>`<p><b>${String.fromCharCode(65+i)}.</b> ${escapeHtml(x)}</p>`).join("")}</div>`:`<div class="writing-passage">${escapeHtml(s.passage||s.context||"")}</div>`}${(s.questions||[]).map(q=>question(q,qs.indexOf(q),"writing")).join("")}</section>`).join("")}</div><aside class="exam-side"><div class="card"><h3>Writing focus</h3><p class="tool-note">ตรวจ tense, word form, connector, reference และลำดับเหตุผลของทั้งย่อหน้า</p><div class="paper-progress"><span>ตอบแล้ว</span><b id="answeredCount">0/${qs.length}</b></div><button class="btn btn-primary practice-submit" data-action="submit-practice">ส่งคำตอบ</button></div></aside></div>`;
}

export function renderMock(item){
 const sections=item.sections||[];
 const all=sections.flatMap(s=>s.questions||[]);
 const total=item.questions||80;
 return `${Header("FULL SIMULATION",item.title,"แบบจำลองโครงสร้าง 80 ข้อ 90 นาที พร้อมกระดาษคำตอบ",`${item.minutes||90} minutes`)}
 <div class="mock-notice"><b>Parallel practice</b><span>โจทย์ทั้งหมดเป็นเนื้อหาที่ Jumsup เขียนขึ้นใหม่ ไม่ใช่ข้อสอบจริง</span></div>
 <div class="exam-layout"><div class="exam-paper">${sections.map((s,si)=>`<section class="mock-section"><div class="mock-section-head"><span class="tag ${si===0?"blue":si===1?"green":"pink"}">SECTION ${si+1}</span><h2>${escapeHtml(s.title)}</h2><p>${escapeHtml(s.description||"")}</p></div>${s.context?`<div class="writing-passage">${escapeHtml(s.context)}</div>`:""}${(s.questions||[]).map((q,i)=>question(q,Number(q.number||i+1)-1,"mock")).join("")}</section>`).join("")}</div><aside class="exam-side"><div class="card"><div class="timer" id="examTimer" data-seconds="${(item.minutes||90)*60}">${String(item.minutes||90).padStart(2,"0")}:00</div><p class="timer-label">เวลาคงเหลือ</p><div class="paper-progress"><span>ตอบแล้ว</span><b id="answeredCount">0/${all.length}</b></div><div class="bubble-grid">${Array.from({length:total},(_,i)=>`<button class="bubble" data-jump="mock-${i+1}">${i+1}</button>`).join("")}</div><button class="btn btn-danger mock-submit" data-action="submit-practice">ส่งข้อสอบ</button></div></aside></div>`;
}

export function renderPracticeResult(item,attempt){
 const questions=attempt.questions||[],answers=attempt.answers||{};
 const correct=questions.reduce((n,q)=>n+(Number(answers[q.id])===Number(q.answer)?1:0),0),percent=questions.length?Math.round(correct/questions.length*100):0;
 return `${Header("RESULTS",item.title,"ตรวจคำตอบและอ่านคำอธิบายก่อนเริ่มรอบใหม่",`${correct}/${questions.length}`)}<div class="result-hero"><div class="result-ring" style="--score:${percent}"><strong>${percent}%</strong><small>คะแนน</small></div><div><span class="tag ${percent>=70?"green":percent>=50?"yellow":"pink"}">${percent>=70?"ทำได้ดี":percent>=50?"ใกล้ถึงเป้าหมาย":"ควรทบทวน"}</span><h2>ตอบถูก ${correct} จาก ${questions.length} ข้อ</h2><p>ใช้เวลา ${Math.max(1,Math.round((Date.now()-attempt.startedAt)/60000))} นาที · ตอบ ${Object.keys(answers).length} ข้อ</p><div class="actions"><button class="btn btn-primary" data-action="retry-practice">ทำอีกครั้ง</button><button class="btn" data-action="back-practice-list">กลับไปเลือกชุด</button></div></div></div><div class="result-list">${questions.map((q,i)=>{const chosen=answers[q.id],ok=Number(chosen)===Number(q.answer);return `<article class="result-item ${ok?"result-correct":"result-wrong"}"><div class="result-item-head"><span>${i+1}</span><b>${escapeHtml(q.prompt)}</b><em>${ok?"ถูก":"ผิด"}</em></div><p>คำตอบของคุณ: ${chosen===undefined?"ไม่ได้ตอบ":escapeHtml(q.choices?.[chosen]||"")}</p>${!ok?`<p>คำตอบที่ถูก: <b>${escapeHtml(q.choices?.[q.answer]||"")}</b></p>`:""}<small>${escapeHtml(q.explanation||"ตรวจจากใจความ ไวยากรณ์ และบริบทของคำถาม")}</small></article>`}).join("")}</div>`;
}
