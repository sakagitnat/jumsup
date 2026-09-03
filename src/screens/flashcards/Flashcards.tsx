import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { startGameSession, type Game } from "../../actions/games";
import { deleteContent } from "../../actions/content";
import { DeckEditor } from "./DeckEditor";
import { DeleteDialog } from "../common/DeleteDialog";
import { BulkImport } from "../import/BulkImport";
import { PageHeader, Card, Tag, Button, LinkButton, IconEdit, IconTrash } from "../../ui";
import { examLabel, levelLabel } from "../../lib/taxonomy";
import { dueCount } from "../../lib/srs";

type Mode = "flash" | Game;

const modeLabel: Record<Mode, string> = {
  flash: "Flashcards",
  match: "Match",
  crossword: "Crossword",
};
const headMeta: Record<Mode, { title: string; desc: string }> = {
  flash: { title: "เลือกชุดคำศัพท์", desc: "เลือกชุดก่อนเริ่มฝึก แก้ไข ลบ และกำหนดการมองเห็นได้" },
  match: { title: "Match", desc: "จับคู่คำศัพท์กับความหมาย — ต้องจำศัพท์ในชุดนั้นอย่างน้อย 4 คำ" },
  crossword: { title: "Crossword", desc: "เติมคำไขว้จากคำที่จำแล้ว — ต้องจำอย่างน้อย 3 คำ" },
};

export function Flashcards({ mode = "flash" }: { mode?: Mode }) {
  const decks = useStore((s) => s.decks);
  const srs = useStore((s) => s.srs);
  const navigate = useNavigate();
  const totalDue = decks.reduce((n, d) => n + dueCount(srs[d.id]), 0);
  const [editor, setEditor] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [del, setDel] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const start = async (deckId: string) => {
    if (mode === "flash") {
      navigate(`/flash/study/${deckId}`);
      return;
    }
    if (await startGameSession(mode, deckId)) navigate(`/${mode}/play/${deckId}`);
  };

  return (
    <>
      <PageHeader
        eyebrow="VOCABULARY"
        title={headMeta[mode].title}
        description={headMeta[mode].desc}
        actions={
          <>
            <Button variant="primary" onClick={() => setEditor({ open: true, id: null })}>
              + สร้างชุดใหม่
            </Button>
            <Button onClick={() => setImporting(true)}>นำเข้าหลายคำ</Button>
          </>
        }
      />

      {mode === "flash" && totalDue > 0 && (
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
                {mode === "flash" ? (
                  <>
                    <LinkButton variant="primary" size="sm" to={`/flash/study/${d.id}`}>
                      เริ่ม Flashcards
                    </LinkButton>
                    {deckDue > 0 && (
                      <LinkButton
                        variant="success"
                        size="sm"
                        to={`/flash/study/${d.id}?due=1`}
                      >
                        ทบทวน {deckDue} คำ
                      </LinkButton>
                    )}
                  </>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => start(d.id)}>
                    เริ่ม {modeLabel[mode]}
                  </Button>
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
