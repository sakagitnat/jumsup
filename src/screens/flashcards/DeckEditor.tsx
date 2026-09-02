import { useState } from "react";
import { useStore } from "../../store/useStore";
import {
  persistDeck,
  canAddPrivateDeck,
  needsPublicUpgrade,
  deckWordLimit,
} from "../../actions/content";
import { Modal, Button, toast, proPopup } from "../../ui";
import type { Word } from "../../store/types";

const emptyRow = (): Word => ({ w: "", p: "", m: "", e: "" });

export function DeckEditor({
  deckId,
  onClose,
}: {
  deckId: string | null;
  onClose: () => void;
}) {
  const deck = useStore((s) => (deckId ? s.decks.find((d) => d.id === deckId) : undefined));
  const [name, setName] = useState(deck?.name ?? "");
  const [visibility, setVisibility] = useState<"private" | "public">(
    deck?.visibility === "public" ? "public" : "private",
  );
  const [rows, setRows] = useState<Word[]>(
    deck?.words?.length ? deck.words.map((w) => ({ ...w })) : [emptyRow()],
  );
  const [confirmPublic, setConfirmPublic] = useState(false);
  const [busy, setBusy] = useState(false);

  const setRow = (i: number, patch: Partial<Word>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async (asPublic: boolean) => {
    const cleanName = name.trim();
    if (!cleanName) return toast("กรุณาตั้งชื่อชุด");
    const words = rows
      .map((r) => ({
        w: r.w.trim(),
        p: (r.p ?? "").trim(),
        m: (r.m ?? "").trim(),
        e: (r.e ?? "").trim(),
      }))
      .filter((r) => r.w || r.m || r.p || r.e);
    if (!words.length || words.some((w) => !w.w))
      return toast("กรุณากรอกคำศัพท์ให้ครบทุกรายการ");
    if (!canAddPrivateDeck(deckId))
      return proPopup(
        "สร้าง Flashcard ครบ 3 ชุดแล้ว",
        "Free สร้างชุดของตัวเองได้สูงสุด 3 ชุด อัปเกรดเป็น Pro เพื่อสร้างได้ไม่จำกัด",
      );
    const limit = deckWordLimit();
    if (words.length > limit)
      return proPopup(
        "คำศัพท์เกินจำนวนที่แพ็กเกจรองรับ",
        `แพ็กเกจปัจจุบันบันทึกได้สูงสุด ${limit.toLocaleString()} คำต่อชุด`,
      );

    if (!asPublic && visibility === "private" && needsPublicUpgrade("vocab", deckId)) {
      setConfirmPublic(true);
      return;
    }

    setBusy(true);
    try {
      await persistDeck({ id: deckId, name: cleanName, visibility, words }, asPublic);
      onClose();
    } catch (e) {
      toast((e as Error).message || "บันทึกชุดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        open={!confirmPublic}
        onClose={onClose}
        size="lg"
        title={deckId ? "แก้ไขชุดคำศัพท์" : "สร้างชุดคำศัพท์"}
        footer={
          <>
            <Button onClick={onClose}>ยกเลิก</Button>
            <Button variant="primary" disabled={busy} onClick={() => save(false)}>
              บันทึกชุด
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            ชื่อชุด
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น คำศัพท์ A-Level บทที่ 1"
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            การมองเห็น
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "private" | "public")}
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-normal"
            >
              <option value="private">ส่วนตัว</option>
              <option value="public">สาธารณะ</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">คำศัพท์ในชุด</h3>
          <Button size="sm" onClick={() => setRows((r) => [...r, emptyRow()])}>
            + เพิ่มคำศัพท์
          </Button>
        </div>

        <div className="mt-2 space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="rounded-xl border border-line p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-subtle">{i + 1}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-text"
                    onClick={() => setRows((r) => [...r.slice(0, i + 1), { ...row }, ...r.slice(i + 1)])}
                  >
                    ทำสำเนา
                  </button>
                  <button
                    type="button"
                    className="text-xs text-danger"
                    onClick={() =>
                      setRows((r) => (r.length > 1 ? r.filter((_, j) => j !== i) : [emptyRow()]))
                    }
                  >
                    ลบ
                  </button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={row.w}
                  onChange={(e) => setRow(i, { w: e.target.value })}
                  placeholder="คำหรือวลี เช่น analyze"
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                />
                <input
                  value={row.p ?? ""}
                  onChange={(e) => setRow(i, { p: e.target.value })}
                  placeholder="คำอ่าน / การเน้นเสียง (ไม่บังคับ)"
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                />
                <input
                  value={row.m ?? ""}
                  onChange={(e) => setRow(i, { m: e.target.value })}
                  placeholder="ความหมาย เช่น วิเคราะห์"
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                />
                <input
                  value={row.e ?? ""}
                  onChange={(e) => setRow(i, { e: e.target.value })}
                  placeholder="ประโยคตัวอย่าง (ไม่บังคับ)"
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={confirmPublic}
        onClose={() => setConfirmPublic(false)}
        title="โควตาชุดส่วนตัวเต็ม"
        footer={
          <>
            <Button onClick={() => setConfirmPublic(false)}>ยกเลิก</Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => {
                setConfirmPublic(false);
                save(true);
              }}
            >
              ยืนยันเผยแพร่
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Free เก็บ Flashcard ส่วนตัวได้ 3 ชุด ชุดนี้จะเป็น Public เฉพาะเมื่อคุณกดยืนยันเผยแพร่
        </p>
      </Modal>
    </>
  );
}
