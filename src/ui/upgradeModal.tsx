import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Tag } from "./Tag";
import { IconBolt, IconCheck } from "./icons";
import { cx } from "./cx";
import { PLANS, money } from "../lib/plans.js";

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
  ["Reading / Listening / Writing", "1 ชุด/วัน · ≤10 ข้อ", "ไม่จำกัด ทุกข้อ"],
  ["Mock Exam", "1 ชุดทุก 7 วัน · ≤30 ข้อ", "ไม่จำกัด ทุกข้อ"],
  ["แปลคำศัพท์ต่อวัน", "10 คำ", "100 คำ"],
  ["สถิติจุดอ่อนแบบละเอียด", "—", "check"],
];

const yearlyMonthly = money(PLANS.yearly.monthlyEquivalent?.THB ?? 99);

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
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            เริ่มต้นเพียง <b className="text-text">{yearlyMonthly}/เดือน</b> เมื่อสมัครรายปี
          </p>
          <div className="flex gap-2">
            <Button onClick={close}>ปิด</Button>
            <Button
              variant="primary"
              className="shadow-[0_6px_20px_-6px_var(--color-primary)]"
              onClick={() => {
                close();
                navigate("/pricing");
              }}
            >
              <IconBolt size={15} className="mr-1.5 inline align-[-2px]" />
              ปลดล็อก Jumsup Pro
            </Button>
          </div>
        </div>
      }
    >
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary to-primary-hover p-4 text-on-primary">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20">
          <IconBolt size={22} />
        </span>
        <div className="min-w-0">
          <b className="block text-[15px] leading-tight">ฝึกได้เต็มที่ ไม่มีสะดุด กับ Jumsup Pro</b>
          <p className="text-xs opacity-90">ปลดล็อกทุกทักษะ ทุกขนาดชุด ไม่ต้องรอปลดล็อกรายวัน</p>
        </div>
      </div>

      {s.message && <p className="mb-3 text-sm text-muted">{s.message}</p>}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2.5 pl-3 pr-2 font-medium">รายการ</th>
              <th className="py-2.5 pr-2 font-medium">Free</th>
              <th className="rounded-t-xl bg-primary-soft py-2.5 pr-3 text-center font-bold text-primary">
                <span className="inline-flex items-center gap-1.5">
                  Pro
                  <Tag tone="success">แนะนำ</Tag>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, free, pro], i) => (
              <tr
                key={label}
                className={i < rows.length - 1 ? "border-b border-line/70" : ""}
              >
                <td className="py-2.5 pl-3 pr-2 text-muted">{label}</td>
                <td className="py-2.5 pr-2">{free}</td>
                <td
                  className={cx(
                    "py-2.5 pr-3 text-center font-semibold text-primary",
                    "bg-primary-soft/60",
                    i === rows.length - 1 && "rounded-b-xl",
                  )}
                >
                  {pro === "check" ? (
                    <IconCheck size={16} className="mx-auto text-success" />
                  ) : (
                    pro
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
