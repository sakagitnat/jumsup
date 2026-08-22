import { escapeHtml } from "../../lib/utils.js";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

const labels={vocab:"ชุดคำศัพท์",reading:"Reading",listening:"Listening",writing:"Writing",mock:"Mock Exam"};
const blankQuestion=()=>({prompt:"",choices:["","","",""],answer:0});
const normalQuestion=q=>({prompt:q?.prompt||q?.question||"",choices:Array.isArray(q?.choices)?[...q.choices].slice(0,4):["","","",""],answer:Number(q?.answer)||0});
const normalWord=w=>({w:w?.w||w?.word||"",m:w?.m||w?.meaning||""});

export function createContentBuilder(kind="reading",item=null){
 const questions=kind==="mock"?(item?.sections||[]).flatMap(s=>s.questions||[]):item?.questions||[];
 const content=kind==="reading"?item?.text||"":kind==="listening"?item?.script||"":kind==="writing"?item?.passage||item?.prompt||"":item?.sections?.[0]?.context||"";
 return {kind,id:item?.id||"",title:item?.title||"",visibility:item?.visibility||"private",minutes:Number(item?.minutes)||10,category:item?.category||item?.type||"",content,questions:(questions.length?questions:[blankQuestion()]).map(normalQuestion),words:(item?.words?.length?item.words:[{w:"",m:""}]).map(normalWord),pdfName:"",pdfText:"",pdfStatus:""};
}

const field=(label,html,wide=false)=>`<label class="builder-field ${wide?"wide":""}"><span>${label}</span>${html}</label>`;
function questionCard(q,i){
 return `<article class="builder-question" data-question="${i}"><div class="builder-question-head"><b>คำถามที่ ${i+1}</b><div><button type="button" class="icon-btn" data-builder="duplicate-question" data-index="${i}" title="ทำสำเนา">⧉</button><button type="button" class="icon-btn danger" data-builder="delete-question" data-index="${i}" title="ลบ">×</button></div></div>${field("คำถาม",`<textarea data-q-field="prompt" rows="2" placeholder="พิมพ์คำถาม">${escapeHtml(q.prompt)}</textarea>`,true)}<div class="builder-choices">${q.choices.map((c,ci)=>`<label><input type="radio" name="answer-${i}" data-q-answer="${ci}" ${Number(q.answer)===ci?"checked":""} aria-label="คำตอบที่ถูก"><input data-choice="${ci}" value="${escapeHtml(c)}" placeholder="ตัวเลือก ${ci+1}"></label>`).join("")}</div></article>`;
}
function wordCard(w,i){return `<div class="builder-word" data-word="${i}"><b>${i+1}</b><input data-word-field="w" value="${escapeHtml(w.w)}" placeholder="คำศัพท์"><input data-word-field="m" value="${escapeHtml(w.m)}" placeholder="คำแปล / ความหมาย"><button type="button" class="icon-btn danger" data-builder="delete-word" data-index="${i}">×</button></div>`}

export function renderContentBuilder(b){
 const vocab=b.kind==="vocab";
 return `<section class="builder-page"><header class="builder-topbar"><div><p class="content-eyebrow">CONTENT BUILDER</p><h1 class="content-title">${b.id?"แก้ไข":"สร้าง"}${labels[b.kind]}</h1><p class="content-desc">กรอกข้อมูลและตรวจหน้าตาแบบฝึกจาก Preview ได้ทันที</p></div><div class="builder-top-actions"><button class="btn" type="button" data-builder="cancel">ยกเลิก</button><button class="btn btn-primary" type="button" data-builder="save">บันทึกชุด</button></div></header>
 <nav class="builder-kind-tabs" aria-label="ประเภทเนื้อหา">${Object.entries(labels).map(([k,v])=>`<button type="button" data-builder-kind="${k}" class="${b.kind===k?"active":""}">${v}</button>`).join("")}</nav>
 <div class="builder-layout"><main class="builder-form">
  <section class="builder-section"><div class="builder-section-title"><span>1</span><div><h2>ข้อมูลชุด</h2><p>ตั้งชื่อและกำหนดว่าใครมองเห็นได้</p></div></div><div class="builder-grid">
  ${field("ชื่อชุด",`<input id="builderTitle" value="${escapeHtml(b.title)}" placeholder="เช่น Reading: Everyday Technology">`,true)}
  ${field("การมองเห็น",`<select id="builderVisibility"><option value="private" ${b.visibility!=="public"?"selected":""}>ส่วนตัว</option><option value="public" ${b.visibility==="public"?"selected":""}>สาธารณะ</option></select>`)}
  ${vocab?"":field("เวลาแนะนำ (นาที)",`<input id="builderMinutes" type="number" min="1" max="240" value="${b.minutes}">`)}
  ${vocab?"":field("หมวด / ประเภท",`<input id="builderCategory" value="${escapeHtml(b.category)}" placeholder="เช่น General article">`,true)}
  </div></section>
  <section class="builder-section pdf-import"><div class="builder-section-title"><span>2</span><div><h2>นำเข้าจาก PDF</h2><p>เลือกไฟล์แล้วระบบจะสร้างร่าง คุณตรวจและแก้ได้ก่อนบันทึก</p></div></div><label class="pdf-drop"><input id="builderPdf" type="file" accept="application/pdf"><strong>＋ เลือกไฟล์ PDF</strong><small>ไฟล์จะถูกอ่านในเบราว์เซอร์ของคุณ</small></label><p id="pdfStatus" class="builder-status">${escapeHtml(b.pdfStatus||"ยังไม่ได้เลือกไฟล์")}</p></section>
  ${vocab?`<section class="builder-section"><div class="builder-section-title"><span>3</span><div><h2>คำศัพท์</h2><p>เพิ่มคำศัพท์และความหมายทีละแถว</p></div></div><div id="builderWords" class="builder-words">${b.words.map(wordCard).join("")}</div><button class="btn builder-add" type="button" data-builder="add-word">＋ เพิ่มคำศัพท์</button></section>`:`
  <section class="builder-section"><div class="builder-section-title"><span>3</span><div><h2>เนื้อหาประกอบ</h2><p>บทความ บทสนทนา Passage หรือบริบทของข้อสอบ</p></div></div><textarea id="builderContent" rows="8" placeholder="วางหรือพิมพ์เนื้อหาที่นี่">${escapeHtml(b.content)}</textarea></section>
  <section class="builder-section"><div class="builder-section-title"><span>4</span><div><h2>คำถาม</h2><p>วงกลมด้านหน้าคือตัวเลือกที่เป็นคำตอบถูก</p></div></div><div id="builderQuestions" class="builder-questions">${b.questions.map(questionCard).join("")}</div><button class="btn builder-add" type="button" data-builder="add-question">＋ เพิ่มคำถาม</button></section>`}
 </main><aside class="builder-preview"><div class="preview-sticky"><div class="preview-label"><span>ตัวอย่างสำหรับผู้เรียน</span><small>LIVE PREVIEW</small></div><div id="builderPreview">${renderPreview(b)}</div></div></aside></div></section>`;
}

function renderPreview(b){
 if(b.kind==="vocab"){const rows=b.words.filter(w=>w.w||w.m).slice(0,8);return `<div class="preview-paper"><p class="content-eyebrow">FLASHCARD SET</p><h2>${escapeHtml(b.title||"ชุดคำศัพท์ใหม่")}</h2><p>${rows.length} คำ</p><div class="preview-vocab">${rows.map(w=>`<div><b>${escapeHtml(w.w||"คำศัพท์")}</b><span>${escapeHtml(w.m||"ความหมาย")}</span></div>`).join("")||"<em>เพิ่มคำศัพท์เพื่อดูตัวอย่าง</em>"}</div></div>`}
 return `<div class="preview-paper"><p class="content-eyebrow">${labels[b.kind].toUpperCase()}</p><h2>${escapeHtml(b.title||"แบบฝึกใหม่")}</h2><p>${b.minutes} นาที · ${b.questions.length} ข้อ</p>${b.content?`<div class="preview-passage">${escapeHtml(b.content.slice(0,650))}${b.content.length>650?"…":""}</div>`:""}<div class="preview-questions">${b.questions.slice(0,4).map((q,i)=>`<div><b>${i+1}. ${escapeHtml(q.prompt||"พิมพ์คำถาม")}</b>${q.choices.filter(Boolean).map(c=>`<span>○ ${escapeHtml(c)}</span>`).join("")}</div>`).join("")}</div></div>`;
}
function syncFromDom(root,b){
 b.title=root.querySelector("#builderTitle")?.value||b.title;b.visibility=root.querySelector("#builderVisibility")?.value||b.visibility;b.minutes=Math.max(1,Number(root.querySelector("#builderMinutes")?.value)||b.minutes);b.category=root.querySelector("#builderCategory")?.value||b.category;b.content=root.querySelector("#builderContent")?.value||b.content;
 root.querySelectorAll("[data-question]").forEach(card=>{const q=b.questions[Number(card.dataset.question)];if(!q)return;q.prompt=card.querySelector("[data-q-field=prompt]")?.value||"";card.querySelectorAll("[data-choice]").forEach(x=>q.choices[Number(x.dataset.choice)]=x.value);q.answer=Number(card.querySelector("[data-q-answer]:checked")?.dataset.qAnswer)||0});
 root.querySelectorAll("[data-word]").forEach(row=>{const w=b.words[Number(row.dataset.word)];if(!w)return;w.w=row.querySelector("[data-word-field=w]")?.value||"";w.m=row.querySelector("[data-word-field=m]")?.value||""});
}
function parseQuestions(text){
 const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),out=[];let q=null;
 for(const line of lines){const qm=line.match(/^(?:Q(?:uestion)?\s*)?\d+[.)]\s*(.+)/i),cm=line.match(/^[A-D][.)]\s*(.+)/i);if(qm){if(q)out.push(q);q={prompt:qm[1],choices:[],answer:0}}else if(cm&&q)q.choices.push(cm[1]);else if(q&&q.choices.length===0)q.prompt+=" "+line}
 if(q)out.push(q);return out.filter(x=>x.prompt).map(x=>({...x,choices:[...x.choices,"","","",""].slice(0,4)})).slice(0,60);
}
function parseWords(text){
 const out=[];for(const raw of text.split(/\r?\n/)){const line=raw.trim();if(!line)continue;const m=line.match(/^([A-Za-z][A-Za-z '-]{1,40})\s*(?:[-–—:=\t]|\s{2,})\s*(.{1,120})$/);if(m)out.push({w:m[1].trim(),m:m[2].trim()})}return out.slice(0,200);
}
async function readPdf(file){
 const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");pdfjs.GlobalWorkerOptions.workerSrc=pdfWorkerUrl;
 const data=new Uint8Array(await file.arrayBuffer()),pdf=await pdfjs.getDocument({data}).promise,parts=[];
 for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p),content=await page.getTextContent();parts.push(content.items.map(x=>x.str).join(" "))}
 return parts.join("\n");
}

export function bindContentBuilder(root,b,hooks){
 const refresh=()=>{syncFromDom(root,b);const host=root.querySelector("#builderPreview");if(host)host.innerHTML=renderPreview(b)};
 root.querySelector(".builder-form")?.addEventListener("input",refresh);
 root.querySelectorAll("[data-builder-kind]").forEach(x=>x.onclick=()=>{syncFromDom(root,b);hooks.changeKind(x.dataset.builderKind)});
 root.querySelectorAll("[data-builder]").forEach(x=>x.onclick=async()=>{
  syncFromDom(root,b);const a=x.dataset.builder,i=Number(x.dataset.index);
  if(a==="cancel")return hooks.cancel();if(a==="save")return hooks.save(b);
  if(a==="add-question")b.questions.push(blankQuestion());if(a==="duplicate-question")b.questions.splice(i+1,0,structuredClone(b.questions[i]));if(a==="delete-question"&&b.questions.length>1)b.questions.splice(i,1);
  if(a==="add-word")b.words.push({w:"",m:""});if(a==="delete-word"&&b.words.length>1)b.words.splice(i,1);hooks.rerender();
 });
 const pdf=root.querySelector("#builderPdf");if(pdf)pdf.onchange=async()=>{const file=pdf.files?.[0];if(!file)return;const status=root.querySelector("#pdfStatus");status.textContent="กำลังอ่านข้อความจาก PDF…";status.classList.add("loading");try{const text=await readPdf(file);b.pdfName=file.name;b.pdfText=text;if(b.kind==="vocab"){const words=parseWords(text);if(words.length)b.words=words;b.pdfStatus=words.length?`สร้างร่างคำศัพท์ ${words.length} คำจาก ${file.name}`:"อ่านไฟล์ได้ แต่ยังจับคู่คำศัพท์ไม่ได้ กรุณาเพิ่มคำด้วยตนเอง"}else{const questions=parseQuestions(text);b.content=text.slice(0,15000);if(questions.length)b.questions=questions;b.pdfStatus=questions.length?`สร้างร่างคำถาม ${questions.length} ข้อจาก ${file.name}`:`นำข้อความจาก ${file.name} แล้ว กรุณาเพิ่มคำถาม`}hooks.rerender()}catch(e){b.pdfStatus="อ่าน PDF ไม่สำเร็จ: "+(e.message||"ไฟล์อาจถูกล็อกหรือเป็นภาพสแกน");hooks.rerender()}};
}

export function builderData(b){
 const cleanQuestions=b.questions.map(q=>({prompt:q.prompt.trim(),choices:q.choices.map(x=>x.trim()),answer:Number(q.answer)||0})).filter(q=>q.prompt);
 const payload={minutes:b.minutes,questions:cleanQuestions,itemCount:cleanQuestions.length};
 if(b.kind==="reading"){payload.text=b.content.trim();payload.category=b.category.trim()||"General article"}
 if(b.kind==="listening"){payload.script=b.content.trim();payload.type=b.category.trim()||"Conversation";payload.accent="en-US"}
 if(b.kind==="writing"){payload.passage=b.content.trim();payload.type=b.category.trim()||"Text Completion"}
 if(b.kind==="mock"){payload.sections=[{title:b.category.trim()||"Mock Exam",description:"Imported or custom practice",context:b.content.trim(),questions:cleanQuestions}];payload.questions=cleanQuestions.length;payload.itemCount=cleanQuestions.length}
 return {kind:b.kind,id:b.id,title:b.title.trim(),visibility:b.visibility,payload,words:b.words.map(normalWord).filter(w=>w.w.trim()&&w.m.trim())};
}
