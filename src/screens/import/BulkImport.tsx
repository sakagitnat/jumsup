import { useState } from "react";
import { store } from "../../store/useStore";
import { isPro } from "../../store/pro";
import { PRO_LIMITS } from "../../lib/plans.js";
import { scheduleSync } from "../../app/cloudSync";
import {
  TYPES,
  parseCsv,
  validateImport,
  downloadTemplate,
  buildImportedContent,
  type ValidationResult,
} from "../../lib/bulkImport";
import { Modal, Button, cx, toast } from "../../ui";

type ImportKind = keyof typeof TYPES;
const steps = ["เลือกไฟล์", "จับคู่คอลัมน์", "ตรวจข้อมูล", "ยืนยัน"];

export function BulkImport({
  kind,
  onClose,
  onDone,
}: {
  kind: ImportKind;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = TYPES[kind];
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<ValidationResult | null>(null);
  const [error, setError] = useState("");

  const rowLimit = isPro(store.get()) ? PRO_LIMITS.importRows ?? 1000 : 100;

  const readFile = async (file: File) => {
    setError("");
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("ตอนนี้รองรับ CSV เท่านั้น กรุณาดาวน์โหลดเทมเพลต CSV");
      return;
    }
    try {
      const parsed = parseCsv(await file.text());
      if (!parsed.headers.length || !parsed.rows.length) throw new Error("ไฟล์ไม่มีข้อมูล");
      if (parsed.rows.length > rowLimit)
        throw new Error(`แพ็กเกจปัจจุบันนำเข้าได้สูงสุด ${rowLimit.toLocaleString()} แถวต่อครั้ง`);
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      const auto: Record<string, string> = {};
      for (const h of t.headers) {
        const match = parsed.headers.find((x) => x.toLowerCase() === h);
        if (match) auto[h] = match;
      }
      setMapping(auto);
      setStep(2);
    } catch (e) {
      setError((e as Error).message || "อ่านไฟล์ไม่สำเร็จ");
    }
  };

  const next = () => {
    if (step === 2) {
      const missing = t.required.filter((h) => !mapping[h]);
      if (missing.length) return toast(`กรุณาจับคู่คอลัมน์ที่จำเป็น: ${missing.join(", ")}`);
      setChecked(validateImport(kind, rows, mapping));
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!checked?.valid.length) return toast("ยังไม่มีรายการที่พร้อมนำเข้า");
      setStep(4);
      return;
    }
    if (step === 4) {
      const built = buildImportedContent(
        kind,
        checked!.valid,
        store.get().profile?.username || "guest",
      );
      store.update((s) => {
        const list = (s as unknown as Record<string, unknown[]>)[built.key] || [];
        return { ...s, [built.key]: [...list, built.value] };
      });
      scheduleSync();
      toast("นำเข้าเป็นฉบับร่างส่วนตัวเรียบร้อยแล้ว");
      onDone();
      onClose();
    }
  };

  const readyCount = checked?.valid.length ?? 0;
  const errorCount = checked?.errors.length ?? 0;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="นำเข้าข้อมูลจำนวนมาก"
      footer={
        <>
          <Button onClick={onClose}>ยกเลิก</Button>
          {step > 1 && <Button onClick={() => setStep((s) => Math.max(1, s - 1))}>ย้อนกลับ</Button>}
          {step > 1 && (
            <Button variant="primary" onClick={next}>
              {step === 2 ? "ตรวจข้อมูล" : step === 3 ? "ไปขั้นยืนยัน" : "ยืนยันนำเข้า"}
            </Button>
          )}
        </>
      }
    >
      <div className="mb-4 flex gap-2 text-xs">
        {steps.map((label, i) => (
          <div
            key={label}
            className={cx(
              "flex items-center gap-1 rounded-full px-2 py-1",
              i + 1 === step
                ? "bg-primary-soft text-primary"
                : i + 1 < step
                  ? "text-success"
                  : "text-subtle",
            )}
          >
            <span className="font-bold">{i + 1}</span>
            {label}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <h3 className="text-sm font-semibold">นำเข้า {t.label}</h3>
          <p className="text-sm text-muted">ใช้ไฟล์ CSV UTF-8 ที่มีชื่อคอลัมน์ตามแม่แบบ</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">ยังไม่มีไฟล์ตามรูปแบบ?</span>
            <Button size="sm" onClick={() => downloadTemplate(kind)}>
              ดาวน์โหลดเทมเพลต CSV
            </Button>
          </div>
          <label className="mt-3 flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-line bg-surface-2 p-6 text-center text-sm">
            <strong>เลือกไฟล์ CSV</strong>
            <span className="text-muted">ระบบจะแสดงตัวอย่างให้ตรวจ และยังไม่บันทึกทันที</span>
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readFile(f);
              }}
            />
          </label>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 className="text-sm font-semibold">จับคู่คอลัมน์</h3>
          <p className="text-sm text-muted">
            {fileName} · พบ {rows.length} แถว
          </p>
          <div className="mt-3 space-y-2">
            {t.headers.map((h) => (
              <label key={h} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {h}
                  {t.required.includes(h) ? " *" : ""}
                </span>
                <select
                  value={mapping[h] || ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                  className="rounded-lg border border-line bg-surface px-3 py-2"
                >
                  <option value="">ไม่ต้องนำเข้า</option>
                  {headers.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 3 && checked && (
        <div>
          <h3 className="text-sm font-semibold">ตรวจข้อมูลก่อนนำเข้า</h3>
          <div className="mt-2 flex gap-4 text-sm">
            <span>
              ทั้งหมด <b>{readyCount + errorCount}</b>
            </span>
            <span className="text-success">
              พร้อมนำเข้า <b>{readyCount}</b>
            </span>
            <span className="text-danger">
              ต้องแก้ <b>{errorCount}</b>
            </span>
          </div>
          {errorCount > 0 && (
            <div className="mt-3 max-h-60 overflow-auto rounded-xl border border-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2">
                  <tr>
                    <th className="px-3 py-2">แถว</th>
                    <th className="px-3 py-2">รายการ</th>
                    <th className="px-3 py-2">ปัญหา</th>
                  </tr>
                </thead>
                <tbody>
                  {checked.errors.slice(0, 50).map((x, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-3 py-2">{x.row}</td>
                      <td className="px-3 py-2">{x.name || "—"}</td>
                      <td className="px-3 py-2 text-danger">{x.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {errorCount > 0 && (
            <p className="mt-2 text-xs text-muted">
              รายการที่มีปัญหาจะไม่ถูกนำเข้า คุณสามารถแก้ไฟล์แล้วเลือกใหม่ หรือดำเนินการเฉพาะรายการที่พร้อมได้
            </p>
          )}
        </div>
      )}

      {step === 4 && (
        <div>
          <h3 className="text-sm font-semibold">พร้อมสร้างฉบับร่าง</h3>
          <p className="text-sm text-muted">
            {readyCount} รายการจะถูกเพิ่มเป็น{t.label}ส่วนตัว คุณยังตรวจและแก้ไขได้ก่อนเผยแพร่
          </p>
        </div>
      )}
    </Modal>
  );
}
