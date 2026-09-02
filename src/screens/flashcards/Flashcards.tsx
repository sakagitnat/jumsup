import { useStore } from "../../store/useStore";
import { PageHeader, Card, Tag, Button, LinkButton, toast } from "../../ui";

const soon = () => toast("การสร้าง/แก้ไข/นำเข้าชุด จะพร้อมใน PR ถัดไป");

export function Flashcards() {
  const decks = useStore((s) => s.decks);

  return (
    <>
      <PageHeader
        eyebrow="VOCABULARY"
        title="เลือกชุดคำศัพท์"
        description="เลือกชุดก่อนเริ่มฝึก แก้ไข ลบ และกำหนดการมองเห็นได้"
        actions={
          <>
            <Button variant="primary" onClick={soon}>
              + สร้างชุดใหม่
            </Button>
            <Button onClick={soon}>นำเข้าหลายคำ</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {decks.map((d) => {
          const official = d.official || d.visibility === "public";
          return (
            <Card key={d.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Tag tone={official ? "success" : "info"}>
                    {d.official
                      ? "ชุดทางการ"
                      : d.visibility === "public"
                        ? "สาธารณะ"
                        : "ส่วนตัว"}
                  </Tag>
                  <h3 className="mt-2 truncate text-base font-semibold">{d.name}</h3>
                  <p className="text-sm text-muted">
                    {d.words.length} คำ · สร้างโดย @{d.creator}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <LinkButton variant="primary" size="sm" to={`/flash/study/${d.id}`}>
                  เริ่ม Flashcards
                </LinkButton>
                {!d.official && (
                  <>
                    <Button size="sm" onClick={soon}>
                      แก้ไข
                    </Button>
                    <Button size="sm" variant="danger" onClick={soon}>
                      ลบ
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
