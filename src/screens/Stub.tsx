import { PageHeader, Card } from "../ui";

export function Stub({ title }: { title: string }) {
  return (
    <>
      <PageHeader eyebrow="JUMSUP" title={title} />
      <Card soft>
        <p className="text-sm text-muted">
          หน้านี้กำลังย้ายมาอยู่บนอินเทอร์เฟซใหม่ — จะพร้อมใช้งานใน PR ถัดไป
          ระบบเดิมยังทำงานได้ตามปกติ
        </p>
      </Card>
    </>
  );
}
