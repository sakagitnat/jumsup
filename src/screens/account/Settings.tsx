import { useEffect, useState } from "react";
import { useStore, store } from "../../store/useStore";
import { languages } from "../../store/useT";
import { scheduleSync } from "../../app/cloudSync";
import { pushSupported, getPushEnabled, enablePush, disablePush } from "../../lib/push";
import { toast } from "../../ui/toast";
import { Card, Switch, cx } from "../../ui";

function NotificationsCard() {
  const user = useStore((s) => s.user);
  const [supported] = useState(pushSupported);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushEnabled().then(setOn);
  }, []);

  const toggle = async (v: boolean) => {
    setBusy(true);
    try {
      if (v) {
        await enablePush();
        setOn(true);
        toast("เปิดการแจ้งเตือนแล้ว");
      } else {
        await disablePush();
        setOn(false);
      }
    } catch (e) {
      toast((e as Error).message || "ตั้งค่าการแจ้งเตือนไม่สำเร็จ");
      setOn(await getPushEnabled());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 className="text-base font-semibold">การแจ้งเตือน</h2>
      <p className="text-sm text-muted">
        เตือนก่อน Streak หลุด และแจ้งเมื่อสรุปอันดับรายสัปดาห์พร้อม
      </p>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <b className="block text-sm">แจ้งเตือนบนอุปกรณ์นี้</b>
          <small className="text-xs text-muted">
            {!user
              ? "เข้าสู่ระบบก่อนจึงจะเปิดได้"
              : !supported
                ? "เบราว์เซอร์นี้ไม่รองรับ"
                : on
                  ? "เปิดอยู่"
                  : "ปิดอยู่"}
          </small>
        </div>
        <Switch
          checked={on}
          label="แจ้งเตือน"
          onChange={toggle}
          disabled={busy || !supported || !user}
        />
      </div>
    </Card>
  );
}

export function Settings() {
  const { lang, theme, sound } = useStore((s) => ({
    lang: s.lang,
    theme: s.theme,
    sound: s.sound,
  }));

  return (
    <div className="space-y-4">
      <NotificationsCard />
      <Card>
        <h2 className="text-base font-semibold">ภาษา</h2>
        <p className="text-sm text-muted">เลือกภาษาของส่วนติดต่อผู้ใช้</p>
        <label className="mt-3 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">ภาษาที่แสดง</span>
          <select
            value={lang}
            onChange={(e) => {
              store.set({ lang: e.target.value });
              scheduleSync();
            }}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          >
            {languages.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-subtle">
          สกุลเงินกำหนดอัตโนมัติ: ภาษาไทยใช้ THB และภาษาอื่นใช้ USD
        </p>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">ธีม</h2>
        <p className="text-sm text-muted">เลือกโหมดที่สบายตา</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["light", "สว่าง", "Warm light appearance"],
              ["dark", "มืด", "Soft charcoal appearance"],
            ] as const
          ).map(([value, label, desc]) => (
            <button
              key={value}
              type="button"
              onClick={() => store.set({ theme: value })}
              className={cx(
                "rounded-xl border p-3 text-left transition-colors",
                theme === value
                  ? "border-primary-border bg-primary-soft"
                  : "border-line hover:bg-surface-2",
              )}
            >
              <b className="block text-sm">{label}</b>
              <small className="text-xs text-muted">{desc}</small>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">เสียง</h2>
        <p className="text-sm text-muted">เปิดหรือปิดเสียงตอบสนอง</p>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <b className="block text-sm">เสียงเอฟเฟกต์</b>
            <small className="text-xs text-muted">{sound ? "ON" : "OFF"}</small>
          </div>
          <Switch
            checked={sound}
            label="เสียงเอฟเฟกต์"
            onChange={(v) => store.set({ sound: v })}
          />
        </div>
      </Card>
    </div>
  );
}
