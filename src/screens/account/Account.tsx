import { Link } from "react-router-dom";
import { PageHeader } from "../../ui";

const tabs: Array<[string, string, string]> = [
  ["profile", "โปรไฟล์", "ชื่อ รูปภาพ และกิจกรรมการเรียน"],
  ["plan", "แพ็กเกจและการชำระเงิน", "ดูสิทธิ์ อัปเกรด หรือจัดการสมาชิก"],
  ["settings", "การตั้งค่า", "ภาษา ธีม และเสียง"],
  ["privacy", "ข้อมูลและความเป็นส่วนตัว", "ดาวน์โหลดข้อมูลหรือจัดการบัญชี"],
];

export function Account() {
  return (
    <>
      <PageHeader eyebrow="ACCOUNT" title="บัญชีของฉัน" description="เลือกหัวข้อที่ต้องการจัดการ" />
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {tabs.map(([id, label, desc]) => (
          <Link
            key={id}
            to={`/account/${id}`}
            className="flex items-center gap-4 px-4 py-4 hover:bg-surface-2"
          >
            <div className="min-w-0 flex-1">
              <b className="block text-sm">{label}</b>
              <small className="text-xs text-muted">{desc}</small>
            </div>
            <span className="text-subtle">›</span>
          </Link>
        ))}
      </div>
    </>
  );
}
