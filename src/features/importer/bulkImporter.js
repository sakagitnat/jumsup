import { escapeHtml } from "../../lib/utils.js";

const TYPES={
 vocab:{label:"ชุดคำศัพท์",headers:["word","pronunciation","meaning","example","tags"],required:["word"]},
 reading:{label:"Reading",headers:["passage_id","title","passage","question","choice_a","choice_b","choice_c","choice_d","correct_answer","explanation"],required:["passage_id","passage","question","choice_a","choice_b","correct_answer"]},
 listening:{label:"Listening",headers:["conversation_id","part","title","situation","dialogue","transcript_visibility","question","choice_a","choice_b","choice_c","choice_d","correct_answer","explanation"],required:["conversation_id","part","dialogue","question","choice_a","choice_b","correct_answer"]},
 writing:{label:"Writing",headers:["passage_id","part","title","directions","passage","question","choice_a","choice_b","choice_c","choice_d","correct_answer","explanation"],required:["passage_id","part","passage","question","choice_a","choice_b","correct_answer"]},
 mock:{label:"Mock Exam",headers:["section_id","section_title","section_type","time_minutes","question","choice_a","choice_b","choice_c","choice_d","correct_answer","points"],required:["section_id","section_title","section_type","question","choice_a","choice_b","correct_answer"]}
};

export function importerModal(type="vocab",step=1,state={}){
 const t=TYPES[type]||TYPES.vocab;
 const steps=["เลือกไฟล์","จับคู่คอลัมน์","ตรวจข้อมูล","ยืนยัน"];
 return `<div class="bulk-import" data-import-type="${type}" data-import-step="${step}">
  <div class="import-type-tabs">${Object.entries(TYPES).map(([k,v])=>`<button type="button" class="btn ${k===type?"btn-primary":""}" data-action="import-change-type" data-type="${k}">${v.label}</button>`).join("")}</div>
  <div class="import-steps">${steps.map((x,i)=>`<div class="import-step ${i+1===step?"active":""} ${i+1<step?"done":""}"><span>${i+1}</span>${x}</div>`).join("")}</div>
  ${step===1?fileStep(type,t):step===2?mapStep(t,state):step===3?reviewStep(type,state):confirmStep(type,state)}
 </div>`;
}

function fileStep(type,t){return `<div class="import-panel"><h3>นำเข้า ${t.label}</h3><p>ใช้ไฟล์ CSV UTF-8 ที่มีชื่อคอลัมน์ตามแม่แบบ</p><div class="import-template-row"><span>ยังไม่มีไฟล์ตามรูปแบบ?</span><button class="btn" type="button" data-action="import-download-template" data-type="${type}">ดาวน์โหลดเทมเพลต CSV</button></div><label class="import-drop" data-import-drop><span class="import-drop-icon">⇩</span><strong data-import-drop-status>ลากไฟล์ CSV มาวางตรงนี้</strong><span>หรือคลิกเพื่อเลือกไฟล์จากเครื่อง</span><input id="bulkImportFile" type="file" accept=".csv,text/csv"><small>ระบบจะแสดงตัวอย่างก่อน และจะยังไม่บันทึกทันที</small></label><div id="importFileError" class="import-error hidden"></div></div>`}
function mapStep(t,state){const headers=state.headers||[];return `<div class="import-panel"><h3>จับคู่คอลัมน์</h3><p>${escapeHtml(state.fileName||"")} · พบ ${state.rows?.length||0} แถว</p><div class="import-map-list">${t.headers.map(h=>`<label><span>${h}${t.required.includes(h)?" *":""}</span><select data-import-map="${h}"><option value="">ไม่ต้องนำเข้า</option>${headers.map(x=>`<option value="${escapeHtml(x)}" ${x.toLowerCase()===h?"selected":""}>${escapeHtml(x)}</option>`).join("")}</select></label>`).join("")}</div></div>`}
function reviewStep(type,state){const checked=state.checked||{valid:[],errors:[]};return `<div class="import-panel"><h3>ตรวจข้อมูลก่อนนำเข้า</h3><div class="import-summary"><div>ทั้งหมด<b>${checked.valid.length+checked.errors.length}</b></div><div class="ok">พร้อมนำเข้า<b>${checked.valid.length}</b></div><div class="bad">ต้องแก้<b>${checked.errors.length}</b></div></div><div class="table-responsive"><table class="import-table"><thead><tr><th>แถว</th><th>รายการ</th><th>สถานะ</th></tr></thead><tbody>${checked.errors.slice(0,50).map(x=>`<tr><td>${x.row}</td><td>${escapeHtml(x.name||"—")}</td><td class="bad">${escapeHtml(x.message)}</td></tr>`).join("")||`<tr><td colspan="3" class="ok">ข้อมูลทั้งหมดพร้อมนำเข้า</td></tr>`}</tbody></table></div>${checked.errors.length?`<p class="import-note">รายการที่มีปัญหาจะไม่ถูกนำเข้า คุณสามารถแก้ไฟล์แล้วเลือกใหม่ หรือดำเนินการเฉพาะรายการที่พร้อมได้</p>`:""}</div>`}
function confirmStep(type,state){const n=state.checked?.valid?.length||0;return `<div class="import-panel import-confirm"><h3>พร้อมสร้างฉบับร่าง</h3><p>${n} รายการจะถูกเพิ่มเป็น${TYPES[type].label}ส่วนตัว คุณยังตรวจและแก้ไขได้ก่อนเผยแพร่</p></div>`}

export function parseCsv(text){
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'){if(quoted&&n==='"'){cell+='"';i++}else quoted=!quoted}else if(c===","&&!quoted){row.push(cell);cell=""}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&n==="\n")i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell=""}else cell+=c}
 row.push(cell);if(row.some(v=>v.trim()))rows.push(row);if(!rows.length)return{headers:[],rows:[]};
 const headers=rows[0].map((x,i)=>(i===0?x.replace(/^\uFEFF/,""):x).trim());
 return{headers,rows:rows.slice(1).map(cols=>Object.fromEntries(headers.map((h,i)=>[h,(cols[i]||"").trim()]))) };
}

export function validateImport(type,rows,mapping){
 const t=TYPES[type],valid=[],errors=[];
 rows.forEach((raw,i)=>{const item=Object.fromEntries(t.headers.map(h=>[h,mapping[h]?raw[mapping[h]]||"":""]));const missing=t.required.filter(h=>!item[h]);let message=missing.length?`ไม่มี ${missing.join(", ")}`:"";if(!message&&item.correct_answer&&!/^[A-D]$/i.test(item.correct_answer))message="correct_answer ต้องเป็น A, B, C หรือ D";(message?errors:valid).push(message?{row:i+2,name:item.word||item.title||item.question,message}:{...item,_row:i+2})});
 return{valid,errors};
}

export function downloadTemplate(type){const t=TYPES[type]||TYPES.vocab,examples={vocab:["significant","sig-NIF-i-cant","สำคัญ / มีนัยสำคัญ","The change had a significant effect.","academic"],reading:["R001","Urban Green Spaces","Cities are investing in parks.","What is the main idea?","Public parks","City transport","Online learning","Food prices","A","The passage focuses on parks."],listening:["C01","short_conversation","Returning a library book","At the library desk","Student: I may have returned this book to the wrong desk. Librarian: Let me check the system for you.","hidden","What is the student concerned about?","A late fee","A misplaced return","A library card","A study room","B","The student thinks the book may be at the wrong desk."],writing:["P01","text_completion","A Rooftop Seed Library","Choose the best answer for each blank.","A neighborhood center has created a rooftop seed library. Residents (1) _____ packets and record what they take.","donate","donates","donated","donating","A","The plural subject Residents takes donate."],mock:["S01","Listening","listening","25","Which platform?","3","4","5","6","D","1"]};const esc=v=>`"${String(v??"").replaceAll('"','""')}"`;const csv=`\uFEFF${t.headers.map(esc).join(",")}\r\n${examples[type].map(esc).join(",")}\r\n`;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=`jumsup-${type}-template.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

export function buildImportedContent(type,rows,creator){
 const id=crypto.randomUUID();
 const groupBy=(items,key)=>items.reduce((out,x)=>{const k=x[key]||"default";(out[k]||=[]).push(x);return out},{});
 const q=x=>({id:`q-${crypto.randomUUID()}`,prompt:x.question,choices:[x.choice_a,x.choice_b,x.choice_c,x.choice_d].filter(Boolean),answer:"ABCD".indexOf(String(x.correct_answer).toUpperCase()),explanation:x.explanation||""});
 if(type==="vocab")return{key:"decks",value:{id:`deck-${id}`,name:`Imported vocabulary ${new Date().toLocaleDateString()}`,visibility:"private",creator,words:rows.map(x=>({w:x.word,stress:x.pronunciation||"",m:x.meaning||"",e:x.example||""}))}};
 if(type==="listening"){const groups=groupBy(rows,"conversation_id");return{key:"listening",value:{id:`listening-${id}`,title:`A-Level Parallel Listening ${new Date().toLocaleDateString()}`,visibility:"private",creator,minutes:25,itemCount:rows.length,sections:Object.entries(groups).map(([gid,g])=>({id:gid,part:g[0].part,title:g[0].title,situation:g[0].situation,script:g[0].dialogue,showTranscript:String(g[0].transcript_visibility||"hidden").toLowerCase()==="visible",questions:g.map(q)}))}}}
 if(type==="writing"){const groups=groupBy(rows,"passage_id");return{key:"writing",value:{id:`writing-${id}`,title:`A-Level Parallel Writing ${new Date().toLocaleDateString()}`,visibility:"private",creator,minutes:25,itemCount:rows.length,sections:Object.entries(groups).map(([gid,g])=>({id:gid,part:g[0].part,title:g[0].title,directions:g[0].directions,passage:g[0].passage,questions:g.map(q)}))}}}
 if(type==="mock"){const groups=groupBy(rows,"section_id");return{key:"mocks",value:{id:`mock-${id}`,title:`Imported mock exam ${new Date().toLocaleDateString()}`,visibility:"private",creator,minutes:Object.values(groups).reduce((n,g)=>n+(Number(g[0].time_minutes)||0),0),sections:Object.entries(groups).map(([sid,g])=>({id:sid,title:g[0].section_title,type:g[0].section_type,questions:g.map(q)})),itemCount:rows.length}}}
 const groups=groupBy(rows,"passage_id");return{key:"reading",value:{id:`reading-${id}`,title:`Imported reading ${new Date().toLocaleDateString()}`,visibility:"private",creator,minutes:10,sections:Object.entries(groups).map(([gid,g])=>({id:gid,title:g[0].title,text:g[0].passage,questions:g.map(q)})),itemCount:rows.length}};
}

export { TYPES };

