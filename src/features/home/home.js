import { Header } from "../../components/ui.js";
import { todayKey } from "../../lib/utils.js";
export function renderHome(s){
 const checked=s.lastCheckin===todayKey();
 return `${Header("ENGLISH PRACTICE","ฝึกภาษาอังกฤษในแบบของคุณ","Flashcard, Reading, Listening, Writing และแบบทดสอบในที่เดียว","Practice Hub")}
 <div class="grid g3">
  <div class="card"><span class="tag blue">XP</span><h3>${s.xp.toLocaleString()} XP</h3><p>ความก้าวหน้ารวม</p></div>
  <div class="card"><span class="tag green">STREAK</span><h3>${s.streak} วัน</h3><p>${checked?"เช็คอินแล้ววันนี้":"ยังไม่ได้เช็คอินวันนี้"}</p></div>
  <div class="card"><span class="tag yellow">DECKS</span><h3>${s.decks.length} ชุด</h3><p>เลือกชุดแล้วเริ่มฝึกได้ทันที</p></div>
 </div>
 <div class="section-title"><h2>เริ่มฝึก</h2></div>
 <div class="grid g3">
 ${["flash|Aa|Flashcard|วนคำจนจำครบ","reading|R|Reading|อ่าน แตะคำ แปล และเก็บศัพท์","listening|L|Listening|ฟังบทสนทนาและตอบคำถาม","writing|W|Writing|Text Completion และเรียงย่อหน้า","mock|M|Mock Exam|สร้างและเลือกชุดข้อสอบ","community|◇|Community|ค้นหาชุดจากผู้ใช้อื่น"].map(x=>{const[a,b,c,d]=x.split("|");return `<div class="card skill-card"><div class="skill-icon">${b}</div><div class="grow"><b>${c}</b><small>${d}</small></div><button class="btn" data-nav="${a}">เปิด</button></div>`}).join("")}
 </div>
 <div class="section-title"><h2>เช็คอินรายวัน</h2></div>
 <div class="card skill-card"><div class="skill-icon">✓</div><div class="grow"><b>${checked?"เช็คอินแล้ว":"ยังไม่ได้เช็คอินวันนี้"}</b><small>เช็คอินเพื่อรักษา Streak และรับ XP</small></div><button class="btn btn-primary" data-action="checkin" ${checked?"disabled":""}>${checked?"เช็คอินแล้ว ✓":"เช็คอิน +20 XP"}</button></div>`;
}
