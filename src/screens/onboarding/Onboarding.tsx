import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { saveOnboarding } from "../../actions/onboarding";
import { Button, cx, toast } from "../../ui";

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/** วัน / เดือน / ปี dropdowns. Native <input type="date"> renders in the
 *  browser locale (mm/dd/yyyy here), which trips up day-first input — three
 *  selects with Thai month names remove the ambiguity. Emits ISO yyyy-mm-dd
 *  once all three are chosen, "" otherwise, while keeping each partial pick
 *  visible. */
function ExamDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const init = value ? value.split("-").map(Number) : [0, 0, 0];
  const [y, setY] = useState(init[0] || 0);
  const [m, setM] = useState(init[1] || 0);
  const [d, setD] = useState(init[2] || 0);

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => thisYear + i);
  const daysInMonth = m && y ? new Date(y, m, 0).getDate() : 31;

  const apply = (ny: number, nm: number, nd: number) => {
    const maxDay = nm && ny ? new Date(ny, nm, 0).getDate() : 31;
    const day = nd > maxDay ? maxDay : nd;
    setY(ny);
    setM(nm);
    setD(day);
    onChange(
      ny && nm && day
        ? `${ny}-${String(nm).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        : "",
    );
  };

  const sel = "rounded-xl border border-line bg-surface px-2 py-2 text-sm";
  return (
    <div className="mt-1 grid grid-cols-3 gap-2">
      <select className={sel} value={d || ""} onChange={(e) => apply(y, m, Number(e.target.value))}>
        <option value="">วัน</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <select className={sel} value={m || ""} onChange={(e) => apply(y, Number(e.target.value), d)}>
        <option value="">เดือน</option>
        {THAI_MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select className={sel} value={y || ""} onChange={(e) => apply(Number(e.target.value), m, d)}>
        <option value="">ปี พ.ศ.</option>
        {years.map((yr) => (
          <option key={yr} value={yr}>
            {yr + 543}
          </option>
        ))}
      </select>
    </div>
  );
}

const goals: Array<[string, string, string]> = [
  ["alevel", "A-Level English", "เตรียมสอบเข้ามหาวิทยาลัย"],
  ["tgat", "TGAT 1", "เน้นการสื่อสารภาษาอังกฤษ"],
  ["general", "อังกฤษทั่วไป", "พัฒนาทักษะเพื่อใช้งานจริง"],
];
const skillOpts: Array<[string, string]> = [
  ["vocabulary", "คำศัพท์"],
  ["reading", "Reading"],
  ["listening", "Listening"],
  ["writing", "Writing"],
];

export function Onboarding() {
  const navigate = useNavigate();
  const profile = useStore((s) => s.profile);
  const [goal, setGoal] = useState(profile?.exam_goal || "alevel");
  const [minutes, setMinutes] = useState(Number(profile?.daily_minutes || 10));
  const [skills, setSkills] = useState<string[]>(
    profile?.weak_skills?.length ? profile.weak_skills : ["vocabulary"],
  );
  const [examDate, setExamDate] = useState(profile?.exam_date || "");
  const [saving, setSaving] = useState(false);
  const editing = Boolean(profile?.onboarding_completed_at);
  const today = localToday();

  const examDateLabel =
    examDate && !Number.isNaN(new Date(`${examDate}T00:00:00`).getTime())
      ? new Date(`${examDate}T00:00:00`).toLocaleDateString("th-TH", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";
  const examDatePast = Boolean(examDate) && examDate < today;

  const toggleSkill = (id: string) =>
    setSkills((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (examDatePast) {
      toast("วันที่สอบต้องเป็นวันนี้หรือหลังจากนี้");
      return;
    }
    setSaving(true);
    const ok = await saveOnboarding({ goal, minutes, skills, examDate: examDate || null });
    setSaving(false);
    if (ok) navigate("/home");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-on-primary">
            J
          </span>
          <strong>Jumsup</strong>
        </div>
        <span className="text-xs font-bold uppercase tracking-wide text-primary">
          {editing ? "แก้ไขแผนการเรียน" : "ตั้งค่าแผนการเรียน"}
        </span>
        <h1 className="mt-1 text-xl font-semibold">ให้ Jumsup รู้จักเป้าหมายของคุณ</h1>
        <p className="mt-1 text-sm text-muted">
          ใช้เวลาไม่ถึง 1 นาที และเปลี่ยนได้ภายหลังในหน้าบัญชี
        </p>
        {editing && (
          <Link
            to="/account"
            className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
          >
            ← กลับไปหน้าบัญชี
          </Link>
        )}

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold">คุณกำลังเรียนเพื่ออะไร?</legend>
          <div className="mt-2 space-y-2">
            {goals.map(([id, title, desc]) => (
              <label
                key={id}
                className={cx(
                  "flex cursor-pointer items-start gap-2 rounded-xl border p-3",
                  goal === id ? "border-primary-border bg-primary-soft" : "border-line",
                )}
              >
                <input
                  type="radio"
                  name="goal"
                  checked={goal === id}
                  onChange={() => setGoal(id)}
                  className="mt-1"
                />
                <span>
                  <b className="block text-sm">{title}</b>
                  <small className="text-xs text-muted">{desc}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold">อยากฝึกวันละกี่นาที?</legend>
          <div className="mt-2 flex gap-2">
            {[5, 10, 20].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMinutes(n)}
                className={cx(
                  "flex-1 rounded-xl border py-3 text-center",
                  minutes === n ? "border-primary-border bg-primary-soft" : "border-line",
                )}
              >
                <b className="block">{n}</b>
                <small className="text-xs text-muted">นาที</small>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold">ตอนนี้อยากพัฒนาส่วนไหน?</legend>
          <p className="text-xs text-subtle">เลือกได้มากกว่า 1 อย่าง</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {skillOpts.map(([id, label]) => (
              <label
                key={id}
                className={cx(
                  "flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm",
                  skills.includes(id) ? "border-primary-border bg-primary-soft" : "border-line",
                )}
              >
                <input
                  type="checkbox"
                  checked={skills.includes(id)}
                  onChange={() => toggleSkill(id)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5">
          <span className="block text-sm font-semibold">
            วันที่สอบ <small className="font-normal text-subtle">(ไม่บังคับ)</small>
          </span>
          <ExamDatePicker value={examDate} onChange={setExamDate} />
          {examDateLabel && (
            <span
              className={cx(
                "mt-1 block text-xs font-normal",
                examDatePast ? "text-danger" : "text-subtle",
              )}
            >
              {examDatePast
                ? `${examDateLabel} — เป็นวันที่ผ่านมาแล้ว เลือกวันในอนาคต`
                : `= ${examDateLabel}`}
            </span>
          )}
        </div>

        <Button
          variant="primary"
          block
          className="mt-6"
          disabled={saving || skills.length === 0 || examDatePast}
          onClick={submit}
        >
          {saving ? "กำลังบันทึก…" : editing ? "บันทึกแผน" : "สร้างแผนของฉัน"}
        </Button>
      </div>
    </div>
  );
}
