import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, store } from "../../store/useStore";
import { PLANS, money } from "../../lib/plans.js";
import { languages } from "../../store/useT";
import { loginGoogle } from "../../actions/auth";
import { markEntered } from "../../app/entered";
import { Button } from "../../ui";

const features = [
  ["Aa", "จำศัพท์ด้วย Loop", "คำที่ยังไม่จำจะวนกลับมา และบันทึกไว้ทบทวนได้เสมอ"],
  ["R", "Reading พร้อมเครื่องมือ", "ไฮไลต์ แตะคำ แปล และเก็บคำที่ไม่รู้เข้า Flashcard"],
  ["L", "Listening ตามรูปแบบข้อสอบ", "ฟังบทสนทนา ซ่อน Transcript และตอบคำถามตามบริบท"],
  ["M", "Mock Exam คู่ขนาน", "ซ้อมเวลา ตรวจคะแนน และดูคำอธิบายหลังส่งคำตอบ"],
];

const steps = [
  ["1", "เลือกเป้าหมาย", "กำหนดทักษะและเวลาที่ต้องการฝึก"],
  ["2", "ฝึกตามแผน", "เริ่มจากชุดพร้อมเรียนและจุดอ่อนของคุณ"],
  ["3", "วัดพัฒนาการ", "ดูคะแนน คำที่จำได้ และกลับมาทบทวน"],
];

export function Landing() {
  const lang = useStore((s) => s.lang);
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const currency = lang === "th" ? "THB" : "USD";

  const enter = () => {
    markEntered();
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-lg font-bold text-on-primary">
            J
          </span>
          <strong className="text-lg">Jumsup</strong>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3">
          <a
            href="#features"
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-text sm:block"
          >
            ฟีเจอร์
          </a>
          <button
            onClick={() => navigate("/pricing")}
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-text sm:block"
          >
            ราคา
          </button>
          <select
            aria-label="ภาษาที่แสดง"
            value={lang}
            onChange={(e) => store.set({ lang: e.target.value })}
            className="rounded-lg border border-line bg-surface px-2 py-2 text-sm"
          >
            {languages.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={loginGoogle}>
            เข้าสู่ระบบ
          </Button>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.05fr_.95fr] lg:py-16">
        <div>
          <span className="inline-block rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            A-Level English Practice
          </span>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.1] sm:text-5xl">
            ฝึกอังกฤษครบทั้ง
            <br />
            <span className="text-primary">ศัพท์ ทักษะ และข้อสอบ</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            วางแผนฝึกจากจุดอ่อนของคุณ ทบทวนศัพท์ด้วย Loop และลองข้อสอบคู่ขนานที่สร้างใหม่
            โดยไม่คัดลอกข้อสอบจริง
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" variant="primary" onClick={enter}>
              เริ่มฝึกฟรี
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setRevealed(true)}
            >
              ลองตัวอย่าง
            </Button>
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted">
            <span>✓ ไม่ต้องใช้บัตร</span>
            <span>✓ มีแพ็กเกจฟรี</span>
            <span>✓ ใช้ได้บนมือถือ</span>
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-6 shadow-card">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-subtle">
            <span>Flashcard · A-Level</span>
            <span>1 / 10</span>
          </div>
          <div className="py-8 text-center">
            <small className="text-xs text-subtle">แตะเพื่อดูคำแปล</small>
            <p className="mt-2 text-3xl font-semibold">significant</p>
            <p className="text-sm text-subtle">/sɪɡˈnɪfɪkənt/</p>
            <div
              className={
                "mt-4 transition-opacity " + (revealed ? "opacity-100" : "opacity-0")
              }
            >
              <b className="text-lg">สำคัญ · มีนัยสำคัญ</b>
              <p className="text-sm text-muted">The change had a significant effect.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setRevealed(true)}
              className="rounded-xl border border-line py-2 text-sm font-semibold text-muted hover:bg-surface-2"
            >
              ยังไม่จำ
            </button>
            <button
              onClick={() => setRevealed(true)}
              className="rounded-xl border border-primary-border bg-primary-soft py-2 text-sm font-semibold text-primary"
            >
              จำได้
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 py-6 sm:grid-cols-4">
        {[
          ["4", "ทักษะหลัก"],
          ["80", "ข้อใน Mock"],
          ["5–20", "นาทีต่อวัน"],
          ["ฟรี", "เริ่มเรียนได้ทันที"],
        ].map(([n, label]) => (
          <div
            key={label}
            className="rounded-2xl border border-line bg-surface p-4 text-center"
          >
            <strong className="block text-2xl">{n}</strong>
            <span className="text-xs text-muted">{label}</span>
          </div>
        ))}
      </section>

      <section id="features" className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-wide text-primary">
            ฝึกให้ตรงจุด
          </span>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">
            หนึ่งที่สำหรับการเตรียมอังกฤษ A-Level
          </h2>
          <p className="mt-2 text-muted">
            ไม่ต้องเปิดหลายแอป และไม่ต้องสร้างชุดเองก่อนเริ่มเรียน
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map(([icon, title, desc]) => (
            <article key={title} className="rounded-2xl border border-line bg-surface p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft font-bold text-primary">
                {icon}
              </span>
              <h3 className="mt-3 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-wide text-primary">
            เริ่มง่าย
          </span>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">
            รู้ว่าต้องทำอะไรต่อในทุกวัน
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map(([n, title, desc]) => (
            <article key={n} className="rounded-2xl border border-line bg-surface p-5">
              <b className="grid h-8 w-8 place-items-center rounded-full bg-primary text-on-primary">
                {n}
              </b>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-12 sm:flex-row sm:items-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-primary">
            เริ่มต้นโดยไม่ต้องจ่าย
          </span>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">
            Free ใช้งานได้จริง
            <br />
            Pro เมื่ออยากฝึกได้มากขึ้น
          </h2>
          <p className="mt-2 text-muted">
            Pro เริ่ม {money(PLANS.monthly.prices[currency], currency)}/เดือน หรือรายปีเฉลี่ย{" "}
            {money(PLANS.yearly.monthlyEquivalent?.[currency] ?? 0, currency)}/เดือน
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" variant="primary" onClick={enter}>
            เริ่มฝึกฟรี
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate("/pricing")}>
            ดูแพ็กเกจทั้งหมด
          </Button>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-xs font-bold text-on-primary">
              J
            </span>
            <span>Jumsup — ฝึกอังกฤษให้เป็นระบบในแบบของคุณ</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <a href="/privacy/">Privacy</a>
            <a href="/terms/">Terms</a>
            <a href="/refund/">Refund</a>
            <a href="/community-guidelines/">Community</a>
            <a href="mailto:sakagitnat@gmail.com">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
