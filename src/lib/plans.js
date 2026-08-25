export const SUPPORTED_BILLING_CURRENCIES=["THB","USD"];
export function defaultBillingCurrency(){const locale=(typeof navigator!=="undefined"?navigator.language:"")||"";return locale.toLowerCase().startsWith("th")?"THB":"USD"}
export const PLANS={
 free:{id:"free",name:"Jumsup Free",prices:{THB:0,USD:0},features:[
  "Flashcard สูงสุด 100 คำต่อชุด และสร้างเองได้ 3 ชุด",
  "เก็บชุดจาก Community ได้พร้อมกัน 3 ชุด",
  "Match 10 รอบ และ Crossword 3 รอบต่อวัน",
  "เก็บชุด Reading, Listening, Writing และ Mock ส่วนตัวอย่างละ 1 ชุด",
  "Reading, Listening, Writing และ Mock ทดลองอย่างละ 3 รอบต่อช่วง 3 วัน",
  "เมื่อครบโควต้า ระบบแสดงวันและชั่วโมงจนกว่าจะปลดล็อก",
  "คลังแปลออฟไลน์ยังไม่จำกัดระหว่างเตรียม Google API",
  "ใช้งานและแชร์ชุดใน Community"
 ]},
 monthly:{id:"monthly",name:"Jumsup Pro",prices:{THB:149,USD:4.99},period:{THB:"เดือน",USD:"month"},features:[
  "สร้างและเก็บชุดได้ไม่จำกัด สูงสุด 1,000 คำต่อชุด",
  "แปลคำศัพท์ 100 คำต่อวัน",
  "ฝึก Reading, Listening, Writing และ Mock ได้ไม่จำกัด",
  "นำเข้า CSV ได้สูงสุด 1,000 แถวต่อครั้ง",
  "สถิติการเรียนและจุดอ่อนแบบละเอียด",
  "ยกเลิกได้ทุกเมื่อ สิทธิ์อยู่ถึงวันสิ้นรอบ"
 ]},
 yearly:{id:"yearly",name:"Jumsup Pro",prices:{THB:1190,USD:39.99},period:{THB:"ปี",USD:"year"},monthlyEquivalent:{THB:99,USD:3.33},features:[
  "สิทธิ์ Pro ครบทุกอย่างเหมือนรายเดือน",
  "ประหยัดเมื่อเทียบกับการชำระรายเดือน",
  "เก็บชุดส่วนตัวได้ไม่จำกัด",
  "แปลคำศัพท์ 100 คำต่อวัน",
  "ฝึกทุกทักษะและ Mock ได้ไม่จำกัด",
  "ยกเลิกได้ทุกเมื่อ สิทธิ์อยู่ถึงวันสิ้นรอบ"
 ]}
};

export function money(value,currency="THB"){
 const c=SUPPORTED_BILLING_CURRENCIES.includes(currency)?currency:"THB";
 return new Intl.NumberFormat(c==="THB"?"th-TH":"en-US",{style:"currency",currency:c,minimumFractionDigits:c==="THB"?0:2,maximumFractionDigits:c==="THB"?0:2}).format(value);
}

export const FREE_LIMITS={privateVocab:3,privatePractice:1,wordsPerDeck:100,communitySets:3,matchPerDay:10,crosswordPerDay:3,translationsPerDay:Infinity};
export const PRO_LIMITS={privateVocab:Infinity,privatePractice:Infinity,wordsPerDeck:1000,communitySets:Infinity,matchPerDay:Infinity,crosswordPerDay:Infinity,translationsPerDay:1000,importRows:1000};

