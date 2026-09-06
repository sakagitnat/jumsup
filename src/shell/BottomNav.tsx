import { NavLink } from "react-router-dom";
import { useT } from "../store/useT";
import { cx } from "../ui/cx";
import { bottomNavItems } from "./nav";

export function BottomNav() {
  const t = useT();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      {bottomNavItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cx(
              "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold",
              isActive ? "text-primary" : "text-muted",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cx(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors",
                  isActive && "bg-primary-soft",
                )}
              >
                {item.icon}
              </span>
              <span className="leading-tight">{t(item.key)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
