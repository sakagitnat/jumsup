import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface UpgradeModalState {
  open: boolean;
  title: string;
  message: string;
}

type Listener = (s: UpgradeModalState) => void;

let state: UpgradeModalState = { open: false, title: "", message: "" };
const listeners = new Set<Listener>();

function emit() {
  for (const fn of listeners) fn(state);
}

/** Upgrade prompt shown when a Free-tier limit is hit — a modal comparing Free vs Pro,
 *  in place of a plain toast so the user sees exactly what upgrading unlocks. */
export function openUpgradeModal(title: string, message: string) {
  state = { open: true, title, message };
  emit();
}

function close() {
  state = { ...state, open: false };
  emit();
}

const rows: [string, string, string][] = [
  ["สร้างชุดคำศัพท์เอง", "2 ชุด", "ไม่จำกัด"],
  ["คำต่อชุด (Flashcard)", "100 คำ", "1,000 คำ"],
  ["เก็บชุดจาก Community", "5 ชุด", "ไม่จำกัด"],
  ["Match ต่อวัน", "5 รอบ", "ไม่จำกัด"],
  ["Crossword ต่อวัน", "2 รอบ", "ไม่จำกัด"],
  ["Reading / Listening / Writing", "1 ชุด/วัน · ≤10 ข้อ", "ไม่จำกัด ทุกขนาด"],
  ["Mock Exam", "1 ชุดทุก 7 วัน · ≤30 ข้อ", "ไม่จำกัด ทุกขนาด"],
  ["แปลคำศัพท์ต่อวัน", "10 คำ", "100 คำ"],
  ["สถิติจุดอ่อนแบบละเอียด", "—", "✅"],
];

export function UpgradeModalHost() {
  const [s, setS] = useState(state);
  const navigate = useNavigate();

  useEffect(() => {
    const fn: Listener = (next) => setS(next);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  return (
    <Modal
      open={s.open}
      onClose={close}
      title={s.title || "อัปเกรดเป็น Pro"}
      size="md"
      footer={
        <>
          <Button onClick={close}>ปิด</Button>
          <Button
            variant="primary"
            onClick={() => {
              close();
              navigate("/pricing");
            }}
          >
            ดู Jumsup Pro
          </Button>
        </>
      }
    >
      {s.message && <p className="mb-3 text-sm text-muted">{s.message}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2 pr-2 font-medium">รายการ</th>
              <th className="py-2 pr-2 font-medium">Free</th>
              <th className="py-2 font-medium">Pro</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, free, pro]) => (
              <tr key={label} className="border-b border-line last:border-0">
                <td className="py-2 pr-2 text-muted">{label}</td>
                <td className="py-2 pr-2">{free}</td>
                <td className="py-2 font-medium text-success">{pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
