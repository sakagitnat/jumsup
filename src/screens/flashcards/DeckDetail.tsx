import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { masteredWords, startGameSession } from "../../actions/games";
import { deleteContent } from "../../actions/content";
import { DeckEditor } from "./DeckEditor";
import { DeleteDialog } from "../common/DeleteDialog";
import { dueCount } from "../../lib/srs";
import {
  PageHeader,
  Card,
  Tag,
  Button,
  LinkButton,
  EmptyState,
  IconEdit,
  IconTrash,
  IconArrowLeft,
  IconFlashcard,
  IconMatch,
  IconCrossword,
} from "../../ui";
import { examLabel, levelLabel } from "../../lib/taxonomy";

const MIN_WORDS = { match: 4, crossword: 3 } as const;

export function DeckDetail() {
  const { deckId = "" } = useParams();
  const navigate = useNavigate();
  const deck = useStore((s) => s.decks.find((d) => d.id === deckId));
  const contentLoaded = useStore((s) => s.contentLoaded);
  const srs = useStore((s) => s.srs);
  const [editing, setEditing] = useState(false);
  const [del, setDel] = useState(false);

  if (!deck) {
    if (!contentLoaded) {
      return (
        <>
          <PageHeader eyebrow="VOCABULARY" title="กำลังโหลด…" />
          <div className="h-40 animate-pulse rounded-3xl bg-surface-2" />
        </>
      );
    }
    return (
      <>
        <PageHeader eyebrow="VOCABULARY" title="ไม่พบชุดคำศัพท์นี้" />
        <EmptyState>
          <Button variant="primary" onClick={() => navigate("/flash")}>
            กลับไปที่ชุดคำศัพท์ของฉัน
          </Button>
        </EmptyState>
      </>
    );
  }

  const official = deck.official || deck.visibility === "public";
  const due = dueCount(srs[deck.id]);
  const mastered = masteredWords(deck.id).length;

  const playGame = async (game: "match" | "crossword") => {
    if (await startGameSession(game, deck.id)) navigate(`/${game}/play/${deck.id}`);
  };

  const modes: Array<{
    key: string;
    icon: typeof IconFlashcard;
    label: string;
    desc: string;
    onStart: () => void;
    locked?: string;
  }> = [
    {
      key: "flash",
      icon: IconFlashcard,
      label: "Flashcards",
      desc: "วนดูคำทีละใบตามรอบทบทวน",
      onStart: () => navigate(`/flash/study/${deck.id}`),
    },
    {
      key: "match",
      icon: IconMatch,
      label: "Match",
      desc: "จับคู่คำศัพท์กับความหมายแข่งเวลา",
      onStart: () => void playGame("match"),
      locked:
        mastered < MIN_WORDS.match
          ? `จำคำศัพท์ในชุดนี้ให้ครบ ${MIN_WORDS.match} คำก่อน (ตอนนี้จำได้ ${mastered} คำ)`
          : undefined,
    },
    {
      key: "crossword",
      icon: IconCrossword,
      label: "Crossword",
      desc: "เติมคำไขว้จากคำที่จำแล้ว",
      onStart: () => void playGame("crossword"),
      locked:
        mastered < MIN_WORDS.crossword
          ? `จำคำศัพท์ในชุดนี้ให้ครบ ${MIN_WORDS.crossword} คำก่อน (ตอนนี้จำได้ ${mastered} คำ)`
          : undefined,
    },
  ];

  return (
    <>
      <Button variant="ghost" className="mb-3" onClick={() => navigate("/flash")}>
        <IconArrowLeft size={15} className="mr-1.5 inline align-[-2px]" />
        กลับไปที่ชุดคำศัพท์ของฉัน
      </Button>

      <PageHeader
        eyebrow="VOCABULARY"
        title={deck.name}
        description={`${deck.words.length} คำ · สร้างโดย @${deck.creator}`}
        actions={
          !official && (
            <>
              <Button onClick={() => setEditing(true)}>
                <IconEdit size={15} className="mr-1.5 inline align-[-2px]" />
                แก้ไข
              </Button>
              <Button onClick={() => setDel(true)}>
                <IconTrash size={15} className="mr-1.5 inline align-[-2px]" />
                ลบ
              </Button>
            </>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tag tone={official ? "success" : "info"}>
          {deck.official ? "ชุดทางการ" : deck.visibility === "public" ? "สาธารณะ" : "ส่วนตัว"}
        </Tag>
        {deck.exam && <Tag tone="neutral">{examLabel(deck.exam)}</Tag>}
        {deck.level && <Tag tone="neutral">{levelLabel(deck.level)}</Tag>}
      </div>

      {due > 0 && (
        <Card soft className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <b className="text-sm">ครบกำหนดทบทวน {due} คำ</b>
            <p className="text-xs text-muted">ทบทวนตามรอบช่วยให้จำได้นานขึ้น</p>
          </div>
          <LinkButton variant="success" size="sm" to={`/flash/study/${deck.id}?due=1`}>
            ทบทวนเลย
          </LinkButton>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {modes.map((m) => (
          <Card key={m.key} className="flex flex-col">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <m.icon size={20} />
            </span>
            <h3 className="mt-3 text-base font-semibold">{m.label}</h3>
            <p className="mt-1 flex-1 text-sm text-muted">{m.desc}</p>
            {m.locked ? (
              <p className="mt-3 text-xs text-subtle">{m.locked}</p>
            ) : (
              <Button variant="primary" size="sm" className="mt-3" onClick={m.onStart}>
                เริ่ม {m.label}
              </Button>
            )}
          </Card>
        ))}
      </div>

      {editing && <DeckEditor deckId={deck.id} onClose={() => setEditing(false)} />}
      <DeleteDialog
        open={del}
        onClose={() => setDel(false)}
        onConfirm={() => {
          deleteContent("deck", deck.id);
          setDel(false);
          navigate("/flash");
        }}
      />
    </>
  );
}
