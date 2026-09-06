import { useT } from "../store/useT";
import { useStore } from "../store/useStore";
import { logout } from "../actions/auth";
import { Logo } from "../ui/Logo";
import { navGroups, homeItem } from "./nav";
import { NavItemRow as Item } from "./NavItemRow";
import { ProfileMini } from "./ProfileMini";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar() {
  const t = useT();
  const user = useStore((s) => s.user);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface px-3 py-5 lg:flex">
      <div className="flex items-center gap-2.5 px-2 pb-4">
        <Logo size={36} />
        <div className="leading-tight">
          <strong className="block text-[15px]">Jumsup</strong>
          <small className="text-[11px] text-subtle">English Practice</small>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        <Item to={homeItem.to} label={t(homeItem.key)} icon={homeItem.icon} />
        {navGroups.map((group) => (
          <div key={group.label} className="mt-4">
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">
              {t(group.label)}
            </p>
            {group.items.map((item) => (
              <Item key={item.to} to={item.to} label={t(item.key)} icon={item.icon} />
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
        <div className="min-w-0 flex-1">
          <ProfileMini />
        </div>
        {user && (
          <button
            type="button"
            aria-label="ออกจากระบบ"
            title="ออกจากระบบ"
            onClick={logout}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:bg-danger-soft hover:text-danger"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        )}
        <ThemeToggle />
      </div>
    </aside>
  );
}
