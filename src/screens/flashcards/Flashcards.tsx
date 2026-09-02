import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { startGameSession, type Game } from "../../actions/games";
import { deleteContent } from "../../actions/content";
import { DeckEditor } from "./DeckEditor";
import { DeleteDialog } from "../common/DeleteDialog";
import { BulkImport } from "../import/BulkImport";
import { PageHeader, Card, Tag, Button, LinkButton } from "../../ui";

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
  const navigate = useNavigate();
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

      <div className="grid gap-4 sm:grid-cols-2">
        {decks.map((d) => {
          const official = d.official || d.visibility === "public";
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
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {mode === "flash" ? (
                  <LinkButton variant="primary" size="sm" to={`/flash/study/${d.id}`}>
                    เริ่ม Flashcards
                  </LinkButton>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => start(d.id)}>
                    เริ่ม {modeLabel[mode]}
                  </Button>
                )}
                {!d.official && (
                  <>
                    <Button size="sm" onClick={() => setEditor({ open: true, id: d.id })}>
                      แก้ไข
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDel(d.id)}>
                      ลบ
                    </Button>
                  </>
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
