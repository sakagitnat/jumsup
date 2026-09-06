import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { deleteContent } from "../../actions/content";
import { DeckEditor } from "./DeckEditor";
import { DeleteDialog } from "../common/DeleteDialog";
import { BulkImport } from "../import/BulkImport";
import { PageHeader, Card, Tag, Button, LinkButton, IconEdit, IconTrash } from "../../ui";
import { examLabel, levelLabel } from "../../lib/taxonomy";
import { dueCount } from "../../lib/srs";

export function Flashcards() {
  const decks = useStore((s) => s.decks);
  const contentLoaded = useStore((s) => s.contentLoaded);
  const srs = useStore((s) => s.srs);
  const navigate = useNavigate();
  const totalDue = decks.reduce((n, d) => n + dueCount(srs[d.id]), 0);
  const [editor, setEditor] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [del, setDel] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="VOCABULARY"
        title="ชุดคำศัพท์ของฉัน"
        description="3 ชุดหลักจาก Jumsup พร้อมชุดที่คุณสร้างหรือนำเข้า — เปิดชุดเพื่อเล่น Flashcard, Match หรือ Crossword และหาชุดเพิ่มเติมได้ที่ Community"
        actions={
          <>
            <Button variant="primary" onClick={() => setEditor({ open: true, id: null })}>
              + สร้างชุดใหม่
            </Button>
            <Button onClick={() => setImporting(true)}>นำเข้าหลายคำ</Button>
            <Button onClick={() => navigate("/community")}>ค้นหาใน Community</Button>
          </>
        }
      />

      {totalDue > 0 && (
        <Card soft className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <b className="text-sm">ครบกำหนดทบทวนวันนี้ {totalDue} คำ</b>
            <p className="text-xs text-muted">ทบทวนตามรอบช่วยให้จำได้นานขึ้น</p>
          </div>
          <Button
            variant="success"
            size="sm"
            onClick={() => {
              const dueDecks = decks.filter((d) => dueCount(srs[d.id]) > 0).map((d) => d.id);
              if (!dueDecks.length) return;
              const [first, ...rest] = dueDecks;
              navigate(
                `/flash/study/${first}?due=1${rest.length ? `&chain=${rest.join(",")}` : ""}`,
              );
            }}
          >
            ทบทวนทั้งหมด
          </Button>
        </Card>
      )}

      {!contentLoaded && decks.length === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-28 animate-pulse bg-surface-2" />
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {decks.map((d) => {
          const official = d.official || d.visibility === "public";
          const deckDue = dueCount(srs[d.id]);
          return (
            <Card key={d.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Tag tone={official ? "success" : "info"}>
                    {d.official ? "ชุดทางการ" : d.visibility === "public" ? "สาธารณะ" : "ส่วนตัว"}
                  </Tag>
                  <h3 className="mt-2 truncate text-base font-semibold">{d.name}</h3>
                  <p className="text-sm text-muted">
                    {d.words.length} คำ · สร้างโดย @{d.creator}
                  </p>
                  {(d.exam || d.level) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {d.exam && <Tag tone="neutral">{examLabel(d.exam)}</Tag>}
                      {d.level && <Tag tone="neutral">{levelLabel(d.level)}</Tag>}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <LinkButton variant="primary" size="sm" to={`/flash/deck/${d.id}`}>
                  เปิดชุด
                </LinkButton>
                {deckDue > 0 && (
                  <LinkButton variant="success" size="sm" to={`/flash/study/${d.id}?due=1`}>
                    ทบทวน {deckDue} คำ
                  </LinkButton>
                )}
                {!d.official && (
                  <div className="ml-auto flex gap-1">
                    <button
                      type="button"
                      aria-label="แก้ไขชุด"
                      title="แก้ไข"
                      onClick={() => setEditor({ open: true, id: d.id })}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-surface-2 hover:text-text"
                    >
                      <IconEdit size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="ลบชุด"
                      title="ลบ"
                      onClick={() => setDel(d.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-danger-soft hover:text-danger"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {editor.open && (
        <DeckEditor deckId={editor.id} onClose={() => setEditor({ open: false, id: null })} />
      )}
      <DeleteDialog
        open={del !== null}
        onClose={() => setDel(null)}
        onConfirm={() => {
          if (del) deleteContent("deck", del);
          setDel(null);
        }}
      />
      {importing && (
        <BulkImport kind="vocab" onClose={() => setImporting(false)} onDone={() => {}} />
      )}
    </>
  );
}
