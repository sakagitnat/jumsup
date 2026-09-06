import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { startPracticeSession } from "../../actions/practice";
import { deleteContent } from "../../actions/content";
import { PracticeEditor } from "./PracticeEditor";
import { DeleteDialog } from "../common/DeleteDialog";
import { BulkImport } from "../import/BulkImport";
import { PageHeader, Card, Tag, Button, EmptyState, IconEdit, IconTrash } from "../../ui";
import { EXAMS, examLabel, levelLabel } from "../../lib/taxonomy";
import type { PracticeKind } from "./session";
import type { PracticeSet } from "../../store/types";

const titles: Record<PracticeKind, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  mock: "Mock Exam",
};

export function PracticeList({ kind }: { kind: PracticeKind }) {
  const navigate = useNavigate();
  const all = useStore((s) => (kind === "mock" ? s.mocks : s[kind])) as PracticeSet[];
  const contentLoaded = useStore((s) => s.contentLoaded);
  const [examFilter, setExamFilter] = useState("");
  const list = examFilter ? all.filter((x) => x.exam === examFilter) : all;
  const [editor, setEditor] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [del, setDel] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const start = async (id: string) => {
    if (await startPracticeSession(kind, id)) navigate(`/${kind}/play/${id}`);
  };

  return (
    <>
      <PageHeader
        eyebrow="PRACTICE"
        title={`${titles[kind]} ของฉัน`}
        description="ชุดที่คุณสร้างหรือนำเข้ามา — หาชุดทางการและชุดอื่นๆ เพิ่มเติมได้ที่ Community"
        actions={
          <>
            <Button variant="primary" onClick={() => setEditor({ open: true, id: null })}>
              + สร้างชุดใหม่
            </Button>
            <Button onClick={() => setImporting(true)}>นำเข้าจาก CSV</Button>
            <Button onClick={() => navigate("/community")}>ค้นหาใน Community</Button>
          </>
        }
      />

      {all.length > 0 && (
        <div className="mb-3">
          <select
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          >
            <option value="">ทุกข้อสอบ</option>
            {EXAMS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {list.length === 0 && !contentLoaded && (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-24 animate-pulse bg-surface-2" />
            ))}
          </div>
        )}
        {list.length === 0 && contentLoaded && (
          <EmptyState>ยังไม่มีชุดฝึกในหมวดนี้</EmptyState>
        )}
        {list.map((x) => {
          const official = x.official;
          const count = typeof x.questions === "number" ? x.questions : x.itemCount;
          return (
            <Card key={x.id} className="flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <Tag tone={official || x.visibility === "public" ? "success" : "info"}>
                  {official ? "ชุดทางการ" : x.visibility === "public" ? "สาธารณะ" : "ส่วนตัว"}
                </Tag>
                <span className="text-xs text-subtle">
                  {examLabel(x.exam) || titles[kind]}
                </span>
              </div>
              <h3 className="mt-2 text-base font-semibold">{x.title}</h3>
              <p className="text-sm text-muted">
                สร้างโดย @{x.creator || "Jumsup"}
                {x.minutes ? ` · ${x.minutes} นาที` : ""}
                {count ? ` · ${count} ข้อ` : ""}
              </p>
              {(x.exam || x.level) && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {x.exam && <Tag tone="neutral">{examLabel(x.exam)}</Tag>}
                  {x.level && <Tag tone="neutral">{levelLabel(x.level)}</Tag>}
                </div>
              )}
              <div className="mt-4 flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={() => start(x.id)}>
                  เริ่มฝึก
                </Button>
                {!official && (
                  <div className="ml-auto flex gap-1">
                    <button
                      type="button"
                      aria-label="แก้ไขชุด"
                      title="แก้ไข"
                      onClick={() => setEditor({ open: true, id: x.id })}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-surface-2 hover:text-text"
                    >
                      <IconEdit size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="ลบชุด"
                      title="ลบ"
                      onClick={() => setDel(x.id)}
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
        <PracticeEditor
          kind={kind}
          id={editor.id}
          onClose={() => setEditor({ open: false, id: null })}
        />
      )}
      <DeleteDialog
        open={del !== null}
        onClose={() => setDel(null)}
        onConfirm={() => {
          if (del) deleteContent(kind, del);
          setDel(null);
        }}
      />
      {importing && (
        <BulkImport kind={kind} onClose={() => setImporting(false)} onDone={() => {}} />
      )}
    </>
  );
}
