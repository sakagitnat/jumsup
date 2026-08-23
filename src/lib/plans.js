export const PLANS={
 free:{id:"free",name:"Jumsup Free",price:0,features:[
  "เรียน Flashcards, Match และ Crossword ได้ไม่จำกัด",
  "เก็บชุดคำศัพท์ส่วนตัว 3 ชุด",
  "เก็บชุด Reading, Listening, Writing และ Mock ส่วนตัวอย่างละ 1 ชุด",
  "แปลคำศัพท์ 10 คำต่อวัน",
  "Listening, Writing และ Mock อย่างละ 1 รอบต่อวัน",
  "ใช้งานและแชร์ชุดใน Community"
 ]},
 monthly:{id:"monthly",name:"Jumsup Pro",price:149,period:"เดือน",features:[
  "เก็บชุดส่วนตัวได้ไม่จำกัด",
  "แปลคำศัพท์ 100 คำต่อวัน",
  "ฝึก Reading, Listening, Writing และ Mock ได้ไม่จำกัด",
  "นำเข้า CSV ได้สูงสุด 1,000 แถวต่อครั้ง",
  "สถิติการเรียนและจุดอ่อนแบบละเอียด",
  "ยกเลิกได้ทุกเมื่อ สิทธิ์อยู่ถึงวันสิ้นรอบ"
 ]},
 yearly:{id:"yearly",name:"Jumsup Pro",price:1190,period:"ปี",monthlyEquivalent:99,features:[
  "สิทธิ์ Pro ครบทุกอย่างเหมือนรายเดือน",
  "ประหยัด 598 บาทต่อปี เทียบกับรายเดือน",
  "เก็บชุดส่วนตัวได้ไม่จำกัด",
  "แปลคำศัพท์ 100 คำต่อวัน",
  "ฝึกทุกทักษะและ Mock ได้ไม่จำกัด",
  "ยกเลิกได้ทุกเมื่อ สิทธิ์อยู่ถึงวันสิ้นรอบ"
 ]}
};

export const FREE_LIMITS={privateVocab:3,privatePractice:1,translationsPerDay:10,dailyListening:1,dailyWriting:1,dailyMock:1};
export const PRO_LIMITS={privateVocab:Infinity,privatePractice:Infinity,translationsPerDay:100,dailyListening:Infinity,dailyWriting:Infinity,dailyMock:Infinity,importRows:1000};
