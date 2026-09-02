import { useRef } from "react";
import { useStore } from "../../store/useStore";
import { isPro } from "../../store/pro";
import { loginGoogle, logout } from "../../actions/auth";
import { redeemGift, claimReferral, changeAvatar } from "../../actions/account";
import { AccountShell } from "./AccountShell";
import { Card, Tag, Button } from "../../ui";

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
  const refRef = useRef<HTMLInputElement>(null);
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
              เข้าสู่ระบบด้วย Google
            </Button>
          </div>
        </Card>
      </AccountShell>
    );
  }

  const pro = isPro({ profile, subscription });
  const level = Math.floor((xp || 0) / 250) + 1;
  const name = profile?.username || "User";
  const letter = name.slice(0, 1).toUpperCase();

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
            <Tag tone={pro ? "success" : "info"}>{pro ? "PRO" : "FREE"}</Tag>
          </div>
          <p className="text-sm text-muted">
            ชื่อที่ผู้ใช้อื่นมองเห็น · อีเมลของคุณเป็นข้อมูลส่วนตัว
          </p>
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

      <div className="grid gap-3 sm:grid-cols-2">
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
        <Card>
          <h3 className="text-sm font-semibold">ชวนเพื่อน</h3>
          <p className="text-sm text-muted">คนชวน +14 วัน · คนถูกชวน +7 วัน</p>
          <div className="mt-3 flex gap-2">
            <input
              ref={refRef}
              placeholder="โค้ดผู้ชวน"
              className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
            <Button onClick={() => claimReferral(refRef.current?.value.trim() || "")}>
              ใช้โค้ด
            </Button>
          </div>
          {profile?.referral_code && (
            <p className="mt-3 text-sm">
              โค้ดของคุณ: <b>{profile.referral_code}</b>
            </p>
          )}
        </Card>
      </div>
    </AccountShell>
  );
}
