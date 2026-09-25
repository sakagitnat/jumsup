import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store/useStore";
import { isPro } from "../../store/pro";
import { MONETIZATION_ENABLED } from "../../lib/entitlements.js";
import { loginGoogle, logout } from "../../actions/auth";
import {
  redeemGift,
  changeAvatar,
  changeUsername,
  checkUsername,
  changeDisplayName,
} from "../../actions/account";
import { displayName } from "../../store/name";
import { AccountShell } from "./AccountShell";
import { Card, Tag, Button, cx, toast } from "../../ui";

function NicknameEditor({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(current);
          setOpen(true);
        }}
        className="text-xs font-semibold text-primary hover:underline"
      >
        {current ? "แก้ไขนิกเนม" : "ตั้งนิกเนม"}
      </button>
    );
  }
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={value}
        maxLength={40}
        placeholder="ชื่อที่อยากให้คนอื่นเห็น"
        onChange={(e) => setValue(e.target.value)}
        className="rounded-xl border border-line bg-surface px-3 py-1.5 text-sm"
      />
      <Button
        size="sm"
        variant="primary"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          const res = await changeDisplayName(value);
          setSaving(false);
          if (res.ok) {
            toast("บันทึกนิกเนมแล้ว");
            setOpen(false);
          } else {
            toast(res.error || "บันทึกไม่สำเร็จ");
          }
        }}
      >
        บันทึก
      </Button>
      <Button size="sm" onClick={() => setOpen(false)}>
        ยกเลิก
      </Button>
    </div>
  );
}

function UsernameEditor({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [state, setState] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const v = value.trim();
    if (v === current) {
      setState("idle");
      return;
    }
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(v)) {
      setState("invalid");
      return;
    }
    setState("checking");
    const id = window.setTimeout(async () => {
      const free = await checkUsername(v);
      setState(free ? "ok" : "taken");
    }, 450);
    return () => window.clearTimeout(id);
  }, [value, open, current]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(current);
          setOpen(true);
        }}
        className="text-xs font-semibold text-primary hover:underline"
      >
        แก้ไขชื่อ
      </button>
    );
  }

  const hint = {
    idle: "",
    checking: "กำลังตรวจสอบ…",
    ok: "ใช้ชื่อนี้ได้",
    taken: "ชื่อนี้ถูกใช้แล้ว",
    invalid: "ใช้ a–z, 0–9, _ หรือ . ยาว 3–20 ตัว",
  }[state];

  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          value={value}
          maxLength={20}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-xl border border-line bg-surface px-3 py-1.5 text-sm"
        />
        <Button
          size="sm"
          variant="primary"
          disabled={saving || state !== "ok"}
          onClick={async () => {
            setSaving(true);
            const res = await changeUsername(value.trim());
            setSaving(false);
            if (res.ok) {
              toast("เปลี่ยนชื่อแล้ว");
              setOpen(false);
            } else {
              toast(res.error || "เปลี่ยนชื่อไม่สำเร็จ");
            }
          }}
        >
          บันทึก
        </Button>
        <Button size="sm" onClick={() => setOpen(false)}>
          ยกเลิก
        </Button>
      </div>
      {hint && (
        <p
          className={cx(
            "mt-1 text-xs",
            state === "ok" ? "text-success" : state === "checking" ? "text-subtle" : "text-danger",
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export function AccountProfile() {
  const { user, profile, subscription, xp, streak, decks } = useStore((s) => ({
    user: s.user,
    profile: s.profile,
    subscription: s.subscription,
    xp: s.xp,
    streak: s.streak,
    decks: s.decks,
  }));
  const giftRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return (
      <AccountShell title="โปรไฟล์">
        <Card className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-lg font-bold text-muted">
            G
          </span>
          <div>
            <h2 className="text-lg font-semibold">Guest</h2>
            <p className="text-sm text-muted">ข้อมูลตอนนี้อยู่บนอุปกรณ์นี้</p>
            <Button variant="primary" className="mt-3" onClick={loginGoogle}>
              สมัครฟรี
            </Button>
          </div>
        </Card>
      </AccountShell>
    );
  }

  const pro = isPro({ profile, subscription });
  const level = Math.floor((xp || 0) / 250) + 1;
  const name = displayName(profile);
  const letter = name.replace(/^@/, "").slice(0, 1).toUpperCase() || "U";

  return (
    <AccountShell title="โปรไฟล์">
      <Card className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-xl font-bold text-primary">
            {letter}
          </span>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{name}</h2>
            {MONETIZATION_ENABLED && <Tag tone={pro ? "success" : "info"}>{pro ? "PRO" : "FREE"}</Tag>}
          </div>
          {profile?.username && (
            <p className="text-sm text-subtle">@{profile.username}</p>
          )}

          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">นิกเนม</span>
              <NicknameEditor current={profile?.display_name || ""} />
            </div>
            <p className="text-xs text-subtle">ชื่อที่คนอื่นเห็น · ซ้ำกันได้ · ใส่ภาษาไทย/อีโมจิได้</p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-muted">ยูเซอร์เนม</span>
              <UsernameEditor current={profile?.username || ""} />
            </div>
            <p className="text-xs text-subtle">
              ตัวตนของคุณ (@handle) · ต้องไม่ซ้ำใคร · a–z 0–9 _ . ยาว 3–20
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => fileRef.current?.click()}>เปลี่ยนรูป</Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) changeAvatar(f);
              }}
            />
            <Button onClick={logout}>ออกจากระบบ</Button>
          </div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["XP", (xp || 0).toLocaleString()],
          ["Streak", `${streak || 0} วัน`],
          ["Decks", String(decks.length)],
          ["Level", String(level)],
        ].map(([label, value]) => (
          <Card key={label} soft className="text-center">
            <small className="text-xs text-muted">{label}</small>
            <strong className="mt-1 block text-lg">{value}</strong>
          </Card>
        ))}
      </div>

      {MONETIZATION_ENABLED && (
        <Card>
          <h3 className="text-sm font-semibold">Gift Code</h3>
          <p className="text-sm text-muted">แลกโค้ดเพื่อรับสิทธิ์ Pro</p>
          <div className="mt-3 flex gap-2">
            <input
              ref={giftRef}
              placeholder="กรอกโค้ด"
              className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
            <Button onClick={() => redeemGift(giftRef.current?.value.trim() || "")}>
              แลกโค้ด
            </Button>
          </div>
        </Card>
      )}
    </AccountShell>
  );
}
