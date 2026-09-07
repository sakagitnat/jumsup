// The admin API's Cloudflare Functions throw plain internal codes (e.g.
// "INVALID_CODE") that useAsync() used to toast verbatim -- clear to a
// developer, meaningless to whoever's actually running the admin panel.
// Translate the ones we know; anything unmapped still falls back to the
// raw code rather than hiding a real, unexpected error.
const MESSAGES: Record<string, string> = {
  INVALID_CODE:
    "โค้ดไม่ถูกต้อง: ใช้ได้เฉพาะตัวพิมพ์ใหญ่ A-Z, ตัวเลข, _ และ - เท่านั้น ความยาว 4-32 ตัวอักษร",
  INVALID_PREFIX:
    "Prefix ไม่ถูกต้อง: ใช้ได้เฉพาะตัวพิมพ์ใหญ่ A-Z, ตัวเลข, _ และ - เท่านั้น ความยาว 2-16 ตัวอักษร",
  DAYS_MUST_BE_1_TO_90: "จำนวนวัน Pro ต้องอยู่ระหว่าง 1-90 วัน",
  MAX_USES_MUST_BE_1_TO_100: "จำนวนสิทธิ์ใช้งานต้องอยู่ระหว่าง 1-100",
  EXPIRY_MUST_BE_1_TO_90_DAYS: "วันหมดอายุต้องอยู่ระหว่าง 1-90 วัน",
  EXPIRY_MUST_BE_1_TO_180_DAYS: "วันหมดอายุต้องอยู่ระหว่าง 1-180 วัน",
  COUNT_MUST_BE_1_TO_200: "จำนวนโค้ดต้องอยู่ระหว่าง 1-200",
  ACTIVE_CODE_LIMIT_REACHED: "มีโค้ดที่เปิดใช้งานอยู่ครบ 50 โค้ดแล้ว ปิดโค้ดเก่าก่อนสร้างใหม่",
  GIFT_LIABILITY_LIMIT_REACHED:
    "ภาระ Pro-days รวมของโค้ดที่เปิดใช้งานอยู่จะเกิน 5,000 วัน ลดจำนวนวัน/สิทธิ์ หรือปิดโค้ดเก่าก่อน",
  FORBIDDEN: "ไม่มีสิทธิ์ทำรายการนี้",
  UNAUTHORIZED: "กรุณาเข้าสู่ระบบใหม่",
  CANNOT_MODIFY_SELF: "ไม่สามารถแก้ไขบัญชีของตัวเองด้วยวิธีนี้ได้",
  INVALID_ACTION: "การกระทำไม่ถูกต้อง",
  INVALID_CONTENT_ID: "รหัสเนื้อหาไม่ถูกต้อง",
  INVALID_CONTENT_TYPE: "ประเภทเนื้อหาไม่ถูกต้อง",
  INVALID_DAYS: "จำนวนวันไม่ถูกต้อง",
  INVALID_FACTOR: "ค่าตัวคูณไม่ถูกต้อง",
  INVALID_ID: "รหัสไม่ถูกต้อง",
  INVALID_JOB: "งานที่เลือกไม่ถูกต้อง",
  INVALID_KIND: "ประเภทไม่ถูกต้อง",
  INVALID_NAME: "ชื่อไม่ถูกต้อง",
  INVALID_ORIGIN: "คำขอมาจากแหล่งที่ไม่ได้รับอนุญาต",
  INVALID_REFUND_REQUEST_ID: "รหัสคำขอคืนเงินไม่ถูกต้อง",
  INVALID_ROLE: "สิทธิ์ผู้ใช้ไม่ถูกต้อง",
  INVALID_STATUS: "สถานะไม่ถูกต้อง",
  INVALID_VISIBILITY: "ค่าการมองเห็นไม่ถูกต้อง",
  INVALID_XP: "ค่า XP ไม่ถูกต้อง",
  NOTHING_TO_UPDATE: "ไม่มีข้อมูลให้อัปเดต",
  PAYMENT_INTENT_NOT_AVAILABLE: "ไม่พบรายการชำระเงินนี้",
  REFUND_AMOUNT_TOO_HIGH: "จำนวนเงินคืนสูงเกินยอดที่ชำระจริง",
  REFUND_CREATED_BUT_SUBSCRIPTION_CANCEL_FAILED:
    "สร้างรายการคืนเงินแล้ว แต่ยกเลิกการสมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบด้วยตนเอง",
  REFUND_REQUEST_NOT_FOUND: "ไม่พบคำขอคืนเงินนี้",
  REFUND_REQUEST_NOT_PENDING: "คำขอคืนเงินนี้ถูกดำเนินการไปแล้ว",
  SERVER_NOT_CONFIGURED: "เซิร์ฟเวอร์ยังตั้งค่าไม่ครบ ติดต่อผู้ดูแลระบบ",
  SUGGESTION_NOT_FOUND: "ไม่พบคำแนะนำนี้",
  TOO_MANY_TIERS: "จำนวนระดับมากเกินไป",
};

export function friendlyError(message: string): string {
  return MESSAGES[message] || message;
}
