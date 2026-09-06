import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { cx } from "../ui/cx";

export function NavItemRow({
  to,
  label,
  icon,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cx(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
          isActive
            ? "bg-primary-soft text-primary"
            : "text-muted hover:bg-surface-2 hover:text-text",
        )
      }
    >
      <span className="shrink-0">{icon}</span>
      {label}
    </NavLink>
  );
}
