import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { saveOnboarding } from "../../actions/onboarding";
import { Button, cx, toast, Logo } from "../../ui";

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
const THAI_DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Click-a-day calendar. Fully hand-rolled (CSP blocks CDN libraries) so the
 *  layout, month/weekday names and ordering are the same on every device —
 *  unlike a native <input type="date">, whose text order follows the OS locale.
 *  Value is ISO yyyy-mm-dd or "". Past days can't be picked. */
function ExamCalendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selected = value ? value.split("-").map(Number) : null;

  const [open, setOpen] = useState(false);
  const [viewY, setViewY] = useState(selected ? selected[0] : now.getFullYear());
  const [viewM, setViewM] = useState(selected ? selected[1] - 1 : now.getMonth());

  const atMonthStart = viewY === now.getFullYear() && viewM === now.getMonth();
  const step = (delta: number) => {
    const next = new Date(viewY, viewM + delta, 1);
    setViewY(next.getFullYear());
    setViewM(next.getMonth());
  };

  const firstDow = new Date(viewY, viewM, 1).getDay();
  const daysInView = new Date(viewY, viewM + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInView }, (_, i) => i + 1),
  ];

  const label = selected
    ? new Date(`${value}T00:00:00`).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-3 py-2 text-sm"
      >
        <span className={selected ? "" : "text-subtle"}>{label || "ตั้งวันสอบ (แตะเพื่อเลือก)"}</span>
        <span className="flex items-center gap-2">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              aria-label="ล้างวันที่"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-subtle hover:text-danger"
            >
              ✕
            </span>
          )}
          <span aria-hidden className="text-subtle">
            📅
          </span>
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-line bg-surface p-3 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              disabled={atMonthStart}
              onClick={() => step(-1)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted enabled:hover:bg-surface-2 disabled:opacity-30"
            >
              ‹
            </button>
            <b className="text-sm">
              {THAI_MONTHS[viewM]} {viewY + 543}
            </b>
            <button
              type="button"
              onClick={() => step(1)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-subtle">
            {THAI_DOW.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <span key={`x${i}`} />;
              const cellDate = new Date(viewY, viewM, day);
              const past = cellDate < todayMid;
              const isSel =
                selected &&
                selected[0] === viewY &&
                selected[1] - 1 === viewM &&
                selected[2] === day;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={past}
                  onClick={() => {
                    onChange(iso(viewY, viewM, day));
                    setOpen(false);
                  }}
                  className={cx(
                    "h-9 rounded-lg text-sm",
                    isSel && "bg-primary font-semibold text-on-primary",
                    !isSel && !past && "hover:bg-primary-soft",
                    past && "text-subtle opacity-40",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const EXAM_PRESETS = [
  "A-Level (TCAS)",
  "TGAT1",
  "TGAT2",
  "TGAT3",
  "IELTS",
  "TOEFL",
  "TOEIC",
  "SAT",
  "GED",
  "CU-TEP",
  "TU-GET",
  "Duolingo (DET)",
  "O-NET",
  "ก.พ. ภาค ก",
];

interface ExamTargetDraft {
  name: string;
  date: string | null;
}

const skillOpts: Array<[string, string]> = [
  ["vocabulary", "คำศัพท์"],
  ["reading", "Reading"],
  ["listening", "Listening"],
  ["writing", "Writing"],
];

export function Onboarding() {
  const navigate = useNavigate();
  const profile = useStore((s) => s.profile);
  const storedTargets = useStore((s) => s.examTargets);
  const [minutes, setMinutes] = useState(Number(profile?.daily_minutes || 10));
  const [skills, setSkills] = useState<string[]>(
    profile?.weak_skills?.length ? profile.weak_skills : ["vocabulary"],
  );
  const [targets, setTargets] = useState<ExamTargetDraft[]>(() =>
    storedTargets.map((t) => ({ name: t.name, date: t.date })),
  );
  const [customName, setCustomName] = useState("");
  const [saving, setSaving] = useState(false);
  const editing = Boolean(profile?.onboarding_completed_at);
  const today = localToday();

  const addTarget = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || targets.some((t) => t.name === trimmed)) return;
    setTargets((prev) => [...prev, { name: trimmed, date: null }]);
  };
  const removeTarget = (i: number) => setTargets((prev) => prev.filter((_, idx) => idx !== i));
  const setTargetDate = (i: number, date: string) =>
    setTargets((prev) => prev.map((t, idx) => (idx === i ? { ...t, date: date || null } : t)));

  const hasPastDate = targets.some((t) => t.date && t.date < today);

  const toggleSkill = (id: string) =>
    setSkills((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (hasPastDate) {
      toast("มีวันสอบที่เป็นวันที่ผ่านมาแล้ว");
      return;
    }
    setSaving(true);
    const ok = await saveOnboarding({ minutes, skills, examTargets: targets });
    setSaving(false);
    if (ok) navigate("/home");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Logo size={32} />
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
          <legend className="text-sm font-semibold">คุณกำลังเตรียมสอบอะไรบ้าง?</legend>
          <p className="text-xs text-subtle">
            เพิ่มได้หลายรายการ กำหนดวันสอบของแต่ละอันแยกกัน (ไม่บังคับ)
          </p>

          {targets.length > 0 && (
            <div className="mt-2 space-y-2">
              {targets.map((t, i) => {
                const past = Boolean(t.date) && t.date! < today;
                return (
                  <div
                    key={t.name}
                    className={cx(
                      "rounded-xl border p-3",
                      past ? "border-danger" : "border-line",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <b className="min-w-0 flex-1 truncate text-sm">{t.name}</b>
                      <button
                        type="button"
                        aria-label={`ลบ ${t.name}`}
                        onClick={() => removeTarget(i)}
                        className="shrink-0 text-subtle hover:text-danger"
                      >
                        ✕
                      </button>
                    </div>
                    <ExamCalendar
                      value={t.date ?? ""}
                      onChange={(iso) => setTargetDate(i, iso)}
                    />
                    {past && (
                      <span className="mt-1 block text-xs text-danger">
                        วันที่ผ่านมาแล้ว เลือกวันในอนาคต
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {EXAM_PRESETS.filter((p) => !targets.some((t) => t.name === p)).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => addTarget(p)}
                className="rounded-full border border-line px-3 py-1.5 text-xs hover:border-primary-border hover:bg-primary-soft"
              >
                + {p}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTarget(customName);
                  setCustomName("");
                }
              }}
              placeholder="พิมพ์ชื่อการสอบเอง"
              className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm"
            />
            <Button
              onClick={() => {
                addTarget(customName);
                setCustomName("");
              }}
              disabled={!customName.trim()}
            >
              เพิ่ม
            </Button>
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

        <Button
          variant="primary"
          block
          className="mt-6"
          disabled={saving || skills.length === 0 || hasPastDate}
          onClick={submit}
        >
          {saving ? "กำลังบันทึก…" : editing ? "บันทึกแผน" : "สร้างแผนของฉัน"}
        </Button>
      </div>
    </div>
  );
}
