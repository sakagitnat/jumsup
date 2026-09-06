import { useEffect } from "react";
import { useT } from "../store/useT";
import { useStore } from "../store/useStore";
import { logout } from "../actions/auth";
import { Logo } from "../ui/Logo";
import { IconClose } from "../ui/icons";
import { navGroups, homeItem } from "./nav";
import { NavItemRow } from "./NavItemRow";
import { ProfileMini } from "./ProfileMini";
import { ThemeToggle } from "./ThemeToggle";

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const user = useStore((s) => s.user);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-line bg-surface px-3 py-5 shadow-xl">
        <div className="flex items-center justify-between gap-2 px-2 pb-4">
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <strong className="text-[15px]">Jumsup</strong>
          </div>
          <button
            type="button"
            aria-label="ปิดเมนู"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted"
          >
            <IconClose size={16} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <NavItemRow
            to={homeItem.to}
            label={t(homeItem.key)}
            icon={homeItem.icon}
            onNavigate={onClose}
          />
          {navGroups.map((group) => (
            <div key={group.label} className="mt-4">
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">
                {t(group.label)}
              </p>
              {group.items.map((item) => (
                <NavItemRow
                  key={item.to}
                  to={item.to}
                  label={t(item.key)}
                  icon={item.icon}
                  onNavigate={onClose}
                />
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
    </div>
  );
}
