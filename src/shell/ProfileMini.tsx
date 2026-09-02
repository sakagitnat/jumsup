import { Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import { isPro } from "../store/pro";

export function ProfileMini() {
  const { user, profile, subscription } = useStore((s) => ({
    user: s.user,
    profile: s.profile,
    subscription: s.subscription,
  }));

  if (!user) {
    return (
      <Link
        to="/account"
        className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 font-bold text-muted">
          G
        </span>
        <span className="leading-tight">
          <strong className="block text-sm">Guest</strong>
          <small className="text-[11px] text-subtle">Login to sync</small>
        </span>
      </Link>
    );
  }

  const name = profile?.username || "User";
  const letter = (profile?.username || user.email || "U").slice(0, 1).toUpperCase();
  const avatar =
    typeof profile?.avatar_url === "string" && /^https:\/\//i.test(profile.avatar_url) ? (
      <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
    ) : (
      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft font-bold text-primary">
        {letter}
      </span>
    );
  const pro = isPro({ profile, subscription }) || subscription?.status === "active";

  return (
    <Link
      to="/account"
      className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2"
    >
      {avatar}
      <span className="leading-tight">
        <strong className="block text-sm">{name}</strong>
        <small className="text-[11px] text-subtle">{pro ? "Pro · " : ""}Cloud Sync</small>
      </span>
    </Link>
  );
}
