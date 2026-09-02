import { Link } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { logout } from "../../actions/auth";
import { PageHeader, Button } from "../../ui";

const tabs: Array<[string, string, string]> = [
  ["profile", "โปรไฟล์", "ชื่อ รูปภาพ และกิจกรรมการเรียน"],
  ["plan", "แพ็กเกจและการชำระเงิน", "ดูสิทธิ์ อัปเกรด หรือจัดการสมาชิก"],
  ["settings", "การตั้งค่า", "ภาษา ธีม และเสียง"],
  ["privacy", "ข้อมูลและความเป็นส่วนตัว", "ดาวน์โหลดข้อมูลหรือจัดการบัญชี"],
];

const links: Array<[string, string, string]> = [
  ["/onboarding", "แผนการเรียน", "เป้าหมาย วันสอบ เวลาต่อวัน และทักษะที่เน้น"],
  ["/stats", "สถิติการเรียน", "ความก้าวหน้าและคำที่ยังไม่แม่น"],
  ["/library", "คลังของฉัน", "ชุดที่คุณสร้างหรือนำเข้า"],
];

export function Account() {
  const user = useStore((s) => s.user);

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
        {links.map(([to, label, desc]) => (
          <Link key={to} to={to} className="flex items-center gap-4 px-4 py-4 hover:bg-surface-2">
            <div className="min-w-0 flex-1">
              <b className="block text-sm">{label}</b>
              <small className="text-xs text-muted">{desc}</small>
            </div>
            <span className="text-subtle">›</span>
          </Link>
        ))}
      </div>

      {user && (
        <Button variant="secondary" className="mt-4" onClick={logout}>
          ออกจากระบบ
        </Button>
      )}
    </>
  );
}
