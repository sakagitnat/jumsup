import { useStore } from "../../store/useStore";
import { exportAccountData, requestAccountDelete } from "../../actions";
import { AccountShell } from "./AccountShell";
import { Card, Button } from "../../ui";

export function AccountPrivacy() {
  const user = useStore((s) => s.user);

  return (
    <AccountShell title="ข้อมูลและความเป็นส่วนตัว">
      {!user ? (
        <Card soft>
          <p className="text-sm text-muted">เข้าสู่ระบบเพื่อจัดการข้อมูลบัญชีของคุณ</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="flex items-start gap-3">
              <span className="text-success">✓</span>
              <div>
                <b className="block text-sm">ข้อมูลของคุณจัดเก็บไว้ในบัญชี</b>
                <small className="text-xs text-muted">
                  ข้อมูลการเรียนและชุดที่สร้างจะ Sync อย่างปลอดภัย และไม่แสดงอีเมลต่อผู้ใช้อื่น
                </small>
              </div>
            </div>
            <Button className="mt-3" onClick={exportAccountData}>
              ดาวน์โหลดข้อมูลของฉัน (JSON)
            </Button>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-danger-soft text-danger">
                !
              </span>
              <div className="flex-1">
                <b className="block text-sm">ลบบัญชี</b>
                <small className="text-xs text-muted">มีช่วงรอ 7 วันก่อนดำเนินการ</small>
              </div>
              <Button variant="danger" onClick={requestAccountDelete}>
                ขอลบบัญชี
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AccountShell>
  );
}
