import { useState } from "react";
import { useStore } from "../../store/useStore";
import { persistPractice, needsPublicUpgrade } from "../../actions/content";
import { Modal, Button, toast } from "../../ui";
import type { PracticeKind } from "./session";
import type { PracticeSection, Question } from "../../store/types";

const contentLabel: Record<PracticeKind, string> = {
  reading: "บทความ",
  listening: "บทสนทนา / Transcript",
  writing: "Passage / คำสั่ง",
  mock: "เนื้อหาประกอบ",
};

function emptyQuestion(): Question {
  return { prompt: "", choices: ["", "", "", ""], answer: 0, explanation: "" };
}
function emptySection(): PracticeSection {
  return { title: "", text: "", questions: [emptyQuestion()] };
}

function sectionContent(s: PracticeSection): string {
  return s.text || s.script || s.passage || s.context || "";
}
function withContent(kind: PracticeKind, s: PracticeSection, value: string): PracticeSection {
  return {
    ...s,
    text: kind === "reading" ? value : undefined,
    script: kind === "listening" ? value : undefined,
    passage: kind === "writing" ? value : undefined,
    context: kind === "mock" ? value : undefined,
  };
}

export function PracticeEditor({
  kind,
  id,
  onClose,
}: {
  kind: PracticeKind;
  id: string | null;
  onClose: () => void;
}) {
  const existing = useStore((s) =>
    id ? (kind === "mock" ? s.mocks : s[kind]).find((x) => x.id === id) : undefined,
  );

  const [title, setTitle] = useState(existing?.title ?? "");
  const [visibility, setVisibility] = useState<"private" | "public">(
    existing?.visibility === "public" ? "public" : "private",
  );
  const [minutes, setMinutes] = useState(Number(existing?.minutes || 10));
  const [category, setCategory] = useState(existing?.category || existing?.type || "");
  const [sections, setSections] = useState<PracticeSection[]>(
    existing?.sections?.length
      ? existing.sections.map((s) => ({ ...s, questions: (s.questions ?? []).map((q) => ({ ...q })) }))
      : [emptySection()],
  );
  const [confirmPublic, setConfirmPublic] = useState(false);
  const [busy, setBusy] = useState(false);

  const patchSection = (si: number, patch: Partial<PracticeSection>) =>
    setSections((prev) => prev.map((s, j) => (j === si ? { ...s, ...patch } : s)));
  const patchQuestion = (si: number, qi: number, patch: Partial<Question>) =>
    setSections((prev) =>
      prev.map((s, j) =>
        j === si
          ? { ...s, questions: (s.questions ?? []).map((q, k) => (k === qi ? { ...q, ...patch } : q)) }
          : s,
      ),
    );

  const save = async (asPublic: boolean) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return toast("กรุณาตั้งชื่อชุดฝึก");
    const normalized = sections.map((s) => ({
      ...s,
      title: (s.title ?? "").trim(),
      questions: (s.questions ?? []).map((q) => ({
        ...q,
        prompt: (q.prompt ?? "").trim(),
        choices: (q.choices ?? []).map((c) => c.trim()),
      })),
    }));
    if (!normalized.length) return toast("กรุณาเพิ่มอย่างน้อย 1 Section");
    if (
      normalized.some((s) =>
        (s.questions ?? []).some((q) => !q.prompt || (q.choices ?? []).filter(Boolean).length < 2),
      )
    )
      return toast("กรุณากรอกโจทย์และตัวเลือกอย่างน้อย 2 ตัวเลือกให้ครบ");

    if (!asPublic && visibility === "private" && needsPublicUpgrade(kind, id)) {
      setConfirmPublic(true);
      return;
    }

    setBusy(true);
    try {
      await persistPractice(
        { id, kind, title: cleanTitle, visibility, minutes, category: category.trim(), sections: normalized },
        asPublic,
      );
      onClose();
    } catch (e) {
      toast((e as Error).message || "บันทึกชุดฝึกไม่สำเร็จ");
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
        title={id ? `แก้ไข ${kind}` : `สร้าง ${kind}`}
        footer={
          <>
            <Button onClick={onClose}>ยกเลิก</Button>
            <Button variant="primary" disabled={busy} onClick={() => save(false)}>
              บันทึกชุดฝึก
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            ชื่อชุด
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
          <label className="block text-sm font-semibold">
            เวลารวม (นาที)
            <input
              type="number"
              min={1}
              max={240}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            หมวด/ประเภท (ไม่บังคับ)
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-normal"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">เนื้อหาและคำถาม</h3>
          <Button size="sm" onClick={() => setSections((s) => [...s, emptySection()])}>
            + เพิ่ม Section
          </Button>
        </div>

        <div className="mt-2 space-y-4">
          {sections.map((section, si) => (
            <div key={si} className="rounded-xl border border-line p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-subtle">SECTION {si + 1}</span>
                <button
                  type="button"
                  className="text-xs text-danger"
                  onClick={() =>
                    setSections((s) => (s.length > 1 ? s.filter((_, j) => j !== si) : s))
                  }
                >
                  ลบ Section
                </button>
              </div>
              <input
                value={section.title ?? ""}
                onChange={(e) => patchSection(si, { title: e.target.value })}
                placeholder="ชื่อ Section"
                className="mb-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              />
              <label className="block text-xs font-semibold text-muted">
                {contentLabel[kind]}
                <textarea
                  rows={4}
                  value={sectionContent(section)}
                  onChange={(e) =>
                    setSections((prev) =>
                      prev.map((s, j) => (j === si ? withContent(kind, s, e.target.value) : s)),
                    )
                  }
                  placeholder="วางเนื้อหาของ Section นี้"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-normal"
                />
              </label>

              <div className="mt-3 space-y-3">
                {(section.questions ?? []).map((q, qi) => (
                  <div key={qi} className="rounded-lg border border-line bg-surface-2 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <b className="text-xs">คำถาม {qi + 1}</b>
                      <button
                        type="button"
                        className="text-xs text-danger"
                        onClick={() =>
                          patchSection(si, {
                            questions: (section.questions ?? []).filter((_, k) => k !== qi),
                          })
                        }
                      >
                        ลบ
                      </button>
                    </div>
                    <input
                      value={q.prompt ?? ""}
                      onChange={(e) => patchQuestion(si, qi, { prompt: e.target.value })}
                      placeholder="พิมพ์คำถาม"
                      className="mb-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[0, 1, 2, 3].map((ci) => (
                        <input
                          key={ci}
                          value={q.choices?.[ci] ?? ""}
                          onChange={(e) => {
                            const choices = [...(q.choices ?? ["", "", "", ""])];
                            choices[ci] = e.target.value;
                            patchQuestion(si, qi, { choices });
                          }}
                          placeholder={`ตัวเลือก ${"ABCD"[ci]}`}
                          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                        />
                      ))}
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-muted">
                        คำตอบที่ถูก
                        <select
                          value={q.answer ?? 0}
                          onChange={(e) => patchQuestion(si, qi, { answer: Number(e.target.value) })}
                          className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-normal"
                        >
                          {[0, 1, 2, 3].map((ci) => (
                            <option key={ci} value={ci}>
                              {"ABCD"[ci]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-muted">
                        คำอธิบายคำตอบ (ไม่บังคับ)
                        <input
                          value={q.explanation ?? ""}
                          onChange={(e) => patchQuestion(si, qi, { explanation: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-normal"
                        />
                      </label>
                    </div>
                  </div>
                ))}
                <Button
                  size="sm"
                  onClick={() =>
                    patchSection(si, { questions: [...(section.questions ?? []), emptyQuestion()] })
                  }
                >
                  + เพิ่มคำถาม
                </Button>
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
          Free เก็บ {kind} ส่วนตัวได้ 1 ชุด ชุดนี้จะเป็น Public เฉพาะเมื่อคุณกดยืนยันเผยแพร่
        </p>
      </Modal>
    </>
  );
}
