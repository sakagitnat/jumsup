export const languages=[
 ["th","ไทย"],["en","English"],["zh","中文"],["ja","日本語"],["ko","한국어"],
 ["pt","Português (Brasil)"],["de","Deutsch"],["ru","Русский"],["hi","हिन्दी"]
];
const t={
 th:{home:"หน้าแรก",vocab:"คำศัพท์",practice:"ฝึกทักษะ",manage:"จัดการ",system:"ระบบ",flash:"Flashcard",match:"Match",cross:"Crossword",reading:"Reading",listening:"Listening",writing:"Writing",mock:"Mock Exam",weak:"จุดอ่อน",community:"Community",add:"เพิ่มเนื้อหา",mine:"เนื้อหาของฉัน",account:"บัญชี",profile:"โปรไฟล์",settings:"ตั้งค่า"},
 en:{home:"Home",vocab:"Vocabulary",practice:"Practice Skills",manage:"Manage",system:"System",flash:"Flashcards",match:"Match",cross:"Crossword",reading:"Reading",listening:"Listening",writing:"Writing",mock:"Mock Exam",weak:"Weak Points",community:"Community",add:"Add Content",mine:"My Content",account:"Account",profile:"Profile",pricing:"Pricing",settings:"Settings"}
};
export function tr(lang,key){return t[lang]?.[key]||t.en[key]||key}
