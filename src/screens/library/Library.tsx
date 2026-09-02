import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { deleteContent } from "../../actions/content";
import { DeckEditor } from "../flashcards/DeckEditor";
import { PracticeEditor } from "../practice/PracticeEditor";
import { DeleteDialog } from "../common/DeleteDialog";
import { BulkImport } from "../import/BulkImport";
import { PageHeader, Card, Button, LinkButton, EmptyState, Modal, toast } from "../../ui";
import { examLabel, levelLabel } from "../../lib/taxonomy";
import type { PracticeKind } from "../practice/session";

const tagStr = (exam?: string, level?: string) =>
  [examLabel(exam), levelLabel(level)].filter(Boolean).join(" · ");

type DeckDialog = { open: boolean; id: string | null };
type PracticeDialog = { open: boolean; kind: PracticeKind; id: string | null };
type Del = { type: "deck" | PracticeKind; id: string } | null;

const kindTitle: Record<PracticeKind, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  mock: "Mock Exam",
};

function Row({
  title,
  meta,
  onOpen,
  onEdit,
  onDelete,
  onShare,
}: {
  title: string;
  meta: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <b className="block truncate text-sm">{title}</b>
        <small className="text-xs text-muted">{meta}</small>
      </button>
      {onShare && (
        <button
          type="button"
          aria-label="แชร์"
          title="คัดลอกลิงก์แชร์"
          onClick={onShare}
          className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-surface-2 hover:text-text"
        >
          ⤴
        </button>
      )}
      <button
        type="button"
        aria-label="แก้ไข"
        title="แก้ไข"
        onClick={onEdit}
        className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-surface-2 hover:text-text"
      >
        ✎
      </button>
      <button
        type="button"
        aria-label="ลบ"
        title="ลบ"
        onClick={onDelete}
        className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-danger-soft hover:text-danger"
      >
        🗑
      </button>
    </div>
  );
}

export function Library() {
  const navigate = useNavigate();
  const decks = useStore((s) => s.decks.filter((d) => !d.official));
  const reading = useStore((s) => s.reading.filter((x) => !x.official));
  const listening = useStore((s) => s.listening.filter((x) => !x.official));
  const writing = useStore((s) => s.writing.filter((x) => !x.official));
  const mocks = useStore((s) => s.mocks.filter((x) => !x.official));

  const practiceGroups: Array<[PracticeKind, typeof reading]> = [
    ["reading", reading],
    ["listening", listening],
    ["writing", writing],
    ["mock", mocks],
  ];
  const totalPractice = reading.length + listening.length + writing.length + mocks.length;

  const [deckDialog, setDeckDialog] = useState<DeckDialog>({ open: false, id: null });
  const [practiceDialog, setPracticeDialog] = useState<PracticeDialog>({
    open: false,
    kind: "reading",
    id: null,
  });
  const [del, setDel] = useState<Del>(null);
  const [importing, setImporting] = useState<null | "vocab" | PracticeKind>(null);
  const [pickKind, setPickKind] = useState(false);

  const empty = decks.length === 0 && totalPractice === 0;

  return (
    <>
      <PageHeader
        eyebrow="LIBRARY"
        title="คลังของฉัน"
        description="ชุดคำศัพท์และชุดฝึกทั้งหมดที่คุณสร้างหรือนำเข้า อยู่ที่เดียว"
        actions={
          <>
            <Button variant="primary" onClick={() => setDeckDialog({ open: true, id: null })}>
              + ชุดคำศัพท์
            </Button>
            <Button onClick={() => setPickKind(true)}>+ ชุดฝึกทักษะ</Button>
          </>
        }
      />

      {empty && (
        <EmptyState>
          ยังไม่มีชุดของคุณเอง — สร้างชุดใหม่ นำเข้าจาก CSV หรือหาชุดจาก{" "}
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => navigate("/community")}
          >
            Community
          </button>
        </EmptyState>
      )}

      {decks.length > 0 && (
        <Card className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-base font-semibold">คำศัพท์ ({decks.length})</h2>
            <Button size="sm" onClick={() => setImporting("vocab")}>
              นำเข้า CSV
            </Button>
          </div>
          {decks.map((d) => (
            <Row
              key={d.id}
              title={d.name}
              meta={`${d.words.length} คำ · ${
                d.visibility === "public" ? "สาธารณะ" : "ส่วนตัว"
              }${tagStr(d.exam, d.level) ? ` · ${tagStr(d.exam, d.level)}` : ""}`}
              onOpen={() => navigate(`/flash/study/${d.id}`)}
              onEdit={() => setDeckDialog({ open: true, id: d.id })}
              onDelete={() => setDel({ type: "deck", id: d.id })}
              onShare={
                d.visibility === "public"
                  ? () => {
                      navigator.clipboard?.writeText(`${window.location.origin}/s/vocab/${d.id}`);
                      toast("คัดลอกลิงก์แชร์แล้ว");
                    }
                  : undefined
              }
            />
          ))}
        </Card>
      )}

      {practiceGroups.map(([kind, items]) =>
        items.length === 0 ? null : (
          <Card key={kind} className="mb-4">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {kindTitle[kind]} ({items.length})
              </h2>
              <Button size="sm" onClick={() => setImporting(kind)}>
                นำเข้า CSV
              </Button>
            </div>
            {items.map((x) => (
              <Row
                key={x.id}
                title={x.title}
                meta={`${x.itemCount || 0} ข้อ · ${x.minutes || 0} นาที · ${
                  x.visibility === "public" ? "สาธารณะ" : "ส่วนตัว"
                }${tagStr(x.exam, x.level) ? ` · ${tagStr(x.exam, x.level)}` : ""}`}
                onOpen={() => navigate(`/${kind}`)}
                onEdit={() => setPracticeDialog({ open: true, kind, id: x.id })}
                onDelete={() => setDel({ type: kind, id: x.id })}
                onShare={
                  x.visibility === "public"
                    ? () => {
                        navigator.clipboard?.writeText(
                          `${window.location.origin}/s/${kind}/${x.id}`,
                        );
                        toast("คัดลอกลิงก์แชร์แล้ว");
                      }
                    : undefined
                }
              />
            ))}
          </Card>
        ),
      )}

      {!empty && (
        <div className="mt-2">
          <LinkButton to="/community" variant="secondary">
            หาชุดเพิ่มจาก Community
          </LinkButton>
        </div>
      )}

      <Modal
        open={pickKind}
        onClose={() => setPickKind(false)}
        title="เลือกประเภทชุดฝึก"
        footer={<Button onClick={() => setPickKind(false)}>ยกเลิก</Button>}
      >
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(kindTitle) as PracticeKind[]).map((k) => (
            <Button
              key={k}
              onClick={() => {
                setPickKind(false);
                setPracticeDialog({ open: true, kind: k, id: null });
              }}
            >
              {kindTitle[k]}
            </Button>
          ))}
        </div>
      </Modal>

      {deckDialog.open && (
        <DeckEditor
          deckId={deckDialog.id}
          onClose={() => setDeckDialog({ open: false, id: null })}
        />
      )}
      {practiceDialog.open && (
        <PracticeEditor
          kind={practiceDialog.kind}
          id={practiceDialog.id}
          onClose={() => setPracticeDialog({ open: false, kind: "reading", id: null })}
        />
      )}
      <DeleteDialog
        open={del !== null}
        onClose={() => setDel(null)}
        onConfirm={() => {
          if (del) deleteContent(del.type, del.id);
          setDel(null);
        }}
      />
      {importing && (
        <BulkImport kind={importing} onClose={() => setImporting(null)} onDone={() => {}} />
      )}
    </>
  );
}
